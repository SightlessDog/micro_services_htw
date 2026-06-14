import { defineConfig, type ProxyOptions } from 'vite'
import react from '@vitejs/plugin-react'

// In Docker dev, point this at the gateway service (e.g. http://gateway:80).
const proxyTarget = process.env.VITE_PROXY_TARGET ?? 'http://localhost:8080'

// /users, /products, /orders are both API routes (gateway) and SPA routes
// (React Router). Browser navigation sends Accept: text/html — let vite
// serve the SPA shell for those. fetch() calls send Accept: */* — proxy
// those to the gateway. Mirrors frontend/nginx.conf's prod behavior.
const apiProxy: ProxyOptions = {
  target: proxyTarget,
  changeOrigin: true,
  bypass: (req) => {
    if (req.headers.accept?.includes('text/html')) return '/index.html'
  },
}

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/users': apiProxy,
      '/products': apiProxy,
      '/orders': apiProxy,
    },
  },
})
