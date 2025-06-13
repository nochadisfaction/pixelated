import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  integrations: [tailwind()],
  buildOptions: {
    site: 'https://your-site-url.com', // Replace with your site's URL
  },
  markdown: {
    shikiConfig: {
      theme: 'nord',
    },
  },
});