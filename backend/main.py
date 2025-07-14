from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import ephem
from datetime import datetime, timedelta
from geopy.distance import geodesic
import math
from typing import List, Dict, Optional
import json
import os
import httpx
import re

app = FastAPI(title="Dark Sky Zone Finder API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class LocationInput(BaseModel):
    latitude: float
    longitude: float
    name: Optional[str] = None

class DarkSkyZone(BaseModel):
    name: str
    latitude: float
    longitude: float
    bortle_scale: int
    designation_type: Optional[str] = "Undesignated"
    distance_miles: float
    description: str

class AstronomicalConditions(BaseModel):
    moon_phase: str
    moon_illumination: float
    moon_rise_time: Optional[str]
    moon_set_time: Optional[str]
    best_viewing_start: str
    best_viewing_end: str
    visibility_score: float
    conditions_description: str
    bortle_scale: int
    bortle_scale_estimated: bool
    bortle_scale_source: str

class StargazingRecommendation(BaseModel):
    date: str
    conditions: AstronomicalConditions
    dark_sky_zones: List[DarkSkyZone]

# Load dark sky zones from JSON file
def load_dark_sky_zones():
    """Load dark sky zones from JSON file."""
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        json_path = os.path.join(current_dir, "dark_sky_zones.json")
        with open(json_path, 'r', encoding='utf-8') as file:
            return json.load(file)
    except FileNotFoundError:
        # Fallback to empty list if file not found
        print("Warning: dark_sky_zones.json not found, using empty list")
        return []
    except json.JSONDecodeError as e:
        print(f"Error parsing dark_sky_zones.json: {e}")
        return []

DARK_SKY_ZONES = load_dark_sky_zones()

async def get_bortle_scale_from_location(latitude: float, longitude: float) -> tuple[int, bool]:
    """
    Fetch real-time Bortle scale from Clear Outside API.
    Returns tuple of (bortle_scale, is_estimated) where:
    - bortle_scale: 1-9 scale value
    - is_estimated: True if estimated fallback was used, False if from API
    """
    try:
        url = f"https://clearoutside.com/forecast/{latitude:.2f}/{longitude:.2f}"
        print(f"Fetching Bortle scale from: {url}")
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            
            # Parse the HTML to extract Bortle class
            html_content = response.text
            
            # Look for the Bortle class in the HTML
            # Pattern: <strong>Class X</strong> where X is the Bortle class
            bortle_match = re.search(r'<strong>Class\s+(\d+)</strong>', html_content)
            
            if bortle_match:
                bortle_class = int(bortle_match.group(1))
                print(f"Found Bortle class: {bortle_class}")
                # Clear Outside sometimes returns values > 9, so cap at 9
                return min(bortle_class, 9), False  # False = not estimated
            else:
                # Fallback: look for alternative patterns
                # Pattern: Bortle. &nbsp;<strong>XX.XX</strong>
                bortle_match2 = re.search(r'Bortle\.\s*&nbsp;<strong>([\d.]+)</strong>', html_content)
                if bortle_match2:
                    bortle_value = float(bortle_match2.group(1))
                    print(f"Found Bortle value: {bortle_value}")
                    # Convert to integer Bortle scale (1-9)
                    return min(max(1, int(round(bortle_value))), 9), False  # False = not estimated
                
                # Debug: Look for any mention of Bortle or Class
                print("Searching for any Bortle/Class mentions in HTML...")
                bortle_mentions = re.findall(r'[Bb]ortle[^<]*', html_content)
                class_mentions = re.findall(r'[Cc]lass[^<]*', html_content)
                print(f"Bortle mentions: {bortle_mentions[:3]}")  # First 3 matches
                print(f"Class mentions: {class_mentions[:3]}")   # First 3 matches
                
                # If no match found, fall back to intelligent estimation
                print(f"Warning: Could not parse Bortle scale from Clear Outside for {latitude}, {longitude}")
                estimated_scale = estimate_bortle_scale_fallback(latitude, longitude)
                return estimated_scale, True  # True = estimated
                
    except httpx.TimeoutException:
        print(f"Timeout fetching Bortle scale for {latitude}, {longitude}")
        estimated_scale = estimate_bortle_scale_fallback(latitude, longitude)
        return estimated_scale, True  # True = estimated
    except httpx.HTTPError as e:
        print(f"HTTP error fetching Bortle scale: {e}")
        estimated_scale = estimate_bortle_scale_fallback(latitude, longitude)
        return estimated_scale, True  # True = estimated
    except Exception as e:
        print(f"Error fetching Bortle scale from Clear Outside: {e}")
        estimated_scale = estimate_bortle_scale_fallback(latitude, longitude)
        return estimated_scale, True  # True = estimated

def estimate_bortle_scale_fallback(latitude: float, longitude: float) -> int:
    """
    Estimate Bortle scale based on location when API is unavailable.
    Uses proximity to known cities and population density heuristics.
    """
    from geopy.distance import geodesic
    
    # Major cities with known high light pollution (Bortle 8-9)
    major_cities = [
        # US Cities
        (40.7128, -74.0060),  # New York City
        (34.0522, -118.2437), # Los Angeles
        (41.8781, -87.6298),  # Chicago
        (29.7604, -95.3698),  # Houston
        (33.4484, -112.0740), # Phoenix
        (39.7392, -104.9903), # Denver
        (37.7749, -122.4194), # San Francisco
        (47.6062, -122.3321), # Seattle
        (25.7617, -80.1918),  # Miami
        (42.3601, -71.0589),  # Boston
        # International Cities
        (51.5074, -0.1278),   # London
        (48.8566, 2.3522),    # Paris
        (35.6762, 139.6503),  # Tokyo
        (55.7558, 37.6176),   # Moscow
    ]
    
    user_location = (latitude, longitude)
    
    # Check distance to major cities
    min_city_distance = float('inf')
    for city_lat, city_lon in major_cities:
        city_location = (city_lat, city_lon)
        distance = geodesic(user_location, city_location).kilometers
        min_city_distance = min(min_city_distance, distance)
    
    # Estimate based on distance to major cities
    if min_city_distance < 10:  # Within 10km of major city
        estimated = 8  # City sky
    elif min_city_distance < 50:  # Within 50km
        estimated = 6  # Bright suburban sky
    elif min_city_distance < 100:  # Within 100km
        estimated = 4  # Rural/suburban transition
    elif min_city_distance < 200:  # Within 200km
        estimated = 3  # Rural sky
    else:  # Far from cities
        estimated = 2  # Typical truly dark site
    
    print(f"Estimated Bortle scale for {latitude}, {longitude}: {estimated} (nearest city: {min_city_distance:.1f}km)")
    return estimated

def calculate_moon_phase_and_illumination(date: datetime) -> tuple:
    """Calculate moon phase and illumination percentage for a given date."""
    observer = ephem.Observer()
    observer.date = date
    
    moon = ephem.Moon()
    moon.compute(observer)
    
    illumination = moon.moon_phase * 100
    
    if illumination < 1:
        phase = "New Moon"
    elif illumination < 25:
        phase = "Waxing Crescent"
    elif illumination < 50:
        phase = "First Quarter"
    elif illumination < 75:
        phase = "Waxing Gibbous"
    elif illumination < 99:
        phase = "Waning Gibbous"
    elif illumination < 100:
        phase = "Last Quarter"
    else:
        phase = "Full Moon"
    
    return phase, illumination

def calculate_moon_times(latitude: float, longitude: float, date: datetime) -> tuple:
    """Calculate moon rise and set times for a given location and date."""
    observer = ephem.Observer()
    observer.lat = str(latitude)
    observer.lon = str(longitude)
    observer.date = date
    
    moon = ephem.Moon()
    
    try:
        moon_rise = observer.next_rising(moon)
        moon_rise_str = moon_rise.datetime().strftime('%H:%M')
    except ephem.AlwaysUpError:
        moon_rise_str = None
    except ephem.NeverUpError:
        moon_rise_str = None
    
    try:
        moon_set = observer.next_setting(moon)
        moon_set_str = moon_set.datetime().strftime('%H:%M')
    except ephem.AlwaysUpError:
        moon_set_str = None
    except ephem.NeverUpError:
        moon_set_str = None
    
    return moon_rise_str, moon_set_str

def calculate_best_viewing_times(moon_set_time: str, moon_rise_time: str) -> tuple:
    """Calculate the best viewing window based on moon times."""
    if moon_set_time is None and moon_rise_time is None:
        # Moon is never up or always up
        return "20:00", "05:00"
    
    if moon_set_time and not moon_rise_time:
        # Moon sets but doesn't rise again
        best_start = moon_set_time
        best_end = "05:00"
    elif moon_rise_time and not moon_set_time:
        # Moon rises but doesn't set
        best_start = "20:00"
        best_end = moon_rise_time
    else:
        # Both times available
        moon_set_hour = int(moon_set_time.split(':')[0])
        moon_rise_hour = int(moon_rise_time.split(':')[0])
        
        if moon_set_hour <= 6:  # Moon sets early morning
            best_start = moon_set_time
            best_end = "05:00"
        elif moon_rise_hour >= 22:  # Moon rises late
            best_start = "20:00"
            best_end = moon_rise_time
        else:
            best_start = "20:00"
            best_end = "05:00"
    
    return best_start, best_end

def calculate_visibility_score(moon_illumination: float, bortle_scale: int) -> float:
    """Calculate a visibility score based on moon illumination and light pollution."""
    bortle_score = (9 - bortle_scale) / 8.0
    moon_score = (100 - moon_illumination) / 100.0
    visibility_score = (bortle_score * 0.6) + (moon_score * 0.4)
    
    return round(visibility_score * 100, 1)

def get_conditions_description(moon_illumination: float, visibility_score: float) -> str:
    """Generate a human-readable description of viewing conditions."""
    if visibility_score >= 80:
        return "Excellent conditions - Perfect for deep-sky observations and astrophotography"
    elif visibility_score >= 60:
        return "Good conditions - Suitable for most astronomical observations"
    elif visibility_score >= 40:
        return "Fair conditions - Basic stargazing possible, limited deep-sky viewing"
    else:
        return "Poor conditions - Only bright objects visible"

@app.get("/")
async def root():
    return {"message": "Dark Sky Zone Finder API", "version": "1.0.0"}

@app.post("/find-dark-sky-zones")
async def find_dark_sky_zones(location: LocationInput, limit: int = 0):
    """Find the closest dark sky zones to a given location."""
    user_location = (location.latitude, location.longitude)
    
    # Calculate distances to all dark sky zones
    zones_with_distance = []
    for zone in DARK_SKY_ZONES:
        # Skip zones with incomplete essential data
        if (zone.get("latitude") is None or 
            zone.get("longitude") is None or 
            zone.get("bortle_scale") is None or
            zone.get("name") is None or
            zone.get("description") is None):
            continue
            
        zone_location = (zone["latitude"], zone["longitude"])
        distance = geodesic(user_location, zone_location).miles
        
        dark_sky_zone = DarkSkyZone(
            name=zone["name"],
            latitude=zone["latitude"],
            longitude=zone["longitude"],
            bortle_scale=zone["bortle_scale"],
            designation_type=zone["designation_type"] or "Undesignated",
            distance_miles=round(distance, 1),
            description=zone["description"]
        )
        zones_with_distance.append(dark_sky_zone)
    
    # Sort by distance and return requested number of zones (0 = all zones)
    sorted_zones = sorted(zones_with_distance, key=lambda x: x.distance_miles)
    closest_zones = sorted_zones if limit == 0 else sorted_zones[:limit]
    
    return {"dark_sky_zones": closest_zones}

@app.post("/stargazing-recommendations")
async def get_stargazing_recommendations(location: LocationInput):
    """Get stargazing recommendations for the next 7 days."""
    # Get closest dark sky zones first
    zones_response = await find_dark_sky_zones(location)
    closest_zones = zones_response["dark_sky_zones"]
    
    recommendations = []
    current_date = datetime.now()
    
    # Use the best (closest) dark sky zone for moon calculations if available
    best_zone = closest_zones[0] if closest_zones else None
    moon_calc_lat = best_zone.latitude if best_zone else location.latitude
    moon_calc_lon = best_zone.longitude if best_zone else location.longitude
    
    for i in range(14):
        date = current_date + timedelta(days=i)
        
        # Calculate moon conditions using the best dark sky zone location
        moon_phase, moon_illumination = calculate_moon_phase_and_illumination(date)
        moon_rise_time, moon_set_time = calculate_moon_times(moon_calc_lat, moon_calc_lon, date)
        best_viewing_start, best_viewing_end = calculate_best_viewing_times(moon_set_time, moon_rise_time)
        
        # Calculate visibility score using the best zone's Bortle scale
        best_zone_bortle = best_zone.bortle_scale if best_zone else 5
        
        visibility_score = calculate_visibility_score(moon_illumination, best_zone_bortle)
        conditions_desc = get_conditions_description(moon_illumination, visibility_score)
        
        # Data source is from the dark sky zones database
        bortle_source = f"Dark Sky Zone: {best_zone.name}" if best_zone else "Default (no zones found)"
        
        conditions = AstronomicalConditions(
            moon_phase=moon_phase,
            moon_illumination=round(moon_illumination, 1),
            moon_rise_time=moon_rise_time,
            moon_set_time=moon_set_time,
            best_viewing_start=best_viewing_start,
            best_viewing_end=best_viewing_end,
            visibility_score=visibility_score,
            conditions_description=conditions_desc,
            bortle_scale=best_zone_bortle,
            bortle_scale_estimated=False,  # This is from our curated database
            bortle_scale_source=bortle_source
        )
        
        recommendation = StargazingRecommendation(
            date=date.strftime('%Y-%m-%d'),
            conditions=conditions,
            dark_sky_zones=closest_zones[:3]  # Top 3 zones
        )
        
        recommendations.append(recommendation)
    
    recommendations.sort(key=lambda x: x.conditions.visibility_score, reverse=True)
    
    return {"recommendations": recommendations}

@app.post("/current-location-conditions")
async def get_current_location_conditions(location: LocationInput):
    """Get current stargazing conditions for the user's exact location."""
    current_date = datetime.now()
    
    # Calculate moon conditions for user's location
    moon_phase, moon_illumination = calculate_moon_phase_and_illumination(current_date)
    moon_rise_time, moon_set_time = calculate_moon_times(location.latitude, location.longitude, current_date)
    best_viewing_start, best_viewing_end = calculate_best_viewing_times(moon_set_time, moon_rise_time)
    
    # Get real-time Bortle scale for user's location
    user_bortle_scale, is_estimated = await get_bortle_scale_from_location(location.latitude, location.longitude)
    
    visibility_score = calculate_visibility_score(moon_illumination, user_bortle_scale)
    conditions_desc = get_conditions_description(moon_illumination, visibility_score)
    
    bortle_source = "Estimated based on location" if is_estimated else "Clear Outside API"
    
    conditions = AstronomicalConditions(
        moon_phase=moon_phase,
        moon_illumination=round(moon_illumination, 1),
        moon_rise_time=moon_rise_time,
        moon_set_time=moon_set_time,
        best_viewing_start=best_viewing_start,
        best_viewing_end=best_viewing_end,
        visibility_score=visibility_score,
        conditions_description=conditions_desc,
        bortle_scale=user_bortle_scale,
        bortle_scale_estimated=is_estimated,
        bortle_scale_source=bortle_source
    )
    
    return {
        "location": location,
        "date": current_date.strftime('%Y-%m-%d'),
        "conditions": conditions
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/bortle-scale/{latitude}/{longitude}")
async def get_bortle_scale_endpoint(latitude: float, longitude: float):
    """Get the current Bortle scale for a specific location."""
    bortle_scale, is_estimated = await get_bortle_scale_from_location(latitude, longitude)
    
    return {
        "latitude": latitude,
        "longitude": longitude,
        "bortle_scale": bortle_scale,
        "estimated": is_estimated,
        "source": "Estimated based on location" if is_estimated else "Clear Outside API",
        "description": get_bortle_description(bortle_scale),
        "note": "Estimated values are approximations based on proximity to major cities. For precise measurements, real-time API data is preferred." if is_estimated else "Real-time data from Clear Outside weather service."
    }

@app.get("/test-bortle/{latitude}/{longitude}")
async def test_bortle_scale(latitude: float, longitude: float):
    """Test endpoint to debug Bortle scale fetching."""
    try:
        bortle_scale, is_estimated = await get_bortle_scale_from_location(latitude, longitude)
        return {
            "latitude": latitude,
            "longitude": longitude,
            "bortle_scale": bortle_scale,
            "is_estimated": is_estimated,
            "type_bortle": type(bortle_scale).__name__,
            "type_estimated": type(is_estimated).__name__
        }
    except Exception as e:
        return {
            "error": str(e),
            "latitude": latitude,
            "longitude": longitude
        }

def get_bortle_description(bortle_scale: int) -> str:
    """Get a human-readable description of the Bortle scale."""
    descriptions = {
        1: "Excellent dark-sky site",
        2: "Typical truly dark site",
        3: "Rural sky",
        4: "Rural/suburban transition",
        5: "Suburban sky",
        6: "Bright suburban sky",
        7: "Suburban/urban transition",
        8: "City sky",
        9: "Inner-city sky"
    }
    return descriptions.get(bortle_scale, "Unknown")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
