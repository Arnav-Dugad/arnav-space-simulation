# Arnav Space Simulation

**The Universe Is Yours to Explore.** An interactive observatory, physics workbench, mission planner, and collection of scientific laboratories.

**[Launch the website](https://arnav-space-simulation.arnavrival12.workers.dev)** · [Public GitHub repository](https://github.com/Arnav-Dugad/arnav-space-simulation)

![Arnav Space Simulation observatory](docs/observatory-desktop.png)

## Release 0.2

- Explore eight planets, the calculated Earth–Moon system and Jupiter's four Galilean moons. Select moon labels for close-ups.
- Inspect ephemeris positions, calibrated body orientation, Earth city lights, atmospheric rims, Saturn ring shadows, real catalog stars and a close-up 8K Earth map.
- Switch reference frames, physical or educational scale, scientific overlays and attributed Earth observation layers. Measure separation, relative speed and light travel time.
- Arrange the inspector, save camera workspaces, find worlds and experiments through command search, export 1–3× PNGs, and download the entire release for offline use.
- Build gravitational systems with an adaptive velocity-Verlet worker, six-element orbit creation, maneuver previews, undo, touch dragging, rewind and branching history, named experiments and shareable initial conditions.
- Inspect energy accounting, angular momentum vectors, encounters, timestep behavior, and exported CSV/JSON reports. Try the measured ten-period stable-orbit challenge.
- Compare Hohmann and bi-elliptic transfers, parking-orbit departure/capture burns, ideal propellant, and ephemeris-based departure-phase crossings.
- Investigate rocket ascent and staging, Schwarzschild black-hole quantities, global eclipse geometry, planet design, Kepler's equal-area law, sensitivity to initial conditions, and independent ephemeris validation.
- Explore 21 station-group OMM records with SGP4 ground tracks, 24 curated exoplanets with uncertainties, 40 predicted close approaches and 925 real bright stars. Dates, sources and missing values remain visible.

All 56 requested premium feature areas have an implemented baseline. [The feature matrix](docs/ROADMAP.md) describes each implementation and its limits. A baseline is not a claim of professional simulation fidelity.

## Run and verify

Use Node.js 24 and npm:

```sh
npm ci
npm run dev
npm run lint
npm test
npm run build
npm run test:e2e
```

Windows browser tests use installed Chrome. On Linux, install Chromium with `npx playwright install --with-deps chromium`. For production testing, run `npm run preview -- --port 4173`, then set `TEST_BASE_URL=http://127.0.0.1:4173` before running browser tests. The offline test intentionally skips the development server because service workers register only in production.

CI validates lint, scientific tests, the build and browser workflows on every push and pull request. Production publication is an explicit Cloudflare CLI deployment; GitHub pushes alone do not deploy.

## Scientific models

**Solar System:** Astronomy Engine geometric planetary and lunar positions in J2000 ecliptic coordinates, limited by the interface to 1800–2050. Planetary body frames follow its IAU rotation model. Orbit ellipses and apsis/node markers use JPL approximate elements, a separate overlay model. The approximate barycentric render origin includes the Sun and eight planets; it is not a complete solar-system barycenter. Independent saved Horizons vectors provide 45 comparison cases. [Ephemeris documentation](docs/EPHEMERIS.md).

**Rendering:** educational mode compresses distances and exaggerates radii/moon separations. Physical mode uses proportional AU distances and actual body radii with logarithmic depth. Atmospheres, illumination intensity and surfaces remain illustrative. Historical textures are not live imagery; the elevation JPEG is not a raw height model. No volumetric radiative-transfer or strong-field ray-tracing claim is made.

**Gravity:** Newtonian point masses, G = 4π² in AU, normalized solar masses and normalized orbital years. Adaptive steps limit encounter crossing and free-fall scales; there is no symplectic adaptive-time or arbitrary-precision guarantee. Mergers preserve mass, linear momentum and volume, discard remnant spin and separately report kinetic loss/model energy changes. History retains 600 states. Loading bodies begins a new experiment; it does not restore elapsed diagnostics. Maneuvers use velocity-prograde, radial and orbit-normal directions; the first two are not generally orthogonal.

**Missions and laboratories:** circular coplanar impulsive transfer estimates with patched-conic parking burns. Phase crossings are not Lambert launch windows. Rocket flight is a simplified 2D variable-mass central-Earth model with an exponential atmosphere and fixed drag coefficient. Global eclipse calculations do not provide local visibility. Black-hole metrics use Schwarzschild identities and a weak-field deflection approximation; the disk is cinematic. Planet equilibrium temperature is not climate prediction. Sensitivity traces are not a Lyapunov exponent. [Model validation and limits](docs/SCIENCE_VALIDATION.md).

**Catalogs:** bundled dated snapshots, not continuously refreshed feeds. Satellite extrapolation degrades away from its element epoch; asteroid approach uncertainty is not an impact probability. Exoplanet missing measurements remain null. Star positions remain J2000 without current-date proper motion. [Complete data provenance](docs/DATA_SOURCES.md).

## Deployment

Cloudflare Workers Static Assets serves `dist`, with SPA fallback and response headers. No database, application secrets or paid runtime API is required.

```sh
npx wrangler login
npm run deploy
```

The configured Worker is `arnav-space-simulation`. The former `orbitarium` Worker can be deployed as a permanent redirect using `npx wrangler deploy --config wrangler.redirect.jsonc`. Do not delete the old Worker before the new origin is verified. To automate publication later, connect the repository through Cloudflare Workers Builds with build `npm run build` and deploy `npx wrangler deploy`.

## Licenses and structure

Application code is [MIT](LICENSE). Images, fonts and data have separate terms: Solar System Scope CC BY 4.0, HYG derivative data CC BY-SA 4.0, NASA media guidance and original GEBCO_08 educational/noncommercial terms. [Full credits](THIRD_PARTY_NOTICES.md). No source agency endorsement is implied.

`src/scenes` owns WebGL resources; `src/simulation` contains testable models; `src/workers` runs gravity; `src/pages` contains the labs; `public/data` holds attributed snapshots; `e2e` checks complete browser workflows. [Verification notes](docs/VERIFICATION.md).
