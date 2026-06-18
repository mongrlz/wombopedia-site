// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // Update to the real domain when chosen (drives canonical URLs + sitemap).
  site: 'https://wombos.dev',
  integrations: [sitemap()],
});
