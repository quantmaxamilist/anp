# Redirects

The live site (Wix Studio) used the URLs on the left. Page URLs 301 through public/_redirects (Netlify / Cloudflare Pages) or the nginx block below. On other static hosts the meta-refresh pages generated from astro.config.mjs (method 2) stand in. The two sitemap URLs redirect only through _redirects or nginx, because a meta-refresh HTML page cannot stand in for an XML sitemap.

| Old URL | New URL |
|---|---|
| `/aboutus` | `/about` |
| `/out-team` | `/team` |
| `/soft-strip-out` | `/services/soft-strip-out` |
| `/structural-alterations-demolition` | `/services/structural-alterations-demolition` |
| `/diamond-drilling` | `/services/diamond-drilling` |
| `/groundworks-and-drainage` | `/services/groundworks-and-drainage` |
| `/structural-steelwork` | `/services/structural-steelwork` |
| `/copy-of-structural-steelwork` | `/services/structural-carpentry` |
| `/composite-flooring` | `/services/composite-flooring` |
| `/landscaping-and-external-works` | `/services/landscaping-and-external-works` |
| `/screeding` | `/services/screeding` |
| `/sitemap.xml`, `/pages-sitemap.xml` | `/sitemap-index.xml` |

Unchanged: `/`, `/services`, `/careers`, `/contact`. New pages: `/team` (replaces `/out-team`), `/clients`, `/additional-projects`.

## How they are served

1. `public/_redirects` — real 301s on Netlify and Cloudflare Pages (preferred).
2. `redirects` in `astro.config.mjs` — instant meta-refresh pages, which work on any static host.

## nginx

```nginx
# The build emits about.html, services/screeding.html and so on: serve /about from about.html.
# The exact-match `location = /…` rules below still take priority.
location / { try_files $uri $uri.html $uri/ =404; }
location = /aboutus { return 301 /about; }
location = /out-team { return 301 /team; }
location = /soft-strip-out { return 301 /services/soft-strip-out; }
location = /structural-alterations-demolition { return 301 /services/structural-alterations-demolition; }
location = /diamond-drilling { return 301 /services/diamond-drilling; }
location = /groundworks-and-drainage { return 301 /services/groundworks-and-drainage; }
location = /structural-steelwork { return 301 /services/structural-steelwork; }
location = /copy-of-structural-steelwork { return 301 /services/structural-carpentry; }
location = /composite-flooring { return 301 /services/composite-flooring; }
location = /landscaping-and-external-works { return 301 /services/landscaping-and-external-works; }
location = /screeding { return 301 /services/screeding; }
location = /sitemap.xml { return 301 /sitemap-index.xml; }
location = /pages-sitemap.xml { return 301 /sitemap-index.xml; }
```
