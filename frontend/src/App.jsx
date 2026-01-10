import React, { useState, useEffect, useCallback } from 'react';
import ShopCard from './components/ShopCard';
import Filters from './components/Filters';

const API_BASE = '/api/pastries';

function App() {
  const [shops, setShops] = useState([]);
  const [filters, setFilters] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedPastryType, setSelectedPastryType] = useState('croissant');
  const [selectedBorough, setSelectedBorough] = useState('');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  // Fetch filter options on mount
  useEffect(() => {
    fetchFilters();
  }, []);

  const fetchFilters = async () => {
    try {
      const response = await fetch(`${API_BASE}/filters`);
      const data = await response.json();
      if (data.success) {
        setFilters(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch filters:', err);
    }
  };

  const searchShops = useCallback(async () => {
    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const params = new URLSearchParams({
        pastryType: selectedPastryType
      });

      // Use neighborhood if selected, otherwise use borough
      const location = selectedNeighborhood || selectedBorough;
      if (location) {
        params.append('location', location);
      }

      const response = await fetch(`${API_BASE}/search?${params}`);
      const data = await response.json();

      if (data.success) {
        setShops(data.data);
      } else {
        throw new Error(data.error || 'Failed to fetch shops');
      }
    } catch (err) {
      setError(err.message);
      setShops([]);
    } finally {
      setLoading(false);
    }
  }, [selectedPastryType, selectedBorough, selectedNeighborhood]);

  // Auto-search on first load
  useEffect(() => {
    if (!hasSearched) {
      searchShops();
    }
  }, []);

  const handleBoroughChange = (borough) => {
    setSelectedBorough(borough);
    setSelectedNeighborhood(''); // Reset neighborhood when borough changes
  };

  const getNeighborhoodsForBorough = () => {
    if (!filters || !selectedBorough) return [];
    return filters.neighborhoods[selectedBorough.toLowerCase()] || [];
  };

  return (
    <div className="app">
      <header className="header">
        <div className="croissant-icon">🥐</div>
        <h1>NYC Pastry Finder</h1>
        <p className="subtitle">
          Discover the best croissants in New York City, ranked by cumulative ratings
          from Google Maps, Yelp, and more.
        </p>
      </header>

      <Filters
        filters={filters}
        selectedPastryType={selectedPastryType}
        selectedBorough={selectedBorough}
        selectedNeighborhood={selectedNeighborhood}
        neighborhoods={getNeighborhoodsForBorough()}
        onPastryTypeChange={setSelectedPastryType}
        onBoroughChange={handleBoroughChange}
        onNeighborhoodChange={setSelectedNeighborhood}
        onSearch={searchShops}
        loading={loading}
      />

      <main className="results">
        {loading && (
          <div className="loading">
            <div className="loading-spinner"></div>
            <p className="loading-text">Finding the best pastries...</p>
          </div>
        )}

        {error && (
          <div className="error">
            <div className="error-icon">😢</div>
            <p className="error-message">{error}</p>
            <button className="retry-btn" onClick={searchShops}>
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && shops.length === 0 && hasSearched && (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <h3 className="empty-title">No pastry shops found</h3>
            <p className="empty-text">
              Try adjusting your filters or searching a different area.
            </p>
          </div>
        )}

        {!loading && !error && shops.length > 0 && (
          <>
            <div className="results-header">
              <span className="results-count">
                Found {shops.length} pastry shop{shops.length !== 1 ? 's' : ''}
              </span>
            </div>

            {shops.map((shop) => (
              <ShopCard key={shop.name} shop={shop} />
            ))}
          </>
        )}
      </main>

      <footer className="footer">
        <p>
          Data aggregated from Google Maps and Yelp.
          Ratings are weighted by review count.
        </p>
        <p style={{ marginTop: '8px' }}>
          Made with ❤️ for pastry lovers in NYC
        </p>
      </footer>
    </div>
  );
}

export default App;
