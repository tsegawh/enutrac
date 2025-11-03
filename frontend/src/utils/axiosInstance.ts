import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: '/api',
});

// Attach token from localStorage on every request
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

export default axiosInstance;
