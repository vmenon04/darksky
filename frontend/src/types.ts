export interface Location {
  latitude: number;
  longitude: number;
  name?: string;
}

export interface WeatherConditions {
  temperature_f: number;
  temperature_c: number;
  humidity: number;
  cloud_cover: number;
  visibility_miles: number;
  wind_speed_mph: number;
  wind_direction: string;
  condition: string;
  condition_description: string;
  weather_score: number;
  precipitation_chance: number;
}

export interface DarkSkyZone {
  name: string;
  latitude: number;
  longitude: number;
  bortle_scale: number;
  designation_type: string;
  distance_miles: number;
  description: string;
}

export interface AstronomicalConditions {
  moon_phase: string;
  moon_illumination: number;
  moon_rise_time?: string;
  moon_set_time?: string;
  best_viewing_start: string;
  best_viewing_end: string;
  visibility_score: number;
  conditions_description: string;
  bortle_scale?: number;
  bortle_scale_estimated?: boolean;
  bortle_scale_source?: string;
  weather?: WeatherConditions;
}

export interface StargazingRecommendation {
  date: string;
  conditions: AstronomicalConditions;
  dark_sky_zones: DarkSkyZone[];
}
