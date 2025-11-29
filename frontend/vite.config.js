import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',  // Allow external connections
    allowedHosts: [
      'habit-tracker.ltu-m7011e-8.se',
      '.ltu-m7011e-8.se',  // Allows any subdomain of ltu-m7011e-8.se
      'localhost',
      '127.0.0.1'
    ],
    port: 5173
  }
})
