import React, { useState, useMemo } from 'react';
import { LocationInput } from './components/LocationInput';
import { DarkSkyZoneCard } from './components/DarkSkyZoneCard';
import { RecommendationCard } from './components/RecommendationCard';
import { StarsBackground } from './components/StarsBackground';
import { findDarkSkyZones, getStargazingRecommendations, getWeatherForecast } from './api';
import { Location, DarkSkyZone, StargazingRecommendation, WeatherConditions } from './types';
import { Star, Moon, Calendar, MapPin, Github, Coffee, ArrowUpDown, Cloud } from 'lucide-react';

type SortOption = 'distance' | 'bortle' | 'name';
type TabOption = 'zones' | 'recommendations';

function App() {
  const [location, setLocation] = useState<Location | null>(null);
  const [userCurrentLocation, setUserCurrentLocation] = useState<Location | null>(null);
  const [darkSkyZones, setDarkSkyZones] = useState<DarkSkyZone[]>([]);
  const [recommendations, setRecommendations] = useState<StargazingRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabOption>('zones');
  const [sortBy, setSortBy] = useState<SortOption>('distance');
  const [displayLimit, setDisplayLimit] = useState<number>(5);
  const [loadingMore, setLoadingMore] = useState(false);
  const [animationKey, setAnimationKey] = useState<string>('initial');
  const [previousDisplayLimit, setPreviousDisplayLimit] = useState<number>(5);
  const [selectedZoneForRecommendations, setSelectedZoneForRecommendations] = useState<string | null>(null);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [recommendationDays, setRecommendationDays] = useState<number>(7);

  // Sort dark sky zones based on selected criteria and limit display
  const sortedDarkSkyZones = useMemo(() => {
    if (darkSkyZones.length === 0) return [];
    
    const sorted = [...darkSkyZones].sort((a, b) => {
      switch (sortBy) {
        case 'distance':
          return a.distance_miles - b.distance_miles;
        case 'bortle':
          return a.bortle_scale - b.bortle_scale;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });
    
    // Only return the first N zones based on display limit
    return sorted.slice(0, displayLimit);
  }, [darkSkyZones, sortBy, displayLimit]);

  const handleLocationSubmit = async (newLocation: Location, isCurrentLocation?: boolean) => {
    setLocation(newLocation);
    
    // If this is the user's current location, store it separately
    if (isCurrentLocation) {
      setUserCurrentLocation(newLocation);
    }
    
    // Reset display limit for new search
    setDisplayLimit(5);
    setPreviousDisplayLimit(0);
    setAnimationKey(`search-${Date.now()}`);
    setSelectedZoneForRecommendations(null);
    setLoading(true);
    setError(null);

    try {
      const [zonesData, recommendationsData] = await Promise.all([
        findDarkSkyZones(newLocation, 0), // Load ALL available zones (0 = no limit)
        getStargazingRecommendations(newLocation, undefined, recommendationDays)
      ]);

      setDarkSkyZones(zonesData);
      setRecommendations(recommendationsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = async () => {
    setLoadingMore(true);
    setPreviousDisplayLimit(displayLimit);
    // Simulate a small delay for better UX
    setTimeout(() => {
      setDisplayLimit(prev => prev + 5);
      setLoadingMore(false);
    }, 300);
  };

  const handleZoneSelectionForRecommendations = async (zoneName: string | null) => {
    if (!location) return;
    
    setSelectedZoneForRecommendations(zoneName);
    setLoadingRecommendations(true);
    
    try {
      const recommendationsData = await getStargazingRecommendations(location, zoneName || undefined, recommendationDays);
      setRecommendations(recommendationsData);
      setActiveTab('recommendations'); // Switch to recommendations tab AFTER data is loaded
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred loading recommendations');
    } finally {
      setLoadingRecommendations(false);
    }
  };

  return (
    <div className="min-h-screen bg-starry-night text-white relative">
      <StarsBackground />
      
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <Star className="text-cosmic-blue animate-float" size={48} />
              <h1 className="text-5xl font-bold cosmic-gradient bg-clip-text text-transparent leading-tight py-2">
                Stargazr
              </h1>
            </div>
            <p className="text-gray-300 text-lg max-w-2xl mx-auto">
              Discover the closest International Dark-Sky Association certified zones and 
              find the perfect time for your next stargazing adventure.
            </p>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1">
          <main className={`container mx-auto px-4 ${!location && !loading && !error && darkSkyZones.length === 0 && recommendations.length === 0 ? 'mb-2' : ''}`}>
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
                  <span>Best Stargazing Times</span>
                </button>
              </div>

              {activeTab === 'zones' && darkSkyZones.length > 0 && (
                <div className="animate-fade-in">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-2">
                      <Star className="text-star-yellow" size={24} />
                      <h2 className="text-2xl font-bold">Dark Sky Zones</h2>
                      <span className="text-sm text-gray-400 bg-white/10 px-2 py-1 rounded-full">
                        Showing {sortedDarkSkyZones.length} of {darkSkyZones.length}
                      </span>
                    </div>
                    
                    {/* Sort Dropdown */}
                    <div className="flex items-center space-x-2">
                      <ArrowUpDown className="text-gray-400" size={16} />
                      <select
                        value={sortBy}
                        onChange={(e) => {
                          setSortBy(e.target.value as SortOption);
                          setDisplayLimit(5); // Reset to show top 5 when sort changes
                          setPreviousDisplayLimit(0);
                          setAnimationKey(`sort-${Date.now()}`);
                        }}
                        className="bg-white/10 border border-white/20 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cosmic-blue focus:border-transparent backdrop-blur-sm min-w-[160px]"
                      >
                        <option value="distance" className="bg-gray-800">Distance (nearest)</option>
                        <option value="bortle" className="bg-gray-800">Sky Quality (darkest)</option>
                        <option value="name" className="bg-gray-800">Name (A-Z)</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {sortedDarkSkyZones.map((zone, index) => {
                      const isNewCard = index >= previousDisplayLimit;
                      const shouldAnimate = previousDisplayLimit === 0 || isNewCard;
                      
                      return (
                        <div
                          key={zone.name}
                          className={shouldAnimate ? "animate-fade-in-up" : ""}
                          style={shouldAnimate ? {
                            animationDelay: `${(previousDisplayLimit === 0 ? index : index - previousDisplayLimit) * 100}ms`,
                            animationFillMode: 'both'
                          } : {}}
                        >
                        <DarkSkyZoneCard
                          key={animationKey.startsWith('sort-') ? `${zone.name}-${animationKey}` : zone.name}
                          zone={zone}
                          rank={index + 1}
                          userCurrentLocation={userCurrentLocation}
                          onViewStargazingTimes={handleZoneSelectionForRecommendations}
                          isLoadingRecommendations={loadingRecommendations}
                        />
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Show More Button - only show if there are more zones to display */}
                  {displayLimit < darkSkyZones.length && (
                    <div className="mt-8 text-center">
                      <button
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                        className="glass-card px-6 py-3 hover:bg-white/15 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loadingMore ? (
                          <div className="flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cosmic-blue"></div>
                            <span>Loading more zones...</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <Star className="text-star-yellow" size={16} />
                            <span>Show More Zones</span>
                          </div>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'recommendations' && recommendations.length > 0 && (
                <div className="animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                    <div className="flex items-center space-x-2">
                      <Moon className="text-star-yellow" size={24} />
                      <h2 className="text-2xl font-bold">Best Stargazing Times</h2>
                    </div>
                    
                    {/* Days Selector */}
                    <div className="flex items-center space-x-2">
                      <label htmlFor="days-selector" className="text-sm text-gray-300 whitespace-nowrap">
                        Days ahead:
                      </label>
                      <select
                        id="days-selector"
                        value={recommendationDays}
                        onChange={async (e) => {
                          const newDays = parseInt(e.target.value);
                          setRecommendationDays(newDays);
                          // Reload recommendations with new days count
                          if (location) {
                            setLoadingRecommendations(true);
                            
                            // Add a small delay for smoother transition
                            await new Promise(resolve => setTimeout(resolve, 150));
                            
                            try {
                              const recommendationsData = await getStargazingRecommendations(
                                location, 
                                selectedZoneForRecommendations || undefined, 
                                newDays
                              );
                              setRecommendations(recommendationsData);
                            } catch (err) {
                              setError(err instanceof Error ? err.message : 'An error occurred loading recommendations');
                            } finally {
                              setLoadingRecommendations(false);
                            }
                          }
                        }}
                        className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cosmic-blue focus:border-transparent hover:bg-white/15 transition-colors cursor-pointer min-w-[100px]"
                      >
                        <option value={3}>3 days</option>
                        <option value={5}>5 days</option>
                        <option value={7}>7 days</option>
                        <option value={10}>10 days</option>
                        <option value={14}>14 days</option>
                      </select>
                    </div>
                  </div>
                  
                  {loadingRecommendations ? (
                    <div className="text-center py-12">
                      <div className="inline-flex items-center space-x-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cosmic-blue"></div>
                        <p className="text-lg text-gray-300">
                          Loading stargazing recommendations...
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Zone Info */}
                      {recommendations.length > 0 && recommendations[0].conditions.bortle_scale_source && (
                        <div className="glass-card p-4 mb-6 border-cosmic-blue/30">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 text-sm text-gray-300">
                              <MapPin size={16} className="text-cosmic-blue" />
                              <span>Calculations based on: {recommendations[0].conditions.bortle_scale_source}</span>
                              <span className="text-cosmic-blue">
                                (Bortle {recommendations[0].conditions.bortle_scale})
                              </span>
                            </div>
                            {selectedZoneForRecommendations && (
                              <button
                                onClick={() => setActiveTab('zones')}
                                className="text-xs text-cosmic-blue hover:text-white transition-colors flex items-center space-x-1"
                              >
                                <ArrowUpDown size={12} />
                                <span>View All Zones</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {recommendations.map((recommendation, index) => (
                          <div
                            key={`${recommendation.date}-${selectedZoneForRecommendations || 'default'}`}
                            className="animate-fade-in-up"
                            style={{
                              animationDelay: `${index * 150}ms`,
                              animationFillMode: 'both'
                            }}
                          >
                            <RecommendationCard
                              recommendation={recommendation}
                              isTopRecommendation={index === 0}
                            />
                          </div>
                        ))}
                      </div>
                    </>
                  )}
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
        </div>

        {/* Footer */}
        <footer className="border-t border-white/10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex flex-col md:flex-row items-center justify-between space-y-2 md:space-y-0">
              <div className="flex items-center space-x-2">
                <Star className="text-cosmic-blue" size={20} />
                <span className="text-gray-300">Stargazr</span>
              </div>
              <div className="flex items-center space-x-6 text-sm text-gray-400">
                <a
                  href="https://coff.ee/vmenon"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1 hover:text-yellow-400 transition-colors"
                >
                  <Coffee size={16} />
                  <span>Buy Me a Coffee</span>
                </a>
                <a
                  href="https://github.com/vmenon04/darksky"
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
