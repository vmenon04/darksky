import React, { useState } from 'react';
import { MapPin, Loader, AlertCircle } from 'lucide-react';
import { Location } from '../types';
import { getCurrentLocation } from '../api';

interface LocationInputProps {
  onLocationSubmit: (location: Location, isCurrentLocation?: boolean) => void;
  loading?: boolean;
}

export const LocationInput: React.FC<LocationInputProps> = ({ onLocationSubmit, loading = false }) => {
  const [zipcode, setZipcode] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [error, setError] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);

  const geocodeZipcode = async (zipcode: string): Promise<{ lat: number; lng: number; name: string } | null> => {
    try {
      // Using Nominatim to geocode US zipcodes
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(zipcode)}&countrycodes=us&limit=1&addressdetails=1`
      );
      const data = await response.json();
      if (data.length > 0) {
        const result = data[0];
        return {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
          name: result.display_name || zipcode
        };
      }
      return null;
    } catch (err) {
      console.error('Geocoding error:', err);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // If we have manual lat/lng coordinates, use those
    if (latitude && longitude) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);

      if (isNaN(lat) || isNaN(lng)) {
        setError('Please enter valid latitude and longitude values');
        return;
      }

      if (lat < -90 || lat > 90) {
        setError('Latitude must be between -90 and 90');
        return;
      }

      if (lng < -180 || lng > 180) {
        setError('Longitude must be between -180 and 180');
        return;
      }

      onLocationSubmit({
        latitude: lat,
        longitude: lng,
        name: `${lat.toFixed(4)}, ${lng.toFixed(4)}`
      }, false);
    } 
    // If we have a zipcode, geocode it
    else if (zipcode.trim()) {
      // Basic zipcode validation (US format)
      const zipcodeRegex = /^\d{5}(-\d{4})?$/;
      if (!zipcodeRegex.test(zipcode.trim())) {
        setError('Please enter a valid US zipcode (e.g., 12345 or 12345-6789)');
        return;
      }

      setIsGeocoding(true);
      try {
        const coords = await geocodeZipcode(zipcode.trim());
        if (coords) {
          onLocationSubmit({
            latitude: coords.lat,
            longitude: coords.lng,
            name: coords.name
          }, false);
        } else {
          setError('Could not find coordinates for this zipcode. Please try a different zipcode or use manual coordinates.');
        }
      } catch (err) {
        setError('Error finding location. Please try again.');
      } finally {
        setIsGeocoding(false);
      }
    } else {
      setError('Please enter a zipcode or coordinates');
    }
  };

  const handleGetCurrentLocation = async () => {
    setGettingLocation(true);
    setError('');

    try {
      const location = await getCurrentLocation();
      setLatitude(location.latitude.toString());
      setLongitude(location.longitude.toString());
      // Clear zipcode when using current location
      setZipcode('');
      
      // Immediately submit the current location
      onLocationSubmit(location, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get current location');
    } finally {
      setGettingLocation(false);
    }
  };

  return (
    <div className="glass-card p-6 mb-8">
      <div className="flex items-center space-x-2 mb-6">
        <MapPin className="text-cosmic-blue" size={24} />
        <h2 className="text-2xl font-bold text-white">Enter Your Location</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Zipcode Input */}
        <div>
          <label htmlFor="zipcode" className="block text-sm font-medium text-gray-300 mb-2">
            Zipcode
          </label> 
          <div className="relative">
            <input
              type="text"
              id="zipcode"
              value={zipcode}
              onChange={(e) => setZipcode(e.target.value)}
              placeholder="e.g., 90210 or 10001"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cosmic-blue focus:border-transparent"
              disabled={loading || gettingLocation || isGeocoding}
              autoComplete="postal-code"
              maxLength={10}
            />
            {isGeocoding && (
              <Loader className="absolute right-4 top-1/2 transform -translate-y-1/2 animate-spin text-cosmic-blue" size={18} />
            )}
          </div>
        </div>

        {/* Manual Coordinates Toggle */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => setShowManualInput(!showManualInput)}
            className="text-sm text-cosmic-blue hover:text-blue-300 transition-colors"
          >
            {showManualInput ? 'Hide manual coordinates' : 'Or enter coordinates manually'}
          </button>
        </div>

        {/* Manual Coordinate Inputs */}
        {showManualInput && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-white/5 rounded-lg border border-white/10">
            <div>
              <label htmlFor="latitude" className="block text-sm font-medium text-gray-300 mb-2">
                Latitude
              </label>
              <input
                type="number"
                id="latitude"
                value={latitude}
                onChange={(e) => {
                  setLatitude(e.target.value);
                  // Clear zipcode when entering manual coordinates
                  if (e.target.value) setZipcode('');
                }}
                placeholder="e.g., 37.7749"
                step="any"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cosmic-blue focus:border-transparent"
                disabled={loading || gettingLocation || isGeocoding}
              />
            </div>
            <div>
              <label htmlFor="longitude" className="block text-sm font-medium text-gray-300 mb-2">
                Longitude
              </label>
              <input
                type="number"
                id="longitude"
                value={longitude}
                onChange={(e) => {
                  setLongitude(e.target.value);
                  // Clear zipcode when entering manual coordinates
                  if (e.target.value) setZipcode('');
                }}
                placeholder="e.g., -122.4194"
                step="any"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cosmic-blue focus:border-transparent"
                disabled={loading || gettingLocation || isGeocoding}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center space-x-2 text-red-400 text-sm">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
          <button
            type="button"
            onClick={handleGetCurrentLocation}
            disabled={loading || gettingLocation || isGeocoding}
            className="flex items-center justify-center space-x-2 px-6 py-3 bg-nebula-purple/20 hover:bg-nebula-purple/30 border border-nebula-purple/50 text-white rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {gettingLocation ? (
              <Loader className="animate-spin" size={20} />
            ) : (
              <MapPin size={20} />
            )}
            <span>Use Current Location</span>
          </button>

          <button
            type="submit"
            disabled={loading || gettingLocation || isGeocoding || (!zipcode.trim() && (!latitude || !longitude))}
            className="flex items-center justify-center space-x-2 px-6 py-3 cosmic-gradient hover:opacity-90 text-white rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex-1"
          >
            {loading || isGeocoding ? (
              <Loader className="animate-spin" size={20} />
            ) : (
              <span>🔍</span>
            )}
            <span>Find Dark Sky Zones</span>
          </button>
        </div>
      </form>
    </div>
  );
};
