import React from 'react';
import './TrajectoryHistory.css';

// Helper function to remove .0 from integer strings
const formatInteger = (value) => {
  if (value === null || value === undefined) return value;
  const str = String(value);
  return str.replace(/\.0+$/, '');
};

const TrajectoryHistory = ({ trajectories, selectedLocation, selectedPointId, onPointClick }) => {
  const [userClickedItem, setUserClickedItem] = React.useState(null);
  
  // Get all points from trajectories
  const allPoints = trajectories.length > 0 
    ? trajectories.flatMap(t => t.points)
    : [];

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

  // Check if a point is at the selected location
  const isAtSelectedLocation = (point) => {
    if (!selectedLocation) return false;
    const tolerance = 0.000001;
    return (
      Math.abs(point.latitude - selectedLocation.latitude) < tolerance &&
      Math.abs(point.longitude - selectedLocation.longitude) < tolerance
    );
  };

  // Check if this is the primary highlighted point
  const isPrimaryHighlighted = (point) => {
    if (!selectedLocation) return false;
    // If we have a specific point ID, that's the primary
    if (selectedPointId) {
      return point.id === selectedPointId;
    }
    // Otherwise, find the first point at this location
    const tolerance = 0.000001;
    const pointsAtLocation = allPoints.filter(p => 
      Math.abs(p.latitude - selectedLocation.latitude) < tolerance &&
      Math.abs(p.longitude - selectedLocation.longitude) < tolerance
    );
    if (pointsAtLocation.length === 0) return false;
    // Sort by timestamp to get the first one
    pointsAtLocation.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    return point.id === pointsAtLocation[0].id;
  };

  // Check if this is a secondary highlighted point (same location but not primary)
  const isSecondaryHighlighted = (point) => {
    if (!selectedLocation) return false;
    // Must be at the location but not the primary
    return isAtSelectedLocation(point) && !isPrimaryHighlighted(point);
  };

  // Scroll to highlighted item when location is selected (only if not from user click)
  React.useEffect(() => {
    // Only scroll if clicking on map (not from history click)
    if (selectedLocation && allPoints.length > 0 && !userClickedItem) {
      // Use setTimeout to ensure DOM is updated
      setTimeout(() => {
        // Find the primary highlighted item and scroll to it
        const primaryItem = document.querySelector('.history-item.highlighted-primary');
        if (primaryItem) {
          primaryItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
    // Reset userClickedItem after scroll
    if (userClickedItem) {
      setTimeout(() => setUserClickedItem(null), 200);
    }
  }, [selectedLocation, selectedPointId, allPoints.length, userClickedItem]);

  if (allPoints.length === 0) {
    return (
      <div className="trajectory-history">
        <h3>Trajectory History</h3>
        <div className="history-empty">
          <p>Select a target and date to view trajectory history</p>
        </div>
      </div>
    );
  }

  return (
    <div className="trajectory-history">
      <h3>Trajectory History</h3>
      <div className="history-stats">
        <span>{allPoints.length} point{allPoints.length !== 1 ? 's' : ''}</span>
        {selectedLocation && (
          <span className="selected-location-indicator">
            {allPoints.filter(p => isAtSelectedLocation(p)).length} at selected location
          </span>
        )}
      </div>
      
      <div className="history-list-container">
        <div className="history-list">
          {allPoints.map((point, index) => {
            const isPrimary = isPrimaryHighlighted(point);
            const isSecondary = isSecondaryHighlighted(point);
            const isFirst = index === 0;
            
            return (
              <div
                key={point.id}
                id={`history-item-${point.id}`}
                className={`history-item ${isPrimary ? 'highlighted-primary' : ''} ${isSecondary ? 'highlighted-secondary' : ''} ${isFirst ? 'first-point' : ''}`}
                onClick={() => {
                  if (onPointClick) {
                    // Mark that user clicked this item (prevents auto-scroll)
                    setUserClickedItem(point.id);
                    onPointClick(point);
                    // Don't scroll - user wants to stay in place
                  }
                }}
                title={`Click to view details`}
              >
                <div className="history-index">#{index + 1}</div>
                <div className="history-info">
                  <div className="history-time">{formatDate(point.timestamp)}</div>
                  {point.product_number && point.product_number !== '0' && (
                    <div className="product-number">Product: {formatInteger(point.product_number)}</div>
                  )}
                  <div className="history-badges">
                    {isFirst && (
                      <span className="badge badge-first">First</span>
                    )}
                    {isPrimary && (
                      <span className="badge badge-selected">📍 Selected</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TrajectoryHistory;

