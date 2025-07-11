import React, { useState } from 'react';
import { MapPin, Loader, AlertCircle } from 'lucide-react';
import { Location } from '../types';
import { getCurrentLocation } from '../api';

interface LocationInputProps {
  onLocationSubmit: (location: Location) => void;
  loading?: boolean;
}

export const LocationInput: React.FC<LocationInputProps> = ({ onLocationSubmit, loading = false }) => {
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [locationName, setLocationName] = useState('');
  const [error, setError] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

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
      name: locationName || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    });
  };

  const handleGetCurrentLocation = async () => {
    setGettingLocation(true);
    setError('');

    try {
      const location = await getCurrentLocation();
      setLatitude(location.latitude.toString());
      setLongitude(location.longitude.toString());
      setLocationName(location.name || 'Current Location');
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="latitude" className="block text-sm font-medium text-gray-300 mb-2">
              Latitude
            </label>
            <input
              type="number"
              id="latitude"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              placeholder="e.g., 37.7749"
              step="any"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cosmic-blue focus:border-transparent"
              required
              disabled={loading || gettingLocation}
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
              onChange={(e) => setLongitude(e.target.value)}
              placeholder="e.g., -122.4194"
              step="any"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cosmic-blue focus:border-transparent"
              required
              disabled={loading || gettingLocation}
            />
          </div>
        </div>

        <div>
          <label htmlFor="locationName" className="block text-sm font-medium text-gray-300 mb-2">
            Location Name (Optional)
          </label>
          <input
            type="text"
            id="locationName"
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            placeholder="e.g., San Francisco, CA"
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cosmic-blue focus:border-transparent"
            disabled={loading || gettingLocation}
          />
        </div>

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
            disabled={loading || gettingLocation}
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
            disabled={loading || gettingLocation || !latitude || !longitude}
            className="flex items-center justify-center space-x-2 px-6 py-3 cosmic-gradient hover:opacity-90 text-white rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex-1"
          >
            {loading ? (
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
