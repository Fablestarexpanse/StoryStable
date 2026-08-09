import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Tauri expects a fixed dev port and does not want the server exposed.
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  build: {
    target: 'es2022',
  },
});
