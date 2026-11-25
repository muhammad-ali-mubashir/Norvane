// @ts-check
import { defineConfig } from 'astro/config';

// Static output: the build in dist/ is plain HTML, CSS and JS,
// so it runs on Vercel now and on Hostinger later without changes.
export default defineConfig({
  site: 'https://norvane.com.au',
  output: 'static',
  build: {
    inlineStylesheets: 'auto',
  },
});
