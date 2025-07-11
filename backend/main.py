from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import ephem
from datetime import datetime, timedelta
from geopy.distance import geodesic
import math
from typing import List, Dict, Optional
import json

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
    designation_type: str
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

class StargazingRecommendation(BaseModel):
    date: str
    conditions: AstronomicalConditions
    dark_sky_zones: List[DarkSkyZone]

DARK_SKY_ZONES = [
    {
        "name": "Cherry Springs State Park",
        "latitude": 41.6611,
        "longitude": -77.8206,
        "bortle_scale": 2,
        "designation_type": "International Dark Sky Park",
        "description": "One of the darkest spots on the East Coast, ideal for astrophotography."
    },
    {
        "name": "Shenandoah National Park",
        "latitude": 38.2928,
        "longitude": -78.6795,
        "bortle_scale": 3,
        "designation_type": "Dark Sky Area",
        "description": "Beautiful mountain views with relatively dark skies in Virginia's Blue Ridge Mountains."
    },
    {
        "name": "Great Smoky Mountains National Park",
        "latitude": 35.6118,
        "longitude": -83.4895,
        "bortle_scale": 3,
        "designation_type": "Dark Sky Area",
        "description": "Popular national park on the Tennessee-North Carolina border with good dark sky areas."
    },
    {
        "name": "Congaree National Park",
        "latitude": 33.7948,
        "longitude": -80.7821,
        "bortle_scale": 3,
        "designation_type": "Dark Sky Area",
        "description": "South Carolina's only national park with excellent night sky viewing opportunities."
    },
    {
        "name": "Assateague Island National Seashore",
        "latitude": 38.0556,
        "longitude": -75.1561,
        "bortle_scale": 3,
        "designation_type": "Dark Sky Area",
        "description": "Coastal dark sky location on the Maryland-Virginia border with ocean horizon views."
    },
    {
        "name": "Cape Hatteras National Seashore",
        "latitude": 35.2322,
        "longitude": -75.5201,
        "bortle_scale": 2,
        "designation_type": "Dark Sky Area",
        "description": "Outer Banks location in North Carolina with exceptional dark skies over the Atlantic."
    },
    {
        "name": "Mammoth Cave National Park",
        "latitude": 37.1862,
        "longitude": -86.1004,
        "bortle_scale": 3,
        "designation_type": "International Dark Sky Park",
        "description": "Kentucky's International Dark Sky Park with excellent viewing conditions."
    },
    {
        "name": "Mont-Mégantic National Park",
        "latitude": 45.4553,
        "longitude": -71.1528,
        "bortle_scale": 2,
        "designation_type": "International Dark Sky Reserve",
        "description": "World's first International Dark Sky Reserve with protected core zone in Quebec."
    },
    
    {
        "name": "Cosmic Campground",
        "latitude": 33.4084,
        "longitude": -108.7992,
        "bortle_scale": 1,
        "designation_type": "International Dark Sky Sanctuary",
        "description": "Remote sanctuary in New Mexico's Gila National Forest with pristine dark skies."
    },
    {
        "name": "Big Bend National Park",
        "latitude": 29.1275,
        "longitude": -103.2425,
        "bortle_scale": 2,
        "designation_type": "International Dark Sky Park",
        "description": "Remote desert location with some of the darkest night skies in the lower 48 states."
    },
    {
        "name": "McDonald Observatory",
        "latitude": 30.6797,
        "longitude": -104.0247,
        "bortle_scale": 1,
        "designation_type": "Dark Sky Area",
        "description": "Professional observatory site in Texas with exceptional seeing conditions."
    },
    {
        "name": "Enchanted Rock State Park",
        "latitude": 30.5050,
        "longitude": -98.8197,
        "bortle_scale": 4,
        "designation_type": "Dark Sky Area",
        "description": "Central Texas location with good dark skies and granite dome for stargazing."
    },
    {
        "name": "Headlands International Dark Sky Park",
        "latitude": 45.7772,
        "longitude": -84.7736,
        "bortle_scale": 2,
        "designation_type": "International Dark Sky Park",
        "description": "Michigan's first International Dark Sky Park near Lake Michigan."
    },
    {
        "name": "Stephen C. Foster State Park",
        "latitude": 30.8410,
        "longitude": -82.3526,
        "bortle_scale": 2,
        "designation_type": "International Dark Sky Park",
        "description": "Georgia's Okefenokee Swamp location with excellent dark sky conditions."
    },
    {
        "name": "Kissimmee Prairie Preserve State Park",
        "latitude": 27.5317,
        "longitude": -81.0431,
        "bortle_scale": 2,
        "designation_type": "International Dark Sky Park",
        "description": "Florida's first International Dark Sky Park with wide-open prairie views."
    },
    
    {
        "name": "Death Valley National Park",
        "latitude": 36.2468,
        "longitude": -116.8167,
        "bortle_scale": 1,
        "designation_type": "International Dark Sky Park",
        "description": "One of the darkest places in North America, perfect for deep-sky observations."
    },
    {
        "name": "Great Basin National Park",
        "latitude": 39.0058,
        "longitude": -114.2579,
        "bortle_scale": 1,
        "designation_type": "International Dark Sky Park",
        "description": "Remote location with exceptional night sky visibility and minimal light pollution."
    },
    {
        "name": "Bryce Canyon National Park",
        "latitude": 37.5930,
        "longitude": -112.1871,
        "bortle_scale": 1,
        "designation_type": "International Dark Sky Park",
        "description": "High altitude location with exceptional air quality and dark skies."
    },
    {
        "name": "Natural Bridges National Monument",
        "latitude": 37.6063,
        "longitude": -110.0067,
        "bortle_scale": 1,
        "designation_type": "International Dark Sky Park",
        "description": "World's first International Dark Sky Park with pristine night sky conditions."
    },
    {
        "name": "Capitol Reef National Park",
        "latitude": 38.2872,
        "longitude": -111.2478,
        "bortle_scale": 2,
        "designation_type": "International Dark Sky Park",
        "description": "Utah's red rock country with excellent dark sky viewing opportunities."
    },
    {
        "name": "Hovenweep National Monument",
        "latitude": 37.3839,
        "longitude": -109.0783,
        "bortle_scale": 1,
        "designation_type": "International Dark Sky Park",
        "description": "Remote Four Corners location with exceptional night sky conditions."
    },
    {
        "name": "Chaco Culture National Historical Park",
        "latitude": 36.0544,
        "longitude": -107.9914,
        "bortle_scale": 1,
        "designation_type": "International Dark Sky Park",
        "description": "Ancient Puebloan site in New Mexico with pristine dark skies."
    },
    {
        "name": "Flagstaff Dark Sky City",
        "latitude": 35.1983,
        "longitude": -111.6513,
        "bortle_scale": 4,
        "designation_type": "International Dark Sky City",
        "description": "First International Dark Sky City with strong light pollution ordinances."
    },
    {
        "name": "Joshua Tree National Park",
        "latitude": 33.8734,
        "longitude": -115.9010,
        "bortle_scale": 2,
        "designation_type": "Dark Sky Area",
        "description": "California desert location popular with astrophotographers and stargazers."
    },
    {
        "name": "Anza-Borrego Desert State Park",
        "latitude": 33.2584,
        "longitude": -116.4023,
        "bortle_scale": 2,
        "designation_type": "Dark Sky Area",
        "description": "California's largest state park with excellent desert dark skies."
    },
    
    {
        "name": "Jasper National Park",
        "latitude": 52.8734,
        "longitude": -117.9543,
        "bortle_scale": 1,
        "designation_type": "Dark Sky Preserve",
        "description": "World's largest accessible dark sky preserve with excellent viewing conditions."
    },
    {
        "name": "Aoraki Mackenzie International Dark Sky Reserve",
        "latitude": -44.0000,
        "longitude": 170.1000,
        "bortle_scale": 1,
        "designation_type": "International Dark Sky Reserve",
        "description": "Gold-tier reserve in New Zealand with exceptional Southern Hemisphere viewing."
    }
]

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
        moon_set = observer.next_setting(moon)
        
        # Convert to local time strings
        rise_time = datetime.strptime(str(moon_rise), '%Y/%m/%d %H:%M:%S').strftime('%H:%M')
        set_time = datetime.strptime(str(moon_set), '%Y/%m/%d %H:%M:%S').strftime('%H:%M')
        
        return rise_time, set_time
    except:
        return None, None

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
async def find_dark_sky_zones(location: LocationInput):
    """Find the closest dark sky zones to a given location."""
    user_location = (location.latitude, location.longitude)
    
    # Calculate distances to all dark sky zones
    zones_with_distance = []
    for zone in DARK_SKY_ZONES:
        zone_location = (zone["latitude"], zone["longitude"])
        distance_km = geodesic(user_location, zone_location).kilometers
        distance_miles = distance_km * 0.621371  # Convert km to miles
        
        zone_data = DarkSkyZone(
            **zone,
            distance_miles=round(distance_miles, 2)
        )
        zones_with_distance.append(zone_data)
    
    closest_zones = sorted(zones_with_distance, key=lambda x: x.distance_miles)[:5]
    
    return {"dark_sky_zones": closest_zones}

@app.post("/stargazing-recommendations")
async def get_stargazing_recommendations(location: LocationInput):
    """Get stargazing recommendations for the next 14 days."""
    recommendations = []
    
    # Get closest dark sky zones
    zones_response = await find_dark_sky_zones(location)
    closest_zones = zones_response["dark_sky_zones"]
    
    # Calculate conditions for next 14 days
    base_date = datetime.now()
    for i in range(14):
        current_date = base_date + timedelta(days=i)
        
        moon_phase, moon_illumination = calculate_moon_phase_and_illumination(current_date)
        moon_rise, moon_set = calculate_moon_times(location.latitude, location.longitude, current_date)
        
        best_viewing_start = "21:00"
        best_viewing_end = "05:00"
        
        best_zone = closest_zones[0] if closest_zones else None
        visibility_score = calculate_visibility_score(
            moon_illumination, 
            best_zone.bortle_scale if best_zone else 7
        )
        
        conditions_desc = get_conditions_description(moon_illumination, visibility_score)
        
        conditions = AstronomicalConditions(
            moon_phase=moon_phase,
            moon_illumination=round(moon_illumination, 1),
            moon_rise_time=moon_rise,
            moon_set_time=moon_set,
            best_viewing_start=best_viewing_start,
            best_viewing_end=best_viewing_end,
            visibility_score=visibility_score,
            conditions_description=conditions_desc
        )
        
        recommendation = StargazingRecommendation(
            date=current_date.strftime('%Y-%m-%d'),
            conditions=conditions,
            dark_sky_zones=closest_zones[:3]  # Top 3 zones
        )
        
        recommendations.append(recommendation)
    
    recommendations.sort(key=lambda x: x.conditions.visibility_score, reverse=True)
    
    return {"recommendations": recommendations}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
