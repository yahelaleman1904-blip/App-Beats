// src/utils/apiConfig.js

const isLocalhost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1');

const envUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');

// Si estás en tu PC usa localhost; si estás en Vercel/Celular usa directo tu Render
export const API_BASE_URL =
  envUrl || (isLocalhost ? 'http://127.0.0.1:8000' : 'https://app-beats.onrender.com');