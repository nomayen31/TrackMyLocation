import axios from 'axios';

// Shared axios instance: every request sends the Better Auth session cookie.
const api = axios.create({
  baseURL: 'http://localhost:5000',
  withCredentials: true,
});

export default api;
