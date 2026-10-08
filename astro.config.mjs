// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// The live Wix site serves https://www.anpconstruction.co.uk with no trailing slashes.
const SITE = 'https://www.anpconstruction.co.uk';

// Old Wix URLs → new routes. Static builds emit an instant-redirect page for each;
// real 301s live in vercel.json (Vercel, the live host), public/_redirects (Netlify /
// Cloudflare) and REDIRECTS.md has the nginx equivalent.
export const oldUrls = {
  '/aboutus': '/about',
  '/out-team': '/team',
  '/soft-strip-out': '/services/soft-strip-out',
  '/structural-alterations-demolition': '/services/structural-alterations-demolition',
  '/diamond-drilling': '/services/diamond-drilling',
  '/groundworks-and-drainage': '/services/groundworks-and-drainage',
  '/structural-steelwork': '/services/structural-steelwork',
  '/copy-of-structural-steelwork': '/services/structural-carpentry',
  '/composite-flooring': '/services/composite-flooring',
  '/landscaping-and-external-works': '/services/landscaping-and-external-works',
  '/screeding': '/services/screeding',
};

export default defineConfig({
  site: SITE,
  trailingSlash: 'ignore',
  // Vercel serves about.html at /about via cleanUrls (vercel.json); canonicals stay slash-less.
  build: { format: 'file' },
  server: { port: 4339 },
  devToolbar: { enabled: false },
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  // Class-based scoping so parent styles reach elements rendered by child components
  // (e.g. headings built by Split.astro) through the passed-in class prop.
  scopedStyleStrategy: 'class',
  integrations: [sitemap({ filter: (page) => !page.includes('/404') && !page.includes('/mock') })],
  redirects: oldUrls,
});
