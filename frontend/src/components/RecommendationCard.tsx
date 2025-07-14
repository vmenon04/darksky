import React from 'react';
import { Calendar, Star, Eye, Clock, Sunrise, Sunset, AlertTriangle, MapPin, Cloud, Thermometer, Droplets, Wind } from 'lucide-react';
import { StargazingRecommendation } from '../types';
import { WeatherCard } from './WeatherCard';

interface RecommendationCardProps {
  recommendation: StargazingRecommendation;
  isTopRecommendation?: boolean;
}

const getMoonIcon = (phase: string) => {
  switch (phase.toLowerCase()) {
    case 'new moon':
      return '🌑';
    case 'waxing crescent':
      return '🌒';
    case 'first quarter':
      return '🌓';
    case 'waxing gibbous':
      return '🌔';
    case 'full moon':
      return '🌕';
    case 'waning gibbous':
      return '🌖';
    case 'last quarter':
      return '🌗';
    case 'waning crescent':
      return '🌘';
    default:
      return '🌙';
  }
};

const getVisibilityColor = (score: number): string => {
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-yellow-400';
  if (score >= 40) return 'text-orange-400';
  return 'text-red-400';
};

const getVisibilityBgColor = (score: number): string => {
  if (score >= 80) return 'bg-green-400/20';
  if (score >= 60) return 'bg-yellow-400/20';
  if (score >= 40) return 'bg-orange-400/20';
  return 'bg-red-400/20';
};

const getBortleDescription = (scale: number): string => {
  const descriptions = {
    1: 'Pristine Dark Sky',
    2: 'Excellent Dark Sky', 
    3: 'Good Dark Sky',
    4: 'Moderate Light Pollution',
    5: 'Bright Suburban Sky',
    6: 'Bright Urban Sky',
    7: 'Inner City Sky',
    8: 'Extreme Light Pollution',
    9: 'Extreme Light Pollution+'
  };
  return descriptions[scale as keyof typeof descriptions] || `Scale ${scale}`;
};

const getBortleColor = (scale: number): string => {
  if (scale <= 2) return 'text-green-400';
  if (scale <= 4) return 'text-yellow-400'; 
  if (scale <= 6) return 'text-orange-400';
  return 'text-red-400';
};

export const RecommendationCard: React.FC<RecommendationCardProps> = ({ 
  recommendation, 
  isTopRecommendation = false 
}) => {
  const { date, conditions } = recommendation;
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className={`glass-card p-6 transition-all duration-300 hover:bg-white/15 ${
      isTopRecommendation ? 'ring-2 ring-star-yellow border-star-yellow/30' : ''
    }`}>
      {isTopRecommendation && (
        <div className="flex items-center space-x-2 mb-4">
          <Star className="text-star-yellow animate-twinkle" size={20} />
          <span className="text-star-yellow font-bold text-sm">Best Recommendation</span>
        </div>
      )}

      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-white mb-1">{formattedDate}</h3>
          <div className="flex items-center space-x-2 text-sm text-gray-300 mb-1">
            <Calendar size={14} />
            <span>{new Date(date).toDateString()}</span>
          </div>
          {conditions.bortle_scale_source?.startsWith('Dark Sky Zone:') && (
            <div className="flex items-center space-x-2 text-sm text-cosmic-blue">
              <MapPin size={14} />
              <span>{conditions.bortle_scale_source.replace('Dark Sky Zone: ', '')}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-4 ml-4">
          {/* Bortle Scale Display */}
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <Eye size={14} className={getBortleColor(conditions.bortle_scale || 5)} />
              {conditions.bortle_scale_estimated && (
                <div title="Estimated value">
                  <AlertTriangle size={12} className="text-yellow-400" />
                </div>
              )}
            </div>
            <div className={`text-sm font-bold ${getBortleColor(conditions.bortle_scale || 5)}`}>
              Bortle {conditions.bortle_scale ?? '?'}
            </div>
            <div className={`text-xs ${getBortleColor(conditions.bortle_scale || 5)}`}>
              {getBortleDescription(conditions.bortle_scale || 5)}
            </div>
          </div>
          
          {/* Visibility Score */}
          <div className={`px-3 py-1 rounded-full ${getVisibilityBgColor(conditions.visibility_score)}`}>
            <span className={`text-sm font-bold ${getVisibilityColor(conditions.visibility_score)}`}>
              {conditions.visibility_score}% Score
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{getMoonIcon(conditions.moon_phase)}</span>
              <div>
                <div className="text-white font-medium">{conditions.moon_phase}</div>
                <div className="text-sm text-gray-400">
                  {conditions.moon_illumination.toFixed(1)}% illuminated
                </div>
              </div>
            </div>

            {(conditions.moon_rise_time || conditions.moon_set_time) && (
              <div className="space-y-2">
                {conditions.moon_rise_time && (
                  <div className="flex items-center space-x-2 text-sm">
                    <Sunrise size={16} className="text-yellow-400" />
                    <span className="text-gray-300">Rise: {conditions.moon_rise_time}</span>
                  </div>
                )}
                {conditions.moon_set_time && (
                  <div className="flex items-center space-x-2 text-sm">
                    <Sunset size={16} className="text-orange-400" />
                    <span className="text-gray-300">Set: {conditions.moon_set_time}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Clock size={16} className="text-cosmic-blue" />
              <span className="text-white font-medium">Best Viewing Window</span>
            </div>
            <div className="text-sm text-gray-300">
              <div>{conditions.best_viewing_start} - {conditions.best_viewing_end}</div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-4">
          <p className="text-sm text-gray-300 leading-relaxed">
            {conditions.conditions_description}
          </p>
          {conditions.bortle_scale_estimated && (
            <div className="mt-2 flex items-center space-x-2 text-xs text-yellow-400">
              <AlertTriangle size={12} />
              <span>Light pollution estimate based on location. {conditions.bortle_scale_source}.</span>
            </div>
          )}
        </div>

        {recommendation.dark_sky_zones.length > 0 && (
          <div className="border-t border-white/10 pt-4">
            <h4 className="text-sm font-medium text-white mb-2">Recommended Dark Sky Zones</h4>
            <div className="space-y-2">
              {recommendation.dark_sky_zones.slice(0, 2).map((zone, index) => (
                <div key={zone.name} className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">{zone.name}</span>
                  <span className="text-cosmic-blue">{zone.distance_miles} mi</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Weather Information Section - Redesigned */}
      {conditions.weather && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Cloud className="w-4 h-4 text-cosmic-blue" />
              <span className="text-sm font-medium text-white">Weather at {conditions.bortle_scale_source?.replace('Dark Sky Zone: ', '') || 'Location'}</span>
            </div>
            <div className={`text-sm font-semibold px-2 py-1 rounded ${
              conditions.weather.weather_score >= 70 ? 'bg-green-500/20 text-green-400' :
              conditions.weather.weather_score >= 50 ? 'bg-yellow-500/20 text-yellow-400' :
              conditions.weather.weather_score >= 30 ? 'bg-orange-500/20 text-orange-400' : 
              'bg-red-500/20 text-red-400'
            }`}>
              {conditions.weather.weather_score}/100
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Temperature:</span>
                <span className="text-white">{Math.round(conditions.weather.temperature_f)}°F</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Condition:</span>
                <span className="text-white">{conditions.weather.condition_description}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Cloud Cover:</span>
                <span className="text-white">{conditions.weather.cloud_cover}%</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Humidity:</span>
                <span className="text-white">{conditions.weather.humidity}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Wind:</span>
                <span className="text-white">{conditions.weather.wind_speed_mph} mph {conditions.weather.wind_direction}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Visibility:</span>
                <span className="text-white">{conditions.weather.visibility_miles.toFixed(1)} mi</span>
              </div>
            </div>
          </div>
          
          {conditions.weather.precipitation_chance > 0 && (
            <div className="mt-2 text-sm text-orange-300">
              ⚠️ {conditions.weather.precipitation_chance}% chance of precipitation
            </div>
          )}
        </div>
      )}
    </div>
  );
};
