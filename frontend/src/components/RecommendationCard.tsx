import React from 'react';
import { Calendar, Star, Clock, Sunrise, Sunset, AlertTriangle, MapPin, Cloud } from 'lucide-react';
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

const getScoreColor = (score: number): string => {
  if (score >= 80) return 'text-green-400';
  if (score >= 70) return 'text-lime-400';
  if (score >= 60) return 'text-yellow-400';
  if (score >= 50) return 'text-orange-400';
  if (score >= 40) return 'text-red-400';
  return 'text-red-500';
};

const getScoreBgColor = (score: number): string => {
  if (score >= 80) return 'bg-green-400/20';
  if (score >= 70) return 'bg-lime-400/20';
  if (score >= 60) return 'bg-yellow-400/20';
  if (score >= 50) return 'bg-orange-400/20';
  if (score >= 40) return 'bg-red-400/20';
  return 'bg-red-500/20';
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

  // Calculate combined score (same algorithm as backend)
  const astronomyScore = conditions.visibility_score;
  const weatherScore = conditions.weather?.weather_score || 50;
  const combinedScore = Math.round((astronomyScore * 0.6) + (weatherScore * 0.4));

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
        
        <div className="flex items-center space-x-3 ml-4">
          {/* Combined Score - Most Prominent */}
          <div className={`px-4 py-2 rounded-lg border ${getScoreBgColor(combinedScore)} ${
            combinedScore >= 70 ? 'border-green-400/30' : 
            combinedScore >= 60 ? 'border-yellow-400/30' : 
            combinedScore >= 50 ? 'border-orange-400/30' : 'border-red-400/30'
          }`}>
            <div className="text-center">
              <div className={`text-lg font-bold ${getScoreColor(combinedScore)}`}>
                {combinedScore}%
              </div>
              <div className="text-xs text-gray-400">Overall</div>
            </div>
          </div>
          
          {/* Individual Scores */}
          <div className="flex flex-col space-y-1">
            <div className="flex items-center space-x-2">
              <Star size={12} className={getVisibilityColor(astronomyScore)} />
              <span className={`text-xs ${getVisibilityColor(astronomyScore)}`}>
                Astronomy: {astronomyScore}%
              </span>
            </div>
            {conditions.weather && (
              <div className="flex items-center space-x-2">
                <Cloud size={12} className={getScoreColor(weatherScore)} />
                <span className={`text-xs ${getScoreColor(weatherScore)}`}>
                  Weather: {weatherScore}%
                </span>
              </div>
            )}
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
        </div>
      </div>

      {/* Weather Information Section - Redesigned */}
      {conditions.weather && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="flex items-center mb-3">
            <div className="flex items-center space-x-2">
              <Cloud className="w-4 h-4 text-cosmic-blue" />
              <span className="text-sm font-medium text-white">Weather Details</span>
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
