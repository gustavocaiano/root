import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  getFileColumns: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/api/file/columns', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  uploadFile: (file, columnMapping) => {
    const formData = new FormData();
    formData.append('file', file);
    if (columnMapping) {
      formData.append('column_mapping', JSON.stringify(columnMapping));
    }
    return apiClient.post('/api/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  getTargets: () => {
    return apiClient.get('/api/targets');
  },

  getTrajectories: (targetNumber, startDate, hour, productFilter) => {
    // Both targetNumber and startDate are required (only one day, one target)
    if (!targetNumber || !startDate) {
      return Promise.reject(new Error('Target number and start date are required'));
    }
    
    const params = {
      target_number: targetNumber,
      start_date: startDate
    };
    
    if (hour !== null && hour !== undefined) {
      params.hour = hour;
    }
    
    if (productFilter) {
      params.product_filter = productFilter;
    }
    
    return apiClient.get('/api/trajectories', { params });
  },

  getLocationHistory: (targetNumber, latitude, longitude) => {
    return apiClient.get(`/api/location/${targetNumber}`, {
      params: {
        latitude,
        longitude
      }
    });
  },

  getTargetHistory: (targetNumber) => {
    return apiClient.get(`/api/points/${targetNumber}`);
  },

  getStats: () => {
    return apiClient.get('/api/stats');
  },

  clearData: () => {
    return apiClient.delete('/api/data');
  },
};

