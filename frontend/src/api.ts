import axios from 'axios';
import { Location, DarkSkyZone, StargazingRecommendation } from './types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const findDarkSkyZones = async (location: Location): Promise<DarkSkyZone[]> => {
  try {
    const response = await api.post('/find-dark-sky-zones', location);
    return response.data.dark_sky_zones;
  } catch (error) {
    console.error('Error finding dark sky zones:', error);
    throw new Error('Failed to find dark sky zones');
  }
};

export const getStargazingRecommendations = async (location: Location): Promise<StargazingRecommendation[]> => {
  try {
    const response = await api.post('/stargazing-recommendations', location);
    return response.data.recommendations;
  } catch (error) {
    console.error('Error getting stargazing recommendations:', error);
    throw new Error('Failed to get stargazing recommendations');
  }
};

export const getCurrentLocation = (): Promise<Location> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          name: 'Current Location'
        });
      },
      (error) => {
        reject(new Error(`Geolocation error: ${error.message}`));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  });
};
