# Permanent Evans Mathibe website plan

## Design direction

The site keeps the approved crimson editorial art direction: a cinematic oxblood foundation, warm coral accents, oversized uppercase typography, expressive serif moments, sharp framing and subtle scanline texture. The supplied Evans Mathibe artwork remains the primary brand asset.

## Implementation

The browser-facing experience is the existing semantic landing page in `index.html` with `styles.css`, the supplied artwork in `assets/`, and the creative package PDF. `script.js` submits the contact form to `/api/contact`, then opens a prepared email addressed to `evans.mathibe@mail.com` after the submission is stored.

`server.js` is a small Node HTTP server. It serves the static site, exposes `/api/health` for deployment readiness, validates contact submissions, creates the `contact_submissions` table additively when needed, and inserts each accepted submission into the managed MySQL database. The container uses Node 22 and the `mysql2` driver.

## Project structure

- `index.html`: complete public landing page and SEO-bearing body content.
- `styles.css`: responsive visual system, focus states, reduced-motion rules, and floating contact buttons.
- `script.js`: validated client submission flow and mailto handoff.
- `server.js`: static server, health endpoint, contact API, schema initialization, and SQL persistence.
- `assets/`: supplied Evans Mathibe visual identity asset.
- `media-kit.pdf`: downloadable creative package.
- `manus-routes.json`: public route declaration.
- `Dockerfile`, `package.json`: permanent container runtime.
- `app.config.ts`: project logo metadata.
