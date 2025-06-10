import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import icon from 'astro-icon';

// Minimal Azure Static Web Apps configuration
export default defineConfig({
  output: 'static',
  
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
    // Minimal build settings for Azure
    inlineStylesheets: 'auto',
  },

  vite: {
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
    },
    build: {
      // Simple build configuration
      minify: true,
      cssMinify: true,
      // Remove complex rollup options that cause issues
    }
  },

  // Minimal configuration
  server: {
    port: 3000,
    host: true
  }
}); 