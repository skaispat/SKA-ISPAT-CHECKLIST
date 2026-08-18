import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  base: "/", // Changed from "./" to "/"
  build: {
    outDir: "dist",
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          pdf: ['html2canvas', 'jspdf', 'jspdf-autotable'],
          supabase: ['@supabase/supabase-js'],
          ui: ['framer-motion', 'lucide-react']
        }
      }
    }
  },
})