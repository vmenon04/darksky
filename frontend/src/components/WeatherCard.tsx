import React from 'react';
import { WeatherConditions } from '../types';
import { 
  Cloud, 
  CloudRain, 
  Sun, 
  CloudSnow, 
  Eye, 
  Wind, 
  Droplets, 
  Thermometer,
  Gauge,
  CloudDrizzle
} from 'lucide-react';

interface WeatherCardProps {
  weather: WeatherConditions;
  date?: string;
  compact?: boolean;
}

export const WeatherCard: React.FC<WeatherCardProps> = ({ weather, date, compact = false }) => {
  const getWeatherIcon = (condition: string) => {
    const iconClass = "w-5 h-5";
    switch (condition.toLowerCase()) {
      case 'clear':
        return <Sun className={iconClass} />;
      case 'clouds':
        return <Cloud className={iconClass} />;
      case 'rain':
        return <CloudRain className={iconClass} />;
      case 'drizzle':
        return <CloudDrizzle className={iconClass} />;
      case 'snow':
        return <CloudSnow className={iconClass} />;
      default:
        return <Cloud className={iconClass} />;
    }
  };

  const getWeatherScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const getWeatherScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    if (score >= 20) return 'Poor';
    return 'Very Poor';
  };

  if (compact) {
    return (
      <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            {getWeatherIcon(weather.condition)}
            <span className="text-sm text-gray-300">{weather.condition_description}</span>
          </div>
          <span className="text-lg font-semibold text-white">
            {Math.round(weather.temperature_f)}°F
          </span>
        </div>
        
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>Clouds: {weather.cloud_cover}%</span>
          <span className={`font-semibold ${getWeatherScoreColor(weather.weather_score)}`}>
            {getWeatherScoreLabel(weather.weather_score)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      {date && (
        <div className="text-sm text-gray-400 mb-3 font-medium">
          {new Date(date).toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
          })}
        </div>
      )}
      
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          {getWeatherIcon(weather.condition)}
          <div>
            <div className="text-white font-medium">{weather.condition_description}</div>
            <div className="text-2xl font-bold text-white">
              {Math.round(weather.temperature_f)}°F
            </div>
            <div className="text-sm text-gray-400">
              {Math.round(weather.temperature_c)}°C
            </div>
          </div>
        </div>
        
        <div className="text-right">
          <div className={`text-lg font-bold ${getWeatherScoreColor(weather.weather_score)}`}>
            {Math.round(weather.weather_score)}%
          </div>
          <div className={`text-xs ${getWeatherScoreColor(weather.weather_score)}`}>
            {getWeatherScoreLabel(weather.weather_score)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center space-x-2 text-gray-300">
          <Cloud className="w-4 h-4" />
          <span>Clouds: {weather.cloud_cover}%</span>
        </div>
        
        <div className="flex items-center space-x-2 text-gray-300">
          <Droplets className="w-4 h-4" />
          <span>Humidity: {weather.humidity}%</span>
        </div>
        
        <div className="flex items-center space-x-2 text-gray-300">
          <Eye className="w-4 h-4" />
          <span>Visibility: {weather.visibility_miles.toFixed(1)} mi</span>
        </div>
        
        <div className="flex items-center space-x-2 text-gray-300">
          <Wind className="w-4 h-4" />
          <span>{weather.wind_speed_mph} mph {weather.wind_direction}</span>
        </div>
        
        {weather.precipitation_chance > 0 && (
          <div className="flex items-center space-x-2 text-gray-300 col-span-2">
            <CloudRain className="w-4 h-4" />
            <span>Precipitation: {weather.precipitation_chance}% chance</span>
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-gray-700">
        <div className="text-xs text-gray-400">
          Stargazing Score: Higher values indicate better weather conditions for stargazing
        </div>
      </div>
    </div>
  );
};
