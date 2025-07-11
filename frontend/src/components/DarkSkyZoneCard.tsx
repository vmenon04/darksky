import React from 'react';
import { MapPin, Clock, Moon, Star, Eye } from 'lucide-react';
import { DarkSkyZone } from '../types';

interface DarkSkyZoneCardProps {
  zone: DarkSkyZone;
  rank: number;
}

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
  return descriptions[scale as keyof typeof descriptions] || 'Unknown';
};

const getBortleColor = (scale: number): string => {
  if (scale <= 2) return 'text-green-400';
  if (scale <= 4) return 'text-yellow-400';
  if (scale <= 6) return 'text-orange-400';
  return 'text-red-400';
};

export const DarkSkyZoneCard: React.FC<DarkSkyZoneCardProps> = ({ zone, rank }) => {
  return (
    <div className="glass-card p-6 hover:bg-white/15 transition-all duration-300 transform hover:scale-105">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-cosmic-blue rounded-full flex items-center justify-center text-sm font-bold">
            {rank}
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">{zone.name}</h3>
            <p className="text-cosmic-blue text-sm">{zone.designation_type}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center space-x-1 text-star-yellow">
            <MapPin size={16} />
            <span className="text-sm">{zone.distance_miles} mi</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Eye size={16} className={getBortleColor(zone.bortle_scale)} />
            <span className="text-sm">Bortle Scale</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`text-lg font-bold ${getBortleColor(zone.bortle_scale)}`}>
              {zone.bortle_scale}
            </span>
            <span className={`text-xs ${getBortleColor(zone.bortle_scale)}`}>
              {getBortleDescription(zone.bortle_scale)}
            </span>
          </div>
        </div>

        <p className="text-gray-300 text-sm leading-relaxed">
          {zone.description}
        </p>

        <div className="flex items-center space-x-4 text-xs text-gray-400">
          <div className="flex items-center space-x-1">
            <span>📍</span>
            <span>{zone.latitude.toFixed(4)}°, {zone.longitude.toFixed(4)}°</span>
          </div>
        </div>
      </div>
    </div>
  );
};
