# First-light verification — 20 October 2026

Production: https://orbitarium.arnavrival12.workers.dev

Public repository: https://github.com/Arnav-Dugad/orbitarium

## Completed checks

- TypeScript strict check and Vite production build: passed.
- ESLint, including React hook and purity rules: passed.
- 13 scientific tests: passed. They cover Kepler residuals, Earth orbital speed and period, a rounded J2000 Earth–Moon barycenter position, perihelion/aphelion bounds, Hohmann transfer estimates, rocket equation identities, coordinate mapping, invalid inputs, two-body energy/angular-momentum conservation, binary stability, collision merging, non-merging behavior, and import validation.
- Five Playwright groups: passed locally and against the deployed Cloudflare origin. They cover all four experiences, persistence, file export, invalid import handling, graphics settings, and playback.
- Responsive checks: 390×844 portrait, 768×1024 tablet, and 844×390 landscape, with no horizontal document overflow. Timeline controls also have no internal horizontal clipping.
- Desktop and mobile screenshots were rendered and inspected. A mobile playback clipping issue and overexposed scene lighting were corrected.
- The production browser successfully rendered the WebGL scene with no fallback notice, texture failure, or console error. Runtime resource origins were restricted to the site's own Cloudflare origin.
- The Cloudflare deployment completed successfully and its returned public URL was verified in a browser.
- The GitHub repository was created as public and `main` was pushed successfully. GitHub Actions independently runs the same lint, physics, build, and browser checks.

## Useful reference results

- Earth circular speed at 1 AU: approximately 29.785 km/s.
- Earth–Mars ideal heliocentric transfer: approximately 259 days; departure/arrival velocity changes approximately 2.94 and 2.65 km/s.
- Sun–Earth energy drift after ten simulated periods at 0.0002-year steps: below 10⁻⁷ relative error in the unit test; angular momentum error below 10⁻¹⁰ relative.

## Limits and remaining work

There are no known blocking build or interaction failures in the tested release. Testing does not establish correctness for arbitrary unstable N-body scenarios, every GPU, or assistive technology combination.

The Three.js vendor bundle triggers Vite's advisory raw-size warning (569 KB, about 141 KB gzip). It is loaded separately. No frame-rate guarantee is made; low quality reduces rendering work. The bundled textures total about 6.4 MB.

Scientific simplifications and unimplemented features are recorded in [ROADMAP.md](ROADMAP.md), the README, and the interface. Black-hole physics, satellite tracking, rocket flight, eclipses, and the other advanced brief modules remain planned. Automatic GitHub-to-Cloudflare production builds are not configured; `npm run deploy` publishes the current checkout.
