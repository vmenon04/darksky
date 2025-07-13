import React, { useState } from 'react';
import { MapPin, Clock, Moon, Star, Eye, Navigation, Loader2 } from 'lucide-react';
import { DarkSkyZone, Location } from '../types';

interface DarkSkyZoneCardProps {
  zone: DarkSkyZone;
  rank: number;
  userCurrentLocation?: Location | null;
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

export const DarkSkyZoneCard: React.FC<DarkSkyZoneCardProps> = ({ zone, rank, userCurrentLocation }) => {
  const [isLoadingApple, setIsLoadingApple] = useState(false);
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);

  const handleMapAction = async (mapType: 'apple' | 'google') => {
    const setLoading = mapType === 'apple' ? setIsLoadingApple : setIsLoadingGoogle;
    setLoading(true);

    // If we have stored user location, use it for directions
    if (userCurrentLocation) {
      const mapsUrl = mapType === 'apple'
        ? `https://maps.apple.com/?saddr=${userCurrentLocation.latitude},${userCurrentLocation.longitude}&daddr=${zone.latitude},${zone.longitude}&dirflg=d`
        : `https://www.google.com/maps/dir/${userCurrentLocation.latitude},${userCurrentLocation.longitude}/${zone.latitude},${zone.longitude}`;
      window.open(mapsUrl, '_blank');
      setLoading(false);
      return;
    }

    // Otherwise, just open the destination location
    const mapsUrl = mapType === 'apple' 
      ? `https://maps.apple.com/?daddr=${zone.latitude},${zone.longitude}`
      : `https://www.google.com/maps/place/${zone.latitude},${zone.longitude}`;
    window.open(mapsUrl, '_blank');
    setLoading(false);
  };

  const handleOpenInAppleMaps = () => handleMapAction('apple');
  const handleOpenInGoogleMaps = () => handleMapAction('google');
  return (
    <div className="glass-card p-6 hover:bg-white/15 transition-all duration-300 transform hover:scale-105">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          <div className="w-8 h-8 bg-cosmic-blue rounded-full flex items-center justify-center text-sm font-bold">
            {rank}
          </div>
          <div className="min-w-0 flex-1 h-12 flex flex-col justify-center">
            <h3 className="text-xl font-bold text-white line-clamp-1">{zone.name}</h3>
            <p className="text-cosmic-blue text-sm line-clamp-1">{zone.designation_type}</p>
          </div>
        </div>
        <div className="text-right ml-2">
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

        <div className="h-16 overflow-hidden">
          <p className="text-gray-300 text-sm leading-relaxed line-clamp-3">
            {zone.description}
          </p>
        </div>

        <div className="flex items-center space-x-4 text-xs text-gray-400">
          <div className="flex items-center space-x-1">
            <span>📍</span>
            <span>{zone.latitude.toFixed(4)}°, {zone.longitude.toFixed(4)}°</span>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex space-x-2">
            <button
              onClick={handleOpenInAppleMaps}
              disabled={isLoadingApple}
              className={`flex-1 transition-all duration-200 flex items-center justify-center space-x-2 group px-3 py-2 rounded-lg border text-xs font-medium ${
                isLoadingApple 
                  ? 'bg-cosmic-blue/10 border-cosmic-blue/30 text-cosmic-blue/50 cursor-not-allowed' 
                  : 'bg-cosmic-blue/20 hover:bg-cosmic-blue/30 border-cosmic-blue/50 text-cosmic-blue active:scale-95'
              }`}
              style={{ touchAction: 'manipulation' }}
            >
              {isLoadingApple ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Navigation size={14} className="group-hover:scale-110 transition-transform" />
              )}
              <span>{isLoadingApple ? 'Opening...' : 'Apple Maps'}</span>
            </button>
            
            <button
              onClick={handleOpenInGoogleMaps}
              disabled={isLoadingGoogle}
              className={`flex-1 transition-all duration-200 flex items-center justify-center space-x-2 group px-3 py-2 rounded-lg border text-xs font-medium ${
                isLoadingGoogle 
                  ? 'bg-green-500/10 border-green-500/30 text-green-400/50 cursor-not-allowed' 
                  : 'bg-green-500/20 hover:bg-green-500/30 border-green-500/50 text-green-400 active:scale-95'
              }`}
              style={{ touchAction: 'manipulation' }}
            >
              {isLoadingGoogle ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Navigation size={14} className="group-hover:scale-110 transition-transform" />
              )}
              <span>{isLoadingGoogle ? 'Opening...' : 'Google Maps'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
