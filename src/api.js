import axios from 'axios';

// Base URL of the backend. Locally this is http://localhost:5000; in production
// set VITE_API_URL (e.g. https://trackmylocation-api.onrender.com) in Vercel.
export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '');

// Shared axios instance: every request sends the Better Auth session cookie.
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

export default api;
