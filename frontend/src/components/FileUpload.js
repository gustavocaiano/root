import React, { useState, useRef } from 'react';
import { api } from '../services/api';
import './FileUpload.css';

const FileUpload = ({ onUploadSuccess }) => {
  const [file, setFile] = useState(null);
  const [columns, setColumns] = useState([]);
  const [columnMapping, setColumnMapping] = useState({
    target_number: '',
    timestamp: '',
    latitude: '',
    longitude: '',
    product_number: '',
  });
  const [showColumnSelection, setShowColumnSelection] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadingColumns, setLoadingColumns] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (selectedFile) => {
    setError(null);
    setSuccess(null);
    setShowColumnSelection(false);
    setColumns([]);
    setColumnMapping({
      target_number: '',
      timestamp: '',
      latitude: '',
      longitude: '',
    });
    
    if (!selectedFile) {
      setFile(null);
      return;
    }

    // Validate file type
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const fileName = selectedFile.name.toLowerCase();
    const isValid = validExtensions.some(ext => fileName.endsWith(ext));

    if (!isValid) {
      setError('Invalid file type. Please upload .xlsx, .xls, or .csv file.');
      setFile(null);
      return;
    }

    setFile(selectedFile);

    // Get columns from file
    setLoadingColumns(true);
    try {
      const response = await api.getFileColumns(selectedFile);
      const fileColumns = response.data.columns;
      setColumns(fileColumns);

      // Try to auto-detect columns
      const autoMapping = autoDetectColumns(fileColumns);
      setColumnMapping(autoMapping);
      setShowColumnSelection(true);
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'Error reading file columns';
      setError(errorMessage);
      setFile(null);
    } finally {
      setLoadingColumns(false);
    }
  };

  const autoDetectColumns = (fileColumns) => {
    const mapping = {
      target_number: '',
      timestamp: '',
      latitude: '',
      longitude: '',
      product_number: '',
    };

    // Case-insensitive search for matching columns
    const lowerColumns = fileColumns.map(col => col.toLowerCase());

    // Find target number
    const targetMatch = fileColumns.find((col, idx) => {
      const lower = lowerColumns[idx];
      return lower.includes('target') && (lower.includes('number') || lower.includes('id') || lower.includes('num'));
    });
    if (targetMatch) mapping.target_number = targetMatch;

    // Find timestamp
    const timestampMatch = fileColumns.find((col, idx) => {
      const lower = lowerColumns[idx];
      return lower.includes('timestamp') || lower.includes('date') || lower.includes('time') || lower.includes('datetime');
    });
    if (timestampMatch) mapping.timestamp = timestampMatch;

    // Find latitude
    const latMatch = fileColumns.find((col, idx) => {
      const lower = lowerColumns[idx];
      return lower.includes('lat') && !lower.includes('long');
    });
    if (latMatch) mapping.latitude = latMatch;

    // Find longitude
    const lngMatch = fileColumns.find((col, idx) => {
      const lower = lowerColumns[idx];
      return lower.includes('lon') || lower.includes('lng') || (lower.includes('long') && !lower.includes('lat'));
    });
    if (lngMatch) mapping.longitude = lngMatch;

    return mapping;
  };

  const handleUpload = async () => {
    if (!file) return;

    // Validate column mapping (product_number is optional)
    if (!columnMapping.target_number || !columnMapping.timestamp || 
        !columnMapping.latitude || !columnMapping.longitude) {
      setError('Please select all required columns (Target Number, Timestamp, Latitude, Longitude)');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.uploadFile(file, columnMapping);
      setSuccess(
        `Successfully imported ${response.data.records_imported} records from ${response.data.targets.length} target(s)`
      );
      setFile(null);
      setShowColumnSelection(false);
      setColumns([]);
      setColumnMapping({
        target_number: '',
        timestamp: '',
        latitude: '',
        longitude: '',
        product_number: '',
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onUploadSuccess();
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'Error uploading file';
      setError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleCancel = () => {
    setFile(null);
    setShowColumnSelection(false);
    setColumns([]);
    setColumnMapping({
      target_number: '',
      timestamp: '',
      latitude: '',
      longitude: '',
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="file-upload">
      <h3>Upload Data</h3>
      
      {!showColumnSelection ? (
        <>
          <div
            className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="drop-zone-content">
              {loadingColumns ? (
                <div className="loading-columns">
                  <p>Reading file columns...</p>
                </div>
              ) : (
                <>
                  <svg
                    className="upload-icon"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  
                  {file ? (
                    <div className="file-selected">
                      <p className="file-name">{file.name}</p>
                      <p className="file-size">{(file.size / 1024).toFixed(2)} KB</p>
                    </div>
                  ) : (
                    <>
                      <p className="drop-text">Drag & drop file here</p>
                      <p className="drop-subtext">or click to browse</p>
                      <p className="file-types">Supports: .xlsx, .xls, .csv</p>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
            style={{ display: 'none' }}
          />
        </>
      ) : (
        <div className="column-selection">
          <h4>Select Columns</h4>
          <p className="column-help">
            Map each column from your file to the required fields:
          </p>

          <div className="column-mapping">
            <div className="mapping-row">
              <label htmlFor="target-number">Target Number:</label>
              <select
                id="target-number"
                value={columnMapping.target_number}
                onChange={(e) => setColumnMapping({ ...columnMapping, target_number: e.target.value })}
                className="column-select"
              >
                <option value="">-- Select Column --</option>
                {columns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>

            <div className="mapping-row">
              <label htmlFor="timestamp">Timestamp:</label>
              <select
                id="timestamp"
                value={columnMapping.timestamp}
                onChange={(e) => setColumnMapping({ ...columnMapping, timestamp: e.target.value })}
                className="column-select"
              >
                <option value="">-- Select Column --</option>
                {columns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>

            <div className="mapping-row">
              <label htmlFor="latitude">Latitude:</label>
              <select
                id="latitude"
                value={columnMapping.latitude}
                onChange={(e) => setColumnMapping({ ...columnMapping, latitude: e.target.value })}
                className="column-select"
              >
                <option value="">-- Select Column --</option>
                {columns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>

            <div className="mapping-row">
              <label htmlFor="longitude">Longitude:</label>
              <select
                id="longitude"
                value={columnMapping.longitude}
                onChange={(e) => setColumnMapping({ ...columnMapping, longitude: e.target.value })}
                className="column-select"
              >
                <option value="">-- Select Column --</option>
                {columns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>

            <div className="mapping-row">
              <label htmlFor="product-number">Product Number (Optional):</label>
              <select
                id="product-number"
                value={columnMapping.product_number}
                onChange={(e) => setColumnMapping({ ...columnMapping, product_number: e.target.value })}
                className="column-select"
              >
                <option value="">-- Select Column (Optional) --</option>
                {columns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="column-actions">
            <button
              className="btn btn-secondary"
              onClick={handleCancel}
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleUpload}
              disabled={uploading || !columnMapping.target_number || !columnMapping.timestamp || 
                       !columnMapping.latitude || !columnMapping.longitude}
            >
              {uploading ? 'Uploading...' : 'Upload File'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="message error-message">
          {error}
        </div>
      )}

      {success && (
        <div className="message success-message">
          {success}
        </div>
      )}
    </div>
  );
};

export default FileUpload;

