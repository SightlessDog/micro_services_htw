import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/users': { target: 'http://localhost:8080', changeOrigin: true },
      '/products': { target: 'http://localhost:8080', changeOrigin: true },
      '/orders': { target: 'http://localhost:8080', changeOrigin: true },
    },
  },
})
