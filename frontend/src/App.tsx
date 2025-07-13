import React, { useState } from 'react';
import { LocationInput } from './components/LocationInput';
import { DarkSkyZoneCard } from './components/DarkSkyZoneCard';
import { RecommendationCard } from './components/RecommendationCard';
import { StarsBackground } from './components/StarsBackground';
import { findDarkSkyZones, getStargazingRecommendations } from './api';
import { Location, DarkSkyZone, StargazingRecommendation } from './types';
import { Search, Moon, Star, Calendar, MapPin, Github } from 'lucide-react';

function App() {
  const [location, setLocation] = useState<Location | null>(null);
  const [darkSkyZones, setDarkSkyZones] = useState<DarkSkyZone[]>([]);
  const [recommendations, setRecommendations] = useState<StargazingRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'zones' | 'recommendations'>('zones');

  const handleLocationSubmit = async (newLocation: Location) => {
    setLocation(newLocation);
    setLoading(true);
    setError(null);

    try {
      const [zonesData, recommendationsData] = await Promise.all([
        findDarkSkyZones(newLocation),
        getStargazingRecommendations(newLocation)
      ]);

      setDarkSkyZones(zonesData);
      setRecommendations(recommendationsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-starry-night text-white relative">
      <StarsBackground />
      
      <div className="relative z-10">
        {/* Header */}
        <header className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <Search className="text-cosmic-blue animate-float" size={48} />
              <h1 className="text-5xl font-bold cosmic-gradient bg-clip-text text-transparent">
                Dark Sky Zone Finder
              </h1>
            </div>
            <p className="text-gray-300 text-lg max-w-2xl mx-auto">
              Discover the closest International Dark-Sky Association certified zones and 
              find the perfect time for your next stargazing adventure.
            </p>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 pb-12">
          <LocationInput onLocationSubmit={handleLocationSubmit} loading={loading} />

          {error && (
            <div className="glass-card p-6 mb-8 border-red-500/50 bg-red-500/10">
              <div className="flex items-center space-x-2">
                <div className="text-red-400">⚠️</div>
                <p className="text-red-300">{error}</p>
              </div>
            </div>
          )}

          {location && (
            <div className="glass-card p-6 mb-8">
              <div className="flex items-center space-x-2 mb-4">
                <MapPin className="text-cosmic-blue" size={20} />
                <h3 className="text-lg font-semibold">Search Location</h3>
              </div>
              <p className="text-gray-300">
                {location.name} ({location.latitude.toFixed(4)}, {location.longitude.toFixed(4)})
              </p>
            </div>
          )}

          {(darkSkyZones.length > 0 || recommendations.length > 0) && (
            <div className="mb-8">
              <div className="flex flex-wrap space-x-1 space-y-1 sm:space-y-0 glass-card p-1 mb-6 rounded-lg">
                <button
                  onClick={() => setActiveTab('zones')}
                  className={`px-4 sm:px-6 py-3 rounded-md transition-all duration-300 flex items-center space-x-2 text-sm ${
                    activeTab === 'zones'
                      ? 'bg-cosmic-blue text-white'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  <MapPin size={16} />
                  <span>Dark Sky Zones</span>
                </button>
                <button
                  onClick={() => setActiveTab('recommendations')}
                  className={`px-4 sm:px-6 py-3 rounded-md transition-all duration-300 flex items-center space-x-2 text-sm ${
                    activeTab === 'recommendations'
                      ? 'bg-cosmic-blue text-white'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  <Calendar size={16} />
                  <span>Stargazing Times</span>
                </button>
              </div>

              {activeTab === 'zones' && darkSkyZones.length > 0 && (
                <div>
                  <div className="flex items-center space-x-2 mb-6">
                    <Star className="text-star-yellow" size={24} />
                    <h2 className="text-2xl font-bold">Closest Dark Sky Zones</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {darkSkyZones.map((zone, index) => (
                      <DarkSkyZoneCard
                        key={zone.name}
                        zone={zone}
                        rank={index + 1}
                      />
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'recommendations' && recommendations.length > 0 && (
                <div>
                  <div className="flex items-center space-x-2 mb-6">
                    <Moon className="text-star-yellow" size={24} />
                    <h2 className="text-2xl font-bold">Best Stargazing Times</h2>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {recommendations.map((recommendation, index) => (
                      <RecommendationCard
                        key={recommendation.date}
                        recommendation={recommendation}
                        isTopRecommendation={index === 0}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {loading && (
            <div className="text-center py-12">
              <div className="inline-flex items-center space-x-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cosmic-blue"></div>
                <p className="text-lg text-gray-300">
                  Calculating optimal stargazing conditions...
                </p>
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-white/10 py-8">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
              <div className="flex items-center space-x-2">
                <Search className="text-cosmic-blue" size={20} />
                <span className="text-gray-300">Dark Sky Zone Finder</span>
              </div>
              <div className="flex items-center space-x-6 text-sm text-gray-400">
                <span>Data from International Dark-Sky Association</span>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1 hover:text-white transition-colors"
                >
                  <Github size={16} />
                  <span>Source Code</span>
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
