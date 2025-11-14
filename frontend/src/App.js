import React, { useState, useEffect } from 'react';
import './App.css';
import MapView from './components/MapView';
import FileUpload from './components/FileUpload';
import Filters from './components/Filters';
import TrajectoryHistory from './components/TrajectoryHistory';
import { api } from './services/api';

function App() {
  const [trajectories, setTrajectories] = useState([]);
  const [targets, setTargets] = useState([]);
  const [selectedTarget, setSelectedTarget] = useState('');
  const [startDate, setStartDate] = useState('');
  const [hour, setHour] = useState(null);
  const [productFilter, setProductFilter] = useState(null);
  const [showLines, setShowLines] = useState(true);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedPointId, setSelectedPointId] = useState(null);
  const [filtersVisible, setFiltersVisible] = useState(true);

  // Fetch targets on mount
  useEffect(() => {
    fetchTargets();
    fetchStats();
  }, []);

  // Fetch trajectories when filters change (only if both are set)
  useEffect(() => {
    if (selectedTarget && startDate) {
      fetchTrajectories();
    } else {
      setTrajectories([]);
    }
  }, [selectedTarget, startDate, hour, productFilter]);

  const fetchTargets = async () => {
    try {
      const response = await api.getTargets();
      setTargets(response.data.targets);
    } catch (error) {
      console.error('Error fetching targets:', error);
    }
  };

  const fetchTrajectories = async () => {
    if (!selectedTarget || !startDate) {
      setTrajectories([]);
      return;
    }

    setLoading(true);
    try {
      const response = await api.getTrajectories(selectedTarget, startDate, hour, productFilter);
      setTrajectories(response.data.trajectories);
    } catch (error) {
      console.error('Error fetching trajectories:', error);
      setTrajectories([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleUploadSuccess = () => {
    fetchTargets();
    fetchTrajectories();
    fetchStats();
  };

  const handleClearData = async () => {
    if (window.confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      try {
        await api.clearData();
        setTrajectories([]);
        setTargets([]);
        setSelectedTarget('');
        fetchStats();
        alert('All data cleared successfully');
      } catch (error) {
        console.error('Error clearing data:', error);
        alert('Error clearing data');
      }
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-title">
          <h1>root</h1>
          <p className="header-subtitle">Real-time Observation & Orientation Tracker</p>
        </div>
        {stats && (
          <div className="stats">
            <span>Points: {stats.total_points}</span>
            <span>Targets: {stats.total_targets}</span>
          </div>
        )}
      </header>
      
      <div className="App-content">
        <aside className="App-sidebar">
          <FileUpload onUploadSuccess={handleUploadSuccess} />
          
          <div className="filters-section">
            <button 
              className="toggle-filters-btn"
              onClick={() => setFiltersVisible(!filtersVisible)}
            >
              {filtersVisible ? '▼' : '▶'} Filters
            </button>
            {filtersVisible && (
              <Filters
                targets={targets}
                selectedTarget={selectedTarget}
                startDate={startDate}
                hour={hour}
                productFilter={productFilter}
                showLines={showLines}
                onTargetChange={setSelectedTarget}
                onStartDateChange={setStartDate}
                onHourChange={setHour}
                onProductFilterChange={setProductFilter}
                onShowLinesChange={setShowLines}
              />
            )}
          </div>

          <div className="actions">
            <button 
              onClick={handleClearData}
              className="btn btn-danger"
            >
              Clear All Data
            </button>
          </div>
        </aside>

        <main className="App-main">
          <div className="map-container">
            {loading ? (
              <div className="loading">Loading trajectories...</div>
            ) : (
              <MapView 
                trajectories={trajectories}
                showLines={showLines}
                onLocationSelect={(location, pointId) => {
                  setSelectedLocation(location);
                  setSelectedPointId(pointId);
                }}
                selectedLocation={selectedLocation}
                selectedPointId={selectedPointId}
                highlightedPoint={selectedLocation ? trajectories.flatMap(t => t.points).find(p => {
                  if (!selectedLocation) return false;
                  const tolerance = 0.000001;
                  return Math.abs(p.latitude - selectedLocation.latitude) < tolerance &&
                         Math.abs(p.longitude - selectedLocation.longitude) < tolerance;
                }) : null}
              />
            )}
          </div>
          <div className="history-sidebar">
                <TrajectoryHistory
                  trajectories={trajectories}
                  selectedLocation={selectedLocation}
                  selectedPointId={selectedPointId}
                  onPointClick={(point) => {
                    // Highlight point in map
                    setSelectedLocation({
                      latitude: point.latitude,
                      longitude: point.longitude
                    });
                    setSelectedPointId(point.id);
                  }}
                />
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;

