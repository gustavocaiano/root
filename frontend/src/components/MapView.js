import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { api } from '../services/api';
import './MapView.css';

// Helper function to remove .0 from integer strings
const formatInteger = (value) => {
  if (value === null || value === undefined) return value;
  const str = String(value);
  return str.replace(/\.0+$/, '');
};

// Create custom icons - always show count
function createCustomIcon(color, productNumber, isFirst, count, isHighlighted = false) {
  const iconColor = isFirst ? '#66bb6a' : color; // Green for first point
  const size = isHighlighted ? 30 : 25;
  const borderWidth = isHighlighted ? 4 : 2;
  const borderColor = isHighlighted ? '#ffeb3b' : 'white';
  const fontSize = '10px';
  const displayText = count.toString(); // Always show count
  
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${iconColor};
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        border: ${borderWidth}px solid ${borderColor};
        box-shadow: 0 ${isHighlighted ? '4px 8px' : '2px 4px'} rgba(0,0,0,${isHighlighted ? '0.5' : '0.3'});
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: ${fontSize};
        position: relative;
        animation: ${isHighlighted ? 'pulse 1.5s ease-in-out infinite' : 'none'};
      ">
        ${displayText}
      </div>
      <style>
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      </style>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// Component to auto-fit bounds
function MapBounds({ trajectories }) {
  const map = useMap();

  React.useEffect(() => {
    if (trajectories.length > 0) {
      const points = trajectories.flatMap(t => t.points);
      if (points.length > 0) {
        const bounds = L.latLngBounds(
          points.map(p => [p.latitude, p.longitude])
        );
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [trajectories, map]);

  return null;
}

function LocationHistory({ targetNumber, latitude, longitude, onClose, filteredPoints }) {
  const [locationData, setLocationData] = useState(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const fetchLocationHistory = async () => {
      try {
        const response = await api.getLocationHistory(targetNumber, latitude, longitude);
        let data = response.data;
        
        // Filter by filteredPoints if provided
        if (filteredPoints && filteredPoints.length > 0) {
          const filteredIds = new Set(filteredPoints.map(p => p.id));
          data = {
            ...data,
            points: data.points.filter(p => filteredIds.has(p.id)),
            total_triggers: data.points.filter(p => filteredIds.has(p.id)).length
          };
          
          // Recalculate product counts
          const newProductCounts = {};
          data.points.forEach(point => {
            const productKey = point.product_number || '0';
            newProductCounts[productKey] = (newProductCounts[productKey] || 0) + 1;
          });
          data.product_counts = newProductCounts;
        }
        
        setLocationData(data);
      } catch (error) {
        console.error('Error fetching location history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLocationHistory();
  }, [targetNumber, latitude, longitude, filteredPoints]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-PT', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="point-details-modal">
        <div className="point-details-content">
          <button className="close-btn" onClick={onClose}>×</button>
          <div className="loading-history">Loading location history...</div>
        </div>
      </div>
    );
  }

  if (!locationData) {
    return (
      <div className="point-details-modal">
        <div className="point-details-content">
          <button className="close-btn" onClick={onClose}>×</button>
          <h2>Location History</h2>
          <p>No data found for this location.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="point-details-modal">
      <div className="point-details-content">
        <button className="close-btn" onClick={onClose}>×</button>
        
        <h2>Location History</h2>
        
        <div className="point-info">
          <div className="info-row">
            <span className="label">Target Number:</span>
            <span className="value">{formatInteger(locationData.target_number)}</span>
          </div>
          <div className="info-row">
            <span className="label">Coordinates:</span>
            <span className="value">{locationData.latitude.toFixed(6)}, {locationData.longitude.toFixed(6)}</span>
          </div>
          <div className="info-row">
            <span className="label">Total Triggers:</span>
            <span className="value">{locationData.total_triggers}</span>
          </div>
        </div>

        <h3>Products at this Location</h3>
        <div className="product-counts">
          {Object.entries(locationData.product_counts).map(([product, count]) => (
            <div key={product} className="product-count-item">
              <span className="product-label">Product {product === '0' ? '0 (Black)' : formatInteger(product)}:</span>
              <span className="product-count">{count} trigger{count !== 1 ? 's' : ''}</span>
            </div>
          ))}
        </div>

        <h3>All Triggers ({locationData.points.length})</h3>
        
        <div className="history-list">
          {locationData.points.map((point, index) => (
            <div key={point.id} className="history-item">
              <div className="history-index">#{index + 1}</div>
              <div className="history-info">
                <div>{formatDate(point.timestamp)}</div>
                {point.product_number && (
                  <div className="product-number">Product: {formatInteger(point.product_number)}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PointDetails({ point, onClose, onViewLocationHistory, filteredPoints, onLocationSelect }) {
  const [history, setHistory] = useState([]);
  const [locationStops, setLocationStops] = useState([]);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    // Use filtered points if provided, otherwise fetch all
    if (filteredPoints && filteredPoints.length > 0) {
      setHistory(filteredPoints);
      setLoading(false);
    } else {
      setLoading(true);
      const fetchHistory = async () => {
        try {
          const response = await api.getTargetHistory(point.target_number);
          setHistory(response.data.points);
        } catch (error) {
          console.error('Error fetching history:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchHistory();
    }
  }, [point.target_number, filteredPoints]);

  // Get stops at this specific location
  React.useEffect(() => {
    if (!point || !history.length) {
      setLocationStops([]);
      return;
    }

    const tolerance = 0.000001;
    const stops = history.filter(h => 
      Math.abs(h.latitude - point.latitude) < tolerance &&
      Math.abs(h.longitude - point.longitude) < tolerance
    );
    setLocationStops(stops);
  }, [point, history]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-PT', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="point-details-modal">
      <div className="point-details-content">
        <button className="close-btn" onClick={onClose}>×</button>
        
        <h2>Point Information</h2>
        
        <div className="point-info">
          <div className="info-row">
            <span className="label">Target Number:</span>
            <span className="value">{formatInteger(point.target_number)}</span>
          </div>
          {point.product_number && (
            <div className="info-row">
              <span className="label">Product Number:</span>
              <span className="value">{formatInteger(point.product_number)}</span>
            </div>
          )}
          <div className="info-row">
            <span className="label">Timestamp:</span>
            <span className="value">{formatDate(point.timestamp)}</span>
          </div>
          <div className="info-row">
            <span className="label">Latitude:</span>
            <span className="value">{point.latitude.toFixed(6)}</span>
          </div>
          <div className="info-row">
            <span className="label">Longitude:</span>
            <span className="value">{point.longitude.toFixed(6)}</span>
          </div>
        </div>

        <div className="action-buttons">
          <button
            className="btn btn-primary"
            onClick={() => {
              if (onLocationSelect) {
                onLocationSelect({
                  latitude: point.latitude,
                  longitude: point.longitude
                });
              }
              onViewLocationHistory(point);
            }}
          >
            View Location History
          </button>
        </div>

        {/* Two lists side by side */}
        <div className="history-lists-container">
          {/* List 1: Stops at this specific location */}
          {locationStops.length > 0 && (
            <div className="history-list-column">
              <h3>Stops at This Location ({locationStops.length})</h3>
              <div className="history-list">
                {locationStops.map((stop, index) => {
                  const historyIndex = history.findIndex(h => h.id === stop.id);
                  return (
                    <div 
                      key={stop.id} 
                      className={`history-item ${stop.id === point.id ? 'current' : ''}`}
                    >
                      <div className="history-index">#{historyIndex + 1}</div>
                      <div className="history-info">
                        <div>{formatDate(stop.timestamp)}</div>
                        {stop.product_number && stop.product_number !== '0' && (
                          <div className="product-number">Product: {formatInteger(stop.product_number)}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* List 2: Complete trajectory history */}
          <div className="history-list-column">
            <h3>Complete Trajectory History ({history.length} points)</h3>
            
            {loading ? (
              <div className="loading-history">Loading history...</div>
            ) : (
              <div className="history-list">
                {history.map((h, index) => {
                  const isAtLocation = locationStops.some(s => s.id === h.id);
                  return (
                    <div 
                      key={h.id} 
                      className={`history-item ${h.id === point.id ? 'current' : ''} ${isAtLocation ? 'at-location' : ''}`}
                    >
                      <div className="history-index">#{index + 1}</div>
                      <div className="history-info">
                        <div>{formatDate(h.timestamp)}</div>
                        {h.product_number && h.product_number !== '0' && (
                          <div className="product-number">Product: {formatInteger(h.product_number)}</div>
                        )}
                        {isAtLocation && (
                          <div className="location-indicator">📍 At this location</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const MapView = ({ trajectories, showLines, onLocationSelect, selectedLocation, selectedPointId, highlightedPoint }) => {
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [locationHistory, setLocationHistory] = useState(null);
  
  // Get all filtered points for passing to modals
  const allFilteredPoints = trajectories.length > 0 
    ? trajectories.flatMap(t => t.points)
    : [];

  // Generate colors for different targets
  const getColorForTarget = (targetNumber, productNumber) => {
    // If productNumber is 0 or null, use black
    if (!productNumber || productNumber === '0') {
      return '#000000';
    }
    
    // Otherwise use Earth-inspired colors (blues and greens) based on target
    const colors = [
      '#1e88e5', '#43a047', '#1565c0', '#66bb6a',
      '#0d47a1', '#81c784', '#1976d2', '#4caf50'
    ];
    const hash = targetNumber.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    return colors[Math.abs(hash) % colors.length];
  };

  // Group points by exact location
  const groupPointsByLocation = (points) => {
    const tolerance = 0.000001; // ~11cm
    const groups = [];
    const processed = new Set();

    points.forEach((point, index) => {
      if (processed.has(point.id)) return;

      const group = [point];
      processed.add(point.id);

      // Find all points at the same location
      points.forEach((otherPoint, otherIndex) => {
        if (otherIndex <= index || processed.has(otherPoint.id)) return;

        const latDiff = Math.abs(point.latitude - otherPoint.latitude);
        const lngDiff = Math.abs(point.longitude - otherPoint.longitude);

        if (latDiff <= tolerance && lngDiff <= tolerance) {
          group.push(otherPoint);
          processed.add(otherPoint.id);
        }
      });

      // Sort group by timestamp to ensure firstPoint is chronologically first
      group.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      groups.push({
        points: group,
        latitude: point.latitude,
        longitude: point.longitude,
        count: group.length,
        firstPoint: group[0], // This is now guaranteed to be the earliest chronologically
        isFirst: index === 0
      });
    });

    return groups;
  };

  const defaultCenter = [38.7223, -9.1393]; // Lisbon
  const hasData = trajectories.length > 0 && trajectories.some(t => t.points.length > 0);

  return (
    <div className="map-view">
      <MapContainer
        center={defaultCenter}
        zoom={13}
        style={{ width: '100%', height: '100%' }}
      >
            <TileLayer
              attribution='&copy; <a href="https://www.esri.com/">Esri</a> &mdash; Source: Esri, Maxar, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, and the GIS User Community'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />

        {hasData && <MapBounds trajectories={trajectories} />}

        {trajectories.map((trajectory) => {
          if (trajectory.points.length === 0) return null;
          
          const firstPoint = trajectory.points[0];
          const productNumber = firstPoint.product_number;
          const color = getColorForTarget(trajectory.target_number, productNumber);
          
          // Group points by location
          const locationGroups = groupPointsByLocation(trajectory.points);
          
          return (
            <React.Fragment key={trajectory.target_number}>
              {/* Draw lines connecting points */}
              {showLines && trajectory.points.length > 1 && (
                <Polyline
                  positions={trajectory.points.map(p => [p.latitude, p.longitude])}
                  color="#ffff00aa"
                  weight={3}
                  opacity={0.7}
                />
              )}

              {/* Draw markers for grouped locations */}
              {locationGroups.map((group, groupIndex) => {
                const groupProductNumber = group.firstPoint.product_number;
                const groupColor = getColorForTarget(trajectory.target_number, groupProductNumber);
                const isFirst = groupIndex === 0;
                
                // Get unique products in this location
                const uniqueProducts = [...new Set(group.points.map(p => p.product_number || '0'))];
                
                // Check if this group is highlighted
                const isHighlighted = highlightedPoint && (
                  Math.abs(group.latitude - highlightedPoint.latitude) < 0.000001 &&
                  Math.abs(group.longitude - highlightedPoint.longitude) < 0.000001
                );

                return (
                  <Marker
                    key={`group-${group.latitude}-${group.longitude}`}
                    position={[group.latitude, group.longitude]}
                    icon={createCustomIcon(groupColor, groupProductNumber, isFirst, group.count, isHighlighted)}
                    eventHandlers={{
                      click: () => {
                        const location = {
                          latitude: group.latitude,
                          longitude: group.longitude
                        };
                        if (onLocationSelect) {
                          // Find the first point chronologically at this location
                          // Group points are already sorted by timestamp, so firstPoint is the earliest
                          // Pass the first point's ID so we can scroll to the specific point
                          onLocationSelect(location, group.firstPoint.id);
                        }
                      },
                    }}
                  >
                    <Popup>
                      <div className="popup-content">
                        <strong>{formatInteger(trajectory.target_number)}</strong>
                        <br />
                        <strong style={{color: '#e74c3c'}}>{group.count} trigger{group.count !== 1 ? 's' : ''} at this location</strong>
                        {uniqueProducts.length > 0 && (
                          <>
                            <br />
                            <small>Products: {uniqueProducts.map(p => formatInteger(p)).join(', ')}</small>
                          </>
                        )}
                        <br />
                        {new Date(group.firstPoint.timestamp).toLocaleString('pt-PT')}
                        {isFirst && (
                          <>
                            <br />
                            <span style={{color: '#66bb6a'}}>● First point of the day</span>
                          </>
                        )}
                        <br />
                        <button 
                          className="details-btn"
                          onClick={() => {
                            setSelectedPoint(group.firstPoint);
                          }}
                        >
                          View Point Details
                        </button>
                        <br />
                        <button 
                          className="details-btn"
                          onClick={() => {
                            const location = {
                              latitude: group.latitude,
                              longitude: group.longitude
                            };
                            if (onLocationSelect) {
                              onLocationSelect(location, group.firstPoint.id);
                            }
                            setLocationHistory({
                              targetNumber: trajectory.target_number,
                              latitude: group.latitude,
                              longitude: group.longitude
                            });
                          }}
                        >
                          View Location History
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </React.Fragment>
          );
        })}
      </MapContainer>

      {!hasData && (
        <div className="no-data-overlay">
          <div className="no-data-message">
            <h3>No trajectory data</h3>
            <p>Select a target and date to visualize trajectories on the map</p>
          </div>
        </div>
      )}

      {locationHistory && (
        <LocationHistory
          targetNumber={locationHistory.targetNumber}
          latitude={locationHistory.latitude}
          longitude={locationHistory.longitude}
          filteredPoints={allFilteredPoints}
          onClose={() => setLocationHistory(null)}
        />
      )}

      {selectedPoint && !locationHistory && (
        <PointDetails
          point={selectedPoint}
          filteredPoints={allFilteredPoints}
          onClose={() => setSelectedPoint(null)}
          onViewLocationHistory={(point) => {
            setSelectedPoint(null);
            setLocationHistory({
              targetNumber: point.target_number,
              latitude: point.latitude,
              longitude: point.longitude
            });
          }}
          onLocationSelect={onLocationSelect}
        />
      )}
    </div>
  );
};

export default MapView;
