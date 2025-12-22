import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // LAN access
    port: 5173,
    hmr: true,
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '192.168.0.102', // optional: allow network host
    ],
    proxy: {
      '/api': {
        target: "https://zp1v56uxy8rdx5ypatb0ockcb9tr6a-oci3--5173--365214aa.local-credentialless.webcontainer-api.io/:3001", 
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Proxy error:', err);
          });
          // Optional hooks
          // proxy.on('proxyReq', (proxyReq, req, _res) => {...});
          // proxy.on('proxyRes', (proxyRes, req, _res) => {...});
        },
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
