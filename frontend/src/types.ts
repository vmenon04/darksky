export interface Location {
  latitude: number;
  longitude: number;
  name?: string;
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
}

export interface StargazingRecommendation {
  date: string;
  conditions: AstronomicalConditions;
  dark_sky_zones: DarkSkyZone[];
}
