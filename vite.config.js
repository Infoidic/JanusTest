import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Permite conexiones externas
    port: 5173, // Puerto de desarrollo
    strictPort: true, // Usa exactamente este puerto
    cors: true, // Habilita CORS
    allowedHosts: [
      "permalink-adam-generous-holds.trycloudflare.com", // Reemplaza con tu dominio de ngrok
    ], 
  }
});

