import logging
import sys

# Setup security logging
security_logger = logging.getLogger("security")
security_handler = logging.StreamHandler(sys.stdout)
security_handler.setFormatter(logging.Formatter(
    '%(asctime)s - SECURITY - %(levelname)s - %(message)s'
))
security_logger.addHandler(security_handler)
security_logger.setLevel(logging.WARNING)

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from pydantic import BaseModel, Field
import ephem
from datetime import datetime, timedelta
from geopy.distance import geodesic
import math
from typing import List, Dict, Optional
import json
import os
import httpx
import re
from dotenv import load_dotenv
import hashlib
import time
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Load environment variables
load_dotenv()

# Weather cache configuration
WEATHER_CACHE = {}
CACHE_EXPIRY_MINUTES = 60  # Cache weather data for 1 hour
MAX_CACHE_SIZE = 1000  # Maximum number of cached entries

app = FastAPI(title="Stargazr API", version="1.0.0")

# Rate limiting setup with configurable limits
rate_limit_per_minute = os.getenv("RATE_LIMIT_PER_MINUTE", "60")
limiter = Limiter(key_func=get_remote_address, default_limits=[f"{rate_limit_per_minute}/minute"])
app.state.limiter = limiter

# Custom rate limit exceeded handler
async def custom_rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    """Custom handler for rate limit exceeded errors."""
    response = HTTPException(
        status_code=429,
        detail={
            "error": "Rate limit exceeded",
            "message": "Too many requests. Please wait a moment before trying again.",
            "retry_after": exc.retry_after,
            "limit": str(exc.detail).split()[0] if exc.detail else "Unknown"
        }
    )
    return response

app.add_exception_handler(RateLimitExceeded, custom_rate_limit_exceeded_handler)

# Get allowed origins from environment variable, with fallback for development
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
allowed_origins = [origin.strip() for origin in allowed_origins]  # Clean whitespace

# Get trusted hosts from environment variable
trusted_hosts = os.getenv("TRUSTED_HOSTS", "localhost,127.0.0.1").split(",")
trusted_hosts = [host.strip() for host in trusted_hosts]

# Security middleware
app.add_middleware(TrustedHostMiddleware, allowed_hosts=trusted_hosts)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],  # Only allow necessary methods
    allow_headers=["Content-Type", "Authorization"],  # Only allow necessary headers
)

# Request size and validation middleware
@app.middleware("http")
async def validate_request_size(request: Request, call_next):
    # Limit request body size to 1MB
    max_size = 1024 * 1024  # 1MB
    content_length = request.headers.get("content-length")
    
    if content_length and int(content_length) > max_size:
        raise HTTPException(status_code=413, detail="Request too large")
    
    # Validate User-Agent (basic bot detection)
    user_agent = request.headers.get("user-agent", "").lower()
    suspicious_agents = ["sqlmap", "nikto", "nmap", "masscan", "zap"]
    if any(agent in user_agent for agent in suspicious_agents):
        security_logger.warning(f"Suspicious User-Agent detected: {user_agent} from IP: {get_remote_address(request)}")
        raise HTTPException(status_code=403, detail="Forbidden")
    
    return await call_next(request)

# Security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    
    # Security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    response.headers["X-Robots-Tag"] = "noindex, nofollow" if os.getenv("ENVIRONMENT") != "production" else "index, follow"
    
    # Content Security Policy (CSP)
    csp = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://vercel.live; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: https:; "
        "connect-src 'self' https://api.openweathermap.org https://clearoutside.com https://nominatim.openstreetmap.org https://vitals.vercel-insights.com; "
        "font-src 'self'; "
        "object-src 'none'; "
        "base-uri 'self'; "
        "form-action 'self'; "
        "frame-ancestors 'none'; "
        "upgrade-insecure-requests;"
    )
    response.headers["Content-Security-Policy"] = csp
    
    # HSTS (HTTP Strict Transport Security) - only in production
    if os.getenv("ENVIRONMENT") == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
    
    # Server identification removal
    if "server" in response.headers:
        del response.headers["server"]
    
    return response

class LocationInput(BaseModel):
    latitude: float = Field(..., ge=-90, le=90, description="Latitude between -90 and 90 degrees")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude between -180 and 180 degrees")
    name: Optional[str] = Field(None, max_length=100, min_length=1, pattern=r'^[a-zA-Z0-9\s\-_.,()]+$', description="Optional location name with safe characters only")

class WeatherConditions(BaseModel):
    temperature_f: float
    temperature_c: float
    humidity: int
    cloud_cover: int
    visibility_miles: float
    wind_speed_mph: float
    wind_direction: str
    condition: str
    condition_description: str
    weather_score: float  # 0-100, higher is better for stargazing
    precipitation_chance: int

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
    weather: Optional[WeatherConditions] = None

class StargazingRecommendation(BaseModel):
    date: str
    conditions: AstronomicalConditions
    dark_sky_zones: List[DarkSkyZone]

# Weather caching functions
def clean_weather_cache():
    """Remove expired entries from weather cache."""
    current_time = time.time()
    expired_keys = [
        key for key, (data, timestamp) in WEATHER_CACHE.items()
        if current_time - timestamp > (CACHE_EXPIRY_MINUTES * 60)
    ]
    for key in expired_keys:
        del WEATHER_CACHE[key]
    
    # If cache is still too large, remove oldest entries
    if len(WEATHER_CACHE) > MAX_CACHE_SIZE:
        # Sort by timestamp and keep only the newest entries
        sorted_items = sorted(WEATHER_CACHE.items(), key=lambda x: x[1][1], reverse=True)
        WEATHER_CACHE.clear()
        for key, value in sorted_items[:MAX_CACHE_SIZE]:
            WEATHER_CACHE[key] = value

def get_weather_cache_key(latitude: float, longitude: float, date: datetime) -> str:
    """Generate a cache key for weather data."""
    # Round coordinates to reduce cache fragmentation (within ~1km accuracy)
    lat_rounded = round(latitude, 2)
    lon_rounded = round(longitude, 2)
    # Use date only (not time) since we're dealing with daily forecasts
    date_str = date.strftime('%Y-%m-%d')
    
    cache_string = f"{lat_rounded}_{lon_rounded}_{date_str}"
    return hashlib.md5(cache_string.encode()).hexdigest()

def get_cached_weather(latitude: float, longitude: float, date: datetime) -> Optional[WeatherConditions]:
    """Retrieve weather data from cache if available and not expired."""
    cache_key = get_weather_cache_key(latitude, longitude, date)
    
    if cache_key in WEATHER_CACHE:
        data, timestamp = WEATHER_CACHE[cache_key]
        current_time = time.time()
        
        # Check if cache entry is still valid
        if current_time - timestamp < (CACHE_EXPIRY_MINUTES * 60):
            print(f"Cache HIT for {latitude:.2f}, {longitude:.2f} on {date.strftime('%Y-%m-%d')}")
            return data
        else:
            # Remove expired entry
            del WEATHER_CACHE[cache_key]
            print(f"Cache EXPIRED for {latitude:.2f}, {longitude:.2f} on {date.strftime('%Y-%m-%d')}")
    
    print(f"Cache MISS for {latitude:.2f}, {longitude:.2f} on {date.strftime('%Y-%m-%d')}")
    return None

def cache_weather_data(latitude: float, longitude: float, date: datetime, weather_data: WeatherConditions):
    """Store weather data in cache."""
    cache_key = get_weather_cache_key(latitude, longitude, date)
    current_time = time.time()
    
    # Clean cache periodically
    if len(WEATHER_CACHE) % 50 == 0:  # Clean every 50 additions
        clean_weather_cache()
    
    WEATHER_CACHE[cache_key] = (weather_data, current_time)
    print(f"Cached weather for {latitude:.2f}, {longitude:.2f} on {date.strftime('%Y-%m-%d')} (Cache size: {len(WEATHER_CACHE)})")

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

async def get_weather_forecast(latitude: float, longitude: float, date: datetime) -> Optional[WeatherConditions]:
    """
    Fetch weather forecast for a specific location and date.
    Uses OpenWeatherMap 5-day forecast API (free tier).
    Note: For demo purposes, we use current real date for API calls since the simulated date may be outside API range.
    """
    # You can set your OpenWeatherMap API key as an environment variable
    api_key = os.getenv('OPENWEATHER_API_KEY', 'demo_key')
    
    if api_key == 'demo_key':
        # Return demo weather data if no API key is set
        return get_demo_weather_data(date)
    
    # Check cache first
    cached_weather = get_cached_weather(latitude, longitude, date)
    if cached_weather:
        print(f"Cache hit for weather data: {latitude}, {longitude}, {date}")
        return cached_weather
    
    try:
        url = f"https://api.openweathermap.org/data/2.5/forecast"
        params = {
            'lat': latitude,
            'lon': longitude,
            'appid': api_key,
            'units': 'imperial'  # Fahrenheit, mph
        }
        
        print(f"Fetching weather data from OpenWeatherMap for {latitude}, {longitude}")
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            print(f"OpenWeatherMap API response received, {len(data.get('list', []))} forecasts available")
            
            # Find the forecast closest to the requested date
            forecasts = data.get('list', [])
            if forecasts:
                best_forecast = find_closest_forecast(forecasts, date)
                weather_data = parse_weather_data(best_forecast)
                
                # Cache the weather data
                cache_weather_data(latitude, longitude, date, weather_data)
                
                return weather_data
            
    except httpx.HTTPError as e:
        print(f"HTTP error fetching weather data: {e}")
        print(f"Status code: {e.response.status_code if hasattr(e, 'response') else 'N/A'}")
    except Exception as e:
        print(f"Error fetching weather data: {e}")
    
    # Fallback to demo data
    print("Falling back to demo weather data")
    return get_demo_weather_data(date)

def parse_weather_data(forecast_data: dict) -> WeatherConditions:
    """Parse OpenWeatherMap forecast data into WeatherConditions model."""
    main = forecast_data['main']
    weather = forecast_data['weather'][0]
    wind = forecast_data.get('wind', {})
    clouds = forecast_data.get('clouds', {})
    visibility = forecast_data.get('visibility', 10000)  # meters
    pop = forecast_data.get('pop', 0)  # probability of precipitation
    
    temp_f = main['temp']
    temp_c = (temp_f - 32) * 5/9
    humidity = main['humidity']
    cloud_cover = clouds.get('all', 0)
    visibility_miles = visibility * 0.000621371  # convert meters to miles
    wind_speed = wind.get('speed', 0)
    wind_deg = wind.get('deg', 0)
    
    # Convert wind direction from degrees to cardinal direction
    wind_direction = get_wind_direction(wind_deg)
    
    # Calculate weather score for stargazing (0-100, higher is better)
    weather_score = calculate_weather_score(cloud_cover, humidity, visibility_miles, wind_speed, pop * 100)
    
    return WeatherConditions(
        temperature_f=round(temp_f, 1),
        temperature_c=round(temp_c, 1),
        humidity=humidity,
        cloud_cover=cloud_cover,
        visibility_miles=round(visibility_miles, 1),
        wind_speed_mph=round(wind_speed, 1),
        wind_direction=wind_direction,
        condition=weather['main'],
        condition_description=weather['description'].title(),
        weather_score=weather_score,
        precipitation_chance=round(pop * 100)
    )

def get_demo_weather_data(date: datetime) -> WeatherConditions:
    """Return demo weather data when API is not available."""
    import random
    
    # Generate reasonable demo data based on date
    # Use year, month, and day to ensure different weather for different dates
    random.seed(date.year * 10000 + date.month * 100 + date.day)
    
    temp_f = random.uniform(45, 75)
    cloud_cover = random.randint(10, 60)
    humidity = random.randint(30, 80)
    visibility = random.uniform(6, 15)
    wind_speed = random.uniform(2, 15)
    precip_chance = random.randint(0, 40)
    
    # Add some variety to conditions
    conditions = ["Clear", "Partly Cloudy", "Mostly Clear", "Few Clouds"]
    descriptions = ["Clear Sky", "Partly Cloudy", "Mostly Clear", "Few Clouds"]
    condition_idx = random.randint(0, len(conditions) - 1)
    
    weather_score = calculate_weather_score(cloud_cover, humidity, visibility, wind_speed, precip_chance)
    
    return WeatherConditions(
        temperature_f=round(temp_f, 1),
        temperature_c=round((temp_f - 32) * 5/9, 1),
        humidity=humidity,
        cloud_cover=cloud_cover,
        visibility_miles=round(visibility, 1),
        wind_speed_mph=round(wind_speed, 1),
        wind_direction=random.choice(["N", "NE", "E", "SE", "S", "SW", "W", "NW"]),
        condition=conditions[condition_idx],
        condition_description=descriptions[condition_idx],
        weather_score=weather_score,
        precipitation_chance=precip_chance
    )

def get_wind_direction(degrees: float) -> str:
    """Convert wind direction from degrees to cardinal direction."""
    directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
                 "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]
    index = round(degrees / 22.5) % 16
    return directions[index]

def calculate_weather_score(cloud_cover: int, humidity: int, visibility_miles: float, 
                          wind_speed: float, precip_chance: int) -> float:
    """
    Calculate a weather score for stargazing conditions (0-100, higher is better).
    
    Factors:
    - Cloud cover (most important): clear skies are essential
    - Humidity: affects atmospheric clarity
    - Visibility: important for seeing faint objects
    - Wind speed: affects telescope stability
    - Precipitation chance: rain/snow prevents stargazing
    """
    # Cloud cover score (0-40 points): less clouds = better
    cloud_score = max(0, 40 - (cloud_cover * 0.4))
    
    # Humidity score (0-20 points): lower humidity = better
    humidity_score = max(0, 20 - (humidity * 0.2))
    
    # Visibility score (0-20 points): higher visibility = better
    visibility_score = min(20, visibility_miles * 2)
    
    # Wind score (0-10 points): moderate wind is okay, too much is bad
    if wind_speed <= 5:
        wind_score = 10
    elif wind_speed <= 15:
        wind_score = 10 - ((wind_speed - 5) * 0.5)
    else:
        wind_score = 0
    
    # Precipitation score (0-10 points): no precipitation = better
    precip_score = max(0, 10 - (precip_chance * 0.1))
    
    total_score = cloud_score + humidity_score + visibility_score + wind_score + precip_score
    return round(total_score, 1)

def get_conditions_description(moon_illumination: float, visibility_score: float) -> str:
    """Generate a human-readable description of stargazing conditions."""
    if visibility_score >= 80:
        base_desc = "Excellent stargazing conditions"
    elif visibility_score >= 60:
        base_desc = "Good stargazing conditions"
    elif visibility_score >= 40:
        base_desc = "Fair stargazing conditions"
    elif visibility_score >= 20:
        base_desc = "Poor stargazing conditions"
    else:
        base_desc = "Very poor stargazing conditions"
    
    # Add moon phase context
    if moon_illumination < 10:
        moon_desc = " with new moon providing dark skies"
    elif moon_illumination < 30:
        moon_desc = " with minimal moonlight interference"
    elif moon_illumination < 70:
        moon_desc = " with moderate moonlight"
    else:
        moon_desc = " with bright moonlight limiting faint object visibility"
    
    return base_desc + moon_desc

@app.get("/")
async def root():
    return {"message": "Dark Sky Zone Finder API", "version": "1.0.0"}

# Internal function without rate limiting for internal calls
async def _find_dark_sky_zones_internal(location: LocationInput, limit: int = 0):
    """Internal function to find the closest dark sky zones to a given location."""
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

@app.post("/find-dark-sky-zones")
@limiter.limit("30/minute")  # 30 requests per minute per IP
async def find_dark_sky_zones(request: Request, location: LocationInput, limit: int = 0):
    """Find the closest dark sky zones to a given location."""
    return await _find_dark_sky_zones_internal(location, limit)

@app.post("/stargazing-recommendations")
@limiter.limit("20/minute")  # 20 requests per minute per IP
async def get_stargazing_recommendations(request: Request, location: LocationInput, zone_name: Optional[str] = None, days: int = 7):
    """Get stargazing recommendations for the specified number of days (default: 7, max: 14)."""
    # Validate days parameter
    if days < 1:
        days = 1
    elif days > 14:
        days = 14
    # Get closest dark sky zones first
    zones_response = await _find_dark_sky_zones_internal(location)
    closest_zones = zones_response["dark_sky_zones"]
    
    # If a specific zone is requested, find it; otherwise use the closest
    if zone_name:
        selected_zone = next((zone for zone in closest_zones if zone.name == zone_name), None)
        if not selected_zone:
            raise HTTPException(status_code=404, detail=f"Zone '{zone_name}' not found")
        best_zone = selected_zone
    else:
        best_zone = closest_zones[0] if closest_zones else None
    
    recommendations = []
    current_date = datetime.now()
    
    # Use the selected zone for moon calculations
    moon_calc_lat = best_zone.latitude if best_zone else location.latitude
    moon_calc_lon = best_zone.longitude if best_zone else location.longitude
    
    for i in range(days):
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
        
        # Get weather forecast for the best dark sky zone location (not user location)
        weather_lat = best_zone.latitude if best_zone else location.latitude
        weather_lon = best_zone.longitude if best_zone else location.longitude
        weather_forecast = await get_weather_forecast(weather_lat, weather_lon, date)
        
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
            bortle_scale_source=bortle_source,
            weather=weather_forecast
        )
        
        recommendation = StargazingRecommendation(
            date=date.strftime('%Y-%m-%d'),
            conditions=conditions,
            dark_sky_zones=closest_zones[:3]  # Top 3 zones
        )
        
        recommendations.append(recommendation)
    
    # Sort recommendations by combined score: visibility + weather
    # Visibility score: 0-100 (astronomy conditions)
    # Weather score: 0-100 (weather conditions)
    # Combined with 60% astronomy, 40% weather weighting
    def calculate_combined_score(rec):
        astronomy_score = rec.conditions.visibility_score
        weather_score = rec.conditions.weather.weather_score if rec.conditions.weather else 50  # Default if no weather
        combined_score = (astronomy_score * 0.6) + (weather_score * 0.4)
        return combined_score
    
    recommendations.sort(key=calculate_combined_score, reverse=True)
    
    return {"recommendations": recommendations}

@app.post("/current-location-conditions")
@limiter.limit("60/minute")  # 60 requests per minute per IP (higher limit for current conditions)
async def get_current_location_conditions(request: Request, location: LocationInput):
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
    
    # Get weather forecast for current conditions
    weather_forecast = await get_weather_forecast(location.latitude, location.longitude, current_date)
    
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
        bortle_scale_source=bortle_source,
        weather=weather_forecast
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
@limiter.limit("60/minute")  # 60 requests per minute per IP
async def get_bortle_scale_endpoint(request: Request, latitude: float, longitude: float):
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
@limiter.limit("30/minute")  # 30 requests per minute per IP
async def test_bortle_scale(request: Request, latitude: float, longitude: float):
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

@app.get("/weather-forecast/{latitude}/{longitude}")
@limiter.limit("30/minute")  # 30 requests per minute per IP
async def get_weather_forecast_endpoint(request: Request, latitude: float, longitude: float, days: int = 5):
    """Get weather forecast for a specific location and number of days."""
    if days < 1 or days > 5:
        raise HTTPException(status_code=400, detail="Days must be between 1 and 5")
    
    forecasts = []
    current_date = datetime.now()
    
    for i in range(days):
        forecast_date = current_date + timedelta(days=i)
        weather = await get_weather_forecast(latitude, longitude, forecast_date)
        
        if weather:
            forecasts.append({
                "date": forecast_date.strftime('%Y-%m-%d'),
                "weather": weather
            })
    
    return {
        "latitude": latitude,
        "longitude": longitude,
        "forecasts": forecasts
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

def find_closest_forecast(forecasts: list, target_date: datetime) -> dict:
    """Find the forecast entry closest to the target date."""
    from datetime import datetime
    
    # If target date is outside the forecast range, use edge cases
    forecast_dates = []
    for forecast in forecasts:
        forecast_dt = datetime.fromtimestamp(forecast['dt'])
        forecast_dates.append((forecast, forecast_dt))
    
    if not forecast_dates:
        return forecasts[0]
    
    # Find the forecast with the smallest time difference
    closest_forecast = None
    smallest_diff = float('inf')
    
    for forecast, forecast_dt in forecast_dates:
        # Compare just the date parts for daily forecasts
        target_date_only = target_date.replace(hour=12, minute=0, second=0, microsecond=0)
        forecast_date_only = forecast_dt.replace(hour=12, minute=0, second=0, microsecond=0)
        
        diff = abs((target_date_only - forecast_date_only).total_seconds())
        
        if diff < smallest_diff:
            smallest_diff = diff
            closest_forecast = forecast
    
    return closest_forecast or forecasts[0]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
