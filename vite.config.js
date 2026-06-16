import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'error', // show only errors
  plugins: [
    react()
  ],
  define: {
    __SUPABASE_URL__: JSON.stringify(import.meta.env.VITE_SUPABASE_URL)
  }
});
