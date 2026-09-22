// Centralized API Configuration
// Render backend URL: https://devora-latest.onrender.com

const DEFAULT_API_BASE = 'https://devora-latest.onrender.com';

const rawApiBase = import.meta.env.VITE_API_BASE || DEFAULT_API_BASE;

// Strip trailing slashes to prevent double slashes in endpoint paths
export const API_BASE = (rawApiBase || '').replace(/\/+$/, '');

