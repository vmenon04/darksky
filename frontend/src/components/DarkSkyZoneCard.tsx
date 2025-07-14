import React, { useState } from 'react';
import { MapPin, Clock, Eye, Navigation, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { DarkSkyZone, Location } from '../types';

interface DarkSkyZoneCardProps {
  zone: DarkSkyZone;
  rank: number;
  userCurrentLocation?: Location | null;
  onViewStargazingTimes?: (zoneName: string) => void;
  isLoadingRecommendations?: boolean;
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

export const DarkSkyZoneCard: React.FC<DarkSkyZoneCardProps> = ({ zone, rank, userCurrentLocation, onViewStargazingTimes, isLoadingRecommendations }) => {
  const [isLoadingApple, setIsLoadingApple] = useState(false);
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const [hintKey, setHintKey] = useState(0);

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

  const handleToggleExpansion = () => {
    if (isExpanded) {
      // Collapsing: hide hint immediately, then collapse
      setShowHint(false);
      setIsExpanded(false);
      // Show hint after collapse animation completes with new key for animation
      setTimeout(() => {
        setShowHint(true);
        setHintKey(prev => prev + 1);
      }, 300);
    } else {
      // Expanding: hide hint immediately, then expand
      setShowHint(false);
      setIsExpanded(true);
    }
  };

  return (
    <div className="glass-card p-6 hover:bg-white/15 transition-all duration-300 transform hover:scale-[1.02]">
      {/* Always visible header */}
      <div 
        className="cursor-pointer select-none"
        onClick={handleToggleExpansion}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <div className="w-8 h-8 bg-cosmic-blue rounded-full flex items-center justify-center text-sm font-bold">
              {rank}
            </div>
            <div className={`min-w-0 flex-1 flex flex-col justify-center transition-all duration-300 ${isExpanded ? 'min-h-12' : 'h-12'}`}>
              <h3 className={`text-xl font-bold text-white transition-all duration-300 ${isExpanded ? '' : 'line-clamp-1'}`}>{zone.name}</h3>
              <p className={`text-cosmic-blue text-sm transition-all duration-300 ${isExpanded ? '' : 'line-clamp-1'}`}>{zone.designation_type}</p>
            </div>
          </div>
          <div className="text-right ml-2 flex items-center space-x-2">
            <div className="flex items-center space-x-1 text-star-yellow">
              <MapPin size={16} />
              <span className="text-sm">{zone.distance_miles} mi</span>
            </div>
            {isExpanded ? (
              <ChevronUp size={16} className="text-gray-400 transition-transform duration-200" />
            ) : (
              <ChevronDown size={16} className="text-gray-400 transition-transform duration-200" />
            )}
          </div>
        </div>

        {/* Always visible Bortle scale */}
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
      </div>

      {/* Expandable content */}
      <div className={`animate-expand ${isExpanded ? 'expanded' : ''}`}>
        <div className={`animate-expand-content ${isExpanded ? 'expanded' : ''} space-y-3 pt-3`}>
          <div className="h-auto">
            <p className="text-gray-300 text-sm leading-relaxed">
              {zone.description}
            </p>
          </div>

          <div className="flex items-center space-x-4 text-xs text-gray-400">
            <div className="flex items-center space-x-1">
              <span>📍</span>
              <span>{zone.latitude.toFixed(4)}°, {zone.longitude.toFixed(4)}°</span>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {/* Stargazing Times Button */}
            {onViewStargazingTimes && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewStargazingTimes(zone.name);
                }}
                disabled={isLoadingRecommendations}
                className={`w-full transition-all duration-200 flex items-center justify-center space-x-2 group px-3 py-2 rounded-lg border text-xs font-medium ${
                  isLoadingRecommendations
                    ? 'bg-star-yellow/10 border-star-yellow/30 text-star-yellow/50 cursor-not-allowed'
                    : 'bg-star-yellow/20 hover:bg-star-yellow/30 border-star-yellow/50 text-star-yellow active:scale-95'
                }`}
                style={{ touchAction: 'manipulation' }}
              >
                {isLoadingRecommendations ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Clock size={14} className="group-hover:scale-110 transition-transform" />
                )}
                <span>{isLoadingRecommendations ? 'Loading Times...' : 'View Stargazing Times'}</span>
              </button>
            )}
            
            {/* Maps Buttons */}
            <div className="flex space-x-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenInAppleMaps();
                }}
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
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenInGoogleMaps();
                }}
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

      {/* Fixed height container for hint text to prevent jitter */}
      <div className="h-8 flex items-center justify-center mt-2">
        {!isExpanded && showHint && (
          <div 
            key={hintKey}
            className="text-xs text-gray-500 animate-hint-fade-in"
          >
            Click to expand details
          </div>
        )}
      </div>
    </div>
  );
};
