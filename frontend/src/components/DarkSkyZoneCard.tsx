import React, { useState } from 'react';
import { MapPin, Clock, Moon, Star, Eye, Navigation, Loader2 } from 'lucide-react';
import { DarkSkyZone } from '../types';

interface DarkSkyZoneCardProps {
  zone: DarkSkyZone;
  rank: number;
}

// Utility function to detect mobile devices
const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
         (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
};

// Utility function to get user location with mobile-optimized settings
const getUserLocation = (): Promise<GeolocationPosition> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    const options: PositionOptions = {
      timeout: isMobileDevice() ? 30000 : 15000, // Longer timeout for mobile
      enableHighAccuracy: false, // Use network location for faster response
      maximumAge: 300000 // Cache location for 5 minutes
    };

    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
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
  return descriptions[scale as keyof typeof descriptions] || 'Unknown';
};

const getBortleColor = (scale: number): string => {
  if (scale <= 2) return 'text-green-400';
  if (scale <= 4) return 'text-yellow-400';
  if (scale <= 6) return 'text-orange-400';
  return 'text-red-400';
};

export const DarkSkyZoneCard: React.FC<DarkSkyZoneCardProps> = ({ zone, rank }) => {
  const [isLoadingApple, setIsLoadingApple] = useState(false);
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const handleOpenInAppleMaps = async () => {
    setIsLoadingApple(true);
    setLocationError(null);
    
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported, opening destination only');
      const mapsUrl = `https://maps.apple.com/?daddr=${zone.latitude},${zone.longitude}`;
      window.open(mapsUrl, '_blank');
      setIsLoadingApple(false);
      return;
    }

    try {
      // Request location with mobile-friendly options
      const position = await getUserLocation();

      const { latitude: userLat, longitude: userLng } = position.coords;
      const mapsUrl = `https://maps.apple.com/?saddr=${userLat},${userLng}&daddr=${zone.latitude},${zone.longitude}&dirflg=d`;
      window.open(mapsUrl, '_blank');
      
    } catch (error) {
      console.warn('Location access denied or failed:', error);
      
      // Provide user feedback about location issues
      if (error instanceof GeolocationPositionError) {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError('Location access denied. Opening destination only.');
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError('Location unavailable. Opening destination only.');
            break;
          case error.TIMEOUT:
            setLocationError('Location request timed out. Opening destination only.');
            break;
        }
      }
      
      // Fallback to destination only
      const mapsUrl = `https://maps.apple.com/?daddr=${zone.latitude},${zone.longitude}`;
      window.open(mapsUrl, '_blank');
    } finally {
      setIsLoadingApple(false);
    }
    
    // Clear error after 3 seconds
    if (locationError) {
      setTimeout(() => setLocationError(null), 3000);
    }
  };

  const handleOpenInGoogleMaps = async () => {
    setIsLoadingGoogle(true);
    setLocationError(null);
    
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported, opening destination only');
      const mapsUrl = `https://www.google.com/maps/place/${zone.latitude},${zone.longitude}`;
      window.open(mapsUrl, '_blank');
      setIsLoadingGoogle(false);
      return;
    }

    try {
      // Request location with mobile-friendly options
      const position = await getUserLocation();

      const { latitude: userLat, longitude: userLng } = position.coords;
      const mapsUrl = `https://www.google.com/maps/dir/${userLat},${userLng}/${zone.latitude},${zone.longitude}`;
      window.open(mapsUrl, '_blank');
      
    } catch (error) {
      console.warn('Location access denied or failed:', error);
      
      // Provide user feedback about location issues
      if (error instanceof GeolocationPositionError) {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError('Location access denied. Opening destination only.');
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError('Location unavailable. Opening destination only.');
            break;
          case error.TIMEOUT:
            setLocationError('Location request timed out. Opening destination only.');
            break;
        }
      }
      
      // Fallback to destination only
      const mapsUrl = `https://www.google.com/maps/place/${zone.latitude},${zone.longitude}`;
      window.open(mapsUrl, '_blank');
    } finally {
      setIsLoadingGoogle(false);
    }
    
    // Clear error after 3 seconds
    if (locationError) {
      setTimeout(() => setLocationError(null), 3000);
    }
  };
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
          {locationError && (
            <div className="w-full mb-2 p-2 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
              <p className="text-yellow-300 text-xs text-center">{locationError}</p>
            </div>
          )}
          
          <div className="flex space-x-2">
            <button
              onClick={handleOpenInAppleMaps}
              disabled={isLoadingApple}
              className={`flex-1 transition-all duration-200 flex items-center justify-center space-x-2 group px-3 py-2 rounded-lg border text-xs font-medium ${
                isLoadingApple 
                  ? 'bg-cosmic-blue/10 border-cosmic-blue/30 text-cosmic-blue/50 cursor-not-allowed' 
                  : 'bg-cosmic-blue/20 hover:bg-cosmic-blue/30 border-cosmic-blue/50 text-cosmic-blue active:scale-95'
              }`}
              style={{ touchAction: 'manipulation' }} // Improve touch responsiveness
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
              style={{ touchAction: 'manipulation' }} // Improve touch responsiveness
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
