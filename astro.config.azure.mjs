import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import react from '@astrojs/react';
import icon from 'astro-icon';

// Azure Static Web Apps configuration
export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone'
  }),
  
  integrations: [
    react(),
    icon(),
  ],

  markdown: {
    shikiConfig: {
      theme: 'github-dark',
      wrap: true
    }
  },

  build: {
    // Azure Static Web Apps specific settings
    inlineStylesheets: 'auto',
    assets: '_astro'
  },

  server: {
    port: 3000,
    host: true
  },

  vite: {
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
    },
    build: {
      // Optimize for Azure
      minify: 'terser',
      cssMinify: true,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor': ['react', 'react-dom']
          }
        }
      }
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom'
      ]
    }
  },

  // Security headers for Azure
  security: {
    checkOrigin: true
  },

  // Azure-friendly asset handling
  assetsPrefix: process.env.AZURE_ASSETS_PREFIX || undefined,

  // Environment-specific overrides
  ...(process.env.NODE_ENV === 'development' && {
    server: {
      port: 4321,
      host: 'localhost'
    }
  })
}); 