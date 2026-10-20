# Release 0.2 verification — 20 October 2026

Production: [Arnav Space Simulation](https://arnav-space-simulation.arnavrival12.workers.dev)

Repository: [Arnav-Dugad/arnav-space-simulation](https://github.com/Arnav-Dugad/arnav-space-simulation)

Cloudflare Worker version: `8c203137-2f74-4f3f-adc6-6e319ec65d9f`. Offline manifest build: `795f8cdf0a32`, 54 downloadable assets.

## Completed verification

- Strict TypeScript compilation and Vite production build passed.
- ESLint, including React hook/purity rules, passed.
- **44 scientific/data tests passed** across four files. Coverage includes independent Horizons positions at five epochs, lunar geometry and orientation, analytic two-body identities, convergence/conservation, orbit construction, near-escape classification, relative maneuver frames, adaptive encounter crossing, merger energy accounting, rocket mass/thrust behavior, Schwarzschild identities, planet quantities, catalog metadata and independent Vallado SGP4 vectors.
- **13 complete Playwright workflows passed on the live Cloudflare origin** in 25.1 seconds. The original 12 groups passed on the production preview; the added moon/mobile group passed separately after its layout fix. Live testing then ran all 13 together.
- Explorer checks include an actual rendered WebGL frame, date controls, physical-scale switching, favorites, search, workspaces, real PNG signature/dimensions, inspector collapse, moon cameras and mobile sheet expansion.
- Gravity checks include actual worker time advancement, edits/import/export, undo, six-element orbit creation, integrated burn preview, history restoration, named saves, command-search loading and share-link restoration.
- Catalog checks include SGP4 ground-track paths, exoplanet uncertainty/mass provenance, unknown diameters, real star positions, provider-failure simulation and retry.
- Lab checks exercise computed results, date-jumped eclipses, planet parameters, sensitivity runs and monotonic rocket flight samples. Mission checks exercise phase search, parking burns and trade CSV.
- Offline verification downloaded all 54 release assets, checked the build-specific cache key, disabled network access, opened previously unvisited satellite/exoplanet pages and advanced a gravity worker. A `Vary: Origin` mismatch discovered during preview testing was corrected before deployment.
- Responsive checks cover 390×844 portrait, 768×1024 tablet and 844×390 landscape across all six sections, without horizontal document overflow. A mobile instrument-panel height regression was fixed and covered by a browser assertion.
- Desktop observatory, mobile observatory, catalog, gravity, missions and black-hole screenshots were inspected. The gravity canvas was also sampled at its drawn center to confirm a nontransparent rendered result.
- The production browser reported **zero console errors or warnings** during the final manual review. Runtime resource origins were confined to the application's own Cloudflare origin.
- The old origin returns **HTTP 308**, preserving path and query. Browser navigation to its `#labs/blackhole` fragment reached the correct new lab. Redirect Worker version: `770af9b5-4d61-4713-9ffd-447c9bd00bd1`.
- GitHub repository visibility remains public; origin and homepage point to the renamed project. GitHub Actions runs lint, scientific tests, build and browser checks on push/PR. Offline tests require a production build and intentionally skip the development-server CI run.

## Practical limits

These checks validate the documented models and supported workflows, not arbitrary unstable systems, every GPU/browser, or every assistive technology combination. Model fidelity and snapshot age remain visible in the application and [feature matrix](ROADMAP.md).

Three.js is loaded separately: about 576 KB minified / 143 KB gzip, triggering Vite's size advisory. The 15 texture assets total 11.54 MB. Close-up LOD, low-quality rendering, resource cleanup and hidden-tab pauses reduce work; no universal frame-rate guarantee is made.

GitHub-to-Cloudflare automatic deployment is not configured. The verified checkout was published explicitly with `npm run deploy`; the legacy redirect uses `wrangler.redirect.jsonc`.
