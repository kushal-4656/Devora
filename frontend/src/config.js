// Centralized API Configuration
// Render backend URL: https://devora-latest.onrender.com

const isLocalhost = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// When testing locally, default to local FastAPI backend on port 8000
const DEFAULT_API_BASE = isLocalhost ? 'http://localhost:8000' : 'https://devora-latest.onrender.com';

const rawApiBase = import.meta.env.VITE_API_BASE_LOCAL && isLocalhost 
  ? import.meta.env.VITE_API_BASE_LOCAL 
  : (isLocalhost ? 'http://localhost:8000' : (import.meta.env.VITE_API_BASE || DEFAULT_API_BASE));

// Strip trailing slashes to prevent double slashes in endpoint paths
export const API_BASE = (rawApiBase || '').replace(/\/+$/, '');
