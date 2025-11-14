import React from 'react';
import './Filters.css';

const Filters = ({
  targets,
  selectedTarget,
  startDate,
  hour,
  productFilter,
  showLines,
  onTargetChange,
  onStartDateChange,
  onHourChange,
  onProductFilterChange,
  onShowLinesChange,
}) => {
  // Generate hours 0-23
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="filters">
      <h3>Filters</h3>
      <p className="filter-note">Select ONE target and ONE date to view trajectories</p>

      <div className="filter-group">
        <label htmlFor="target-select">Target Number *</label>
        <select
          id="target-select"
          value={selectedTarget}
          onChange={(e) => onTargetChange(e.target.value)}
          className="filter-select"
          required
        >
          <option value="">-- Select Target --</option>
          {targets.map((target) => (
            <option key={target} value={target}>
              {target}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="start-date">Date *</label>
        <input
          id="start-date"
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          className="filter-input"
          required
        />
        <small className="filter-hint">Only one day can be viewed at a time</small>
      </div>

      <div className="filter-group">
        <label htmlFor="hour-select">Hour (Optional)</label>
        <select
          id="hour-select"
          value={hour === null || hour === undefined ? '' : Math.floor(Number(hour) || 0)}
          onChange={(e) => onHourChange(e.target.value === '' ? null : Math.floor(Number(e.target.value) || 0))}
          className="filter-select"
        >
          <option value="">All Hours</option>
          {hours.map((h) => (
            <option key={h} value={h}>
              {h}h
            </option>
          ))}
        </select>
        <small className="filter-hint">Filter by specific hour of the day</small>
      </div>

      <div className="filter-group">
        <label htmlFor="product-filter">Product Filter</label>
        <select
          id="product-filter"
          value={productFilter || ''}
          onChange={(e) => onProductFilterChange(e.target.value || null)}
          className="filter-select"
        >
          <option value="">All Products</option>
          <option value="zero">Only Product 0 (Black)</option>
          <option value="nonzero">Only Non-Zero Products</option>
        </select>
        <small className="filter-hint">Filter by product number</small>
      </div>

      <div className="filter-group checkbox-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={showLines}
            onChange={(e) => onShowLinesChange(e.target.checked)}
            className="filter-checkbox"
          />
          <span>Show trajectory lines</span>
        </label>
      </div>

      {(selectedTarget || startDate || hour !== null || productFilter) && (
        <button
          className="clear-filters-btn"
          onClick={() => {
            onTargetChange('');
            onStartDateChange('');
            onHourChange(null);
            onProductFilterChange(null);
          }}
        >
          Clear Filters
        </button>
      )}
    </div>
  );
};

export default Filters;

