import React from 'react';
import { Calendar, Moon, Star, Eye, Clock, Sunrise, Sunset } from 'lucide-react';
import { StargazingRecommendation } from '../types';

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
        <div>
          <h3 className="text-lg font-bold text-white mb-1">{formattedDate}</h3>
          <div className="flex items-center space-x-2 text-sm text-gray-300">
            <Calendar size={14} />
            <span>{new Date(date).toDateString()}</span>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full ${getVisibilityBgColor(conditions.visibility_score)}`}>
          <span className={`text-sm font-bold ${getVisibilityColor(conditions.visibility_score)}`}>
            {conditions.visibility_score}% Score
          </span>
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
    </div>
  );
};
