import { defineConfig } from 'astro/config'
import mdx from '@astrojs/mdx'

// Simple static configuration for testing the Tailus implementation
export default defineConfig({
  site: 'https://pixelatedempathy.com',
  output: 'static',
  logLevel: 'info',
  
  integrations: [
    mdx()
  ],
  
  build: {
    inlineStylesheets: 'auto'
  },
  
  vite: {
    logLevel: 'info'
  }
})
