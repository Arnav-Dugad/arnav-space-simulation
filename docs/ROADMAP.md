# Premium feature matrix — release 0.2

The 56 feature areas below are working educational baselines in Arnav Space Simulation. Limits describe the delivered behavior, rather than implying a professional model. Scientific checks are in `src/tests`; complete browser checks are in `e2e`. See [SCIENCE_VALIDATION.md](SCIENCE_VALIDATION.md), [EPHEMERIS.md](EPHEMERIS.md) and [DATA_SOURCES.md](DATA_SOURCES.md).

| # | Feature | Delivered behavior and limits |
|---|---|---|
| 1 | Premium visual system | Navy glass panels, warm gold accents, bundled type, consistent controls, source labels and empty/error states. |
| 2 | Movable, resizable inspector | Desktop drag/resize with stored layout, reset, collapse and expand; confined to the viewport at restoration. |
| 3 | Mobile bottom sheets | Inspector swipe up/down, compact/expanded states; full-height instrument panel and responsive six-section navigation. |
| 4 | Command search | Ctrl/Command K finds worlds, labs, pages, saved workspaces and named experiments. |
| 5 | Saved workspaces | Device-local selection, date, settings and current camera; exportable JSON. Camera requires the explorer to mount. |
| 6 | Scientific numeric inputs | Scientific notation, bounded validation, Enter commits, arrow adjustments and AU/km/light-year conversion. |
| 7 | Measurement tools | Calculated planet separation, relative velocity and light time; no spacecraft-ranging correction. |
| 8 | Reference frames | Sun-centered, selected-body-centered and approximate eight-planet barycentric render origins. |
| 9 | Physical-scale inspection | Actual radii and proportional distances, tiny near plane and logarithmic depth buffer; minimum sandbox pixel size is separate. |
| 10 | Scale legend | Explains radial distance compression, educational radii and moon separation scaling. |
| 11 | Screenshot studio | Real rendered PNG at 1×/2×/3× with optional timestamp, model and credits; visual layer filter included. |
| 12 | Guided discovery | Eight-world tour, calculated Moon narration, progress indicator, restart and interruptible camera transitions. |
| 13 | Named universes | Up to 20 validated device-local named body states, load/delete and command-search access; starts time/history anew. |
| 14 | Offline exploration | Explicit pack downloads all release code, fonts, maps and catalogs; build-specific cache and visible progress/failure. |
| 15 | Real planetary ephemerides | Astronomy Engine geometric heliocentric coordinates in J2000 ecliptic axes; date-limited interface. |
| 16 | Independent accuracy dashboard | 45 saved JPL Horizons vectors at five epochs, vector/angular residuals and CSV export. |
| 17 | Calculated Moon and phases | Geocentric lunar ephemeris, IAU orientation, illuminated fraction and eclipse integration. |
| 18 | Galilean moon system | Computed Io/Europa/Ganymede/Callisto positions, selectable close-ups, true radii in physical mode; solid-color surfaces. |
| 19 | Calibrated body orientation | IAU pole, prime meridian and rotation applied to mapped bodies; source map longitude calibration documented. |
| 20 | Earth night lights | Bundled city-light map masked by the actual Sun direction in world space. |
| 21 | Atmospheric scattering impression | Optical rim and approximate phase-dependent color; single-layer shader, not volumetric radiative transfer. |
| 22 | Saturn rings and shadows | Alpha-tested ring texture, shadow casting/receiving and custom depth/distance materials. |
| 23 | High-resolution close-up LOD | Selected close bodies use denser geometry; NASA 8K Earth map loads by projected size and quality setting. |
| 24 | Scientific observation layers | Natural/enhanced/grayscale display, Earth night/cloud/topography source maps; no terrain-height inference from JPEG. |
| 25 | Real star background | 925 magnitude-limited HYG stars with J2000 directions and approximate photometric color/brightness. |
| 26 | Scientific overlays | Ecliptic grid, rendered velocity arrow, JPL ellipse apsides and nodes, explicit marker legend. |
| 27 | Adaptive gravity solver | Worker velocity Verlet with encounter/free-fall step limits, timestep/substep reporting and bounded computation. |
| 28 | Collision accounting | Mass/momentum/volume merges, kinetic loss, model energy changes and corrected integration drift; remnant spin discarded. |
| 29 | Angular momentum diagnostics | Point-mass magnitude and XYZ vector; merger effects described separately. |
| 30 | Six-element orbit assistant | Semi-major axis, eccentricity, inclination, node, periapsis and anomaly produce editable 3D states. |
| 31 | Circular/escape helpers | Derived speeds and bound/parabolic/unbound classification with near-escape tolerance. |
| 32 | Direct body editing and undo | Names, masses, physical radii, XYZ states, XY pointer/touch dragging, Z numerics, duplicate/remove and 50 edit undos. |
| 33 | Maneuver handles | Drag prograde/radial handles plus numeric normal impulse; physical state changes and undo. |
| 34 | Post-maneuver previews | 600-step two-body preview before burn; not a full perturbation optimizer. |
| 35 | Rewind and branches | Up to 600 worker snapshots restore states/collision accounting; resuming branches from selected instant. |
| 36 | Experiment sharing | Versioned, size-limited URL body configurations plus validated JSON import/export. |
| 37 | Energy analytics | Smoothed graph ranges, kinetic/potential values and corrected drift trace; exported samples use model units. |
| 38 | Encounter analytics | Pair separation, relative speed, sampled closest encounter/time and optional slowdown below 0.15 AU. |
| 39 | Stable-orbit challenge | Measured ten-period target, eccentricity <0.15 and drift <0.1%; edits or rewind invalidate attempt. |
| 40 | Kepler equal-area lab | Solved eccentric anomaly and eight equal-mean-anomaly sectors, animated orbit controls. |
| 41 | Sensitivity comparisons | Two integrated three-body systems with a small initial perturbation, trajectories/RMS divergence/export. |
| 42 | Experiment reports | Diagnostic CSV and JSON model/units/assumptions/current snapshot/sample reports. |
| 43 | Parking-orbit mission burns | Patched-conic excess speeds, departure/capture Δv and ideal propellant from user parking altitudes. |
| 44 | Departure-phase search | Bracketed ephemeris longitude crossings of ideal Hohmann phase, date-bounded; not a Lambert launch window. |
| 45 | Transfer trade studies | Hohmann plus three bi-elliptic candidates compared on Δv, time and fuel, with CSV and a measured selection challenge. |
| 46 | Rocket ascent laboratory | Central-Earth variable-mass flight, thrust/throttle/pitch, exponential atmosphere, drag, cutoff and explicit stage mass. |
| 47 | Flight replay and telemetry | Countdown, trajectory, altitude/speed/acceleration samples, replay slider, reset and flight CSV. |
| 48 | Black-hole laboratory | Schwarzschild radius, photon sphere, ISCO, static clock factor and weak-field deflection; bounds enforced. |
| 49 | Cinematic black-hole visuals | Animated procedural disk/ring, camera inclination and quality controls; illustration rather than geodesic ray tracing. |
| 50 | Eclipse laboratory | Astronomy Engine global solar/lunar events, date jumps, computed Moon/Earth shadow schematic; not local visibility. |
| 51 | Planet designer | Mass/radius-derived gravity, density, escape speed, albedo/distance equilibrium temperature; artistic water/cloud/ring controls. |
| 52 | Satellite explorer | 21 CelesTrak station-group OMM records propagated with SGP4, ±90-minute ground track and epoch/age/failure handling. |
| 53 | Exoplanet explorer | 24 NASA Archive records, asymmetric errors, upper limits, mass provenance, publication references and null-safe displays. |
| 54 | Asteroid and stellar catalogs | 40 JPL approaches with 3σ bounds and unknown diameters; 925 HYG stars with real J2000 map, filters and export. |
| 55 | Source and uncertainty inspector | Source/retrieval/orbit epochs, coordinate frames, units, model caveats, catalog provenance and filtered export metadata. |
| 56 | Performance and motion polish | FPS/frame time/draw/triangle/texture readouts, low/high rendering, hidden-tab pause, resource cleanup, reduced motion and frame-independent easing. |

## Further premium refinements

These are additional improvements, beyond the delivered baselines:

1. Lambert and pork-chop mission windows with independently validated solvers.
2. Higher-order adaptive integration with explicit local error estimates and dense encounter event detection.
3. Full collision spin tracking, fragmentation and selectable restitution models.
4. Orthogonal RTN maneuver frames and multi-body trajectory previews.
5. Quantified long-span ephemeris accuracy with additional independent sources and time-scale controls.
6. Licensed tiled imagery and raw elevation grids with georeferenced displacement.
7. Physically integrated volumetric atmospheres and eclipsing transmittance.
8. Strong-field geodesic black-hole rendering with measured ray-error controls.
9. Rocket launch-pad constraints, realistic atmosphere, aerodynamic Mach tables and multistage guidance.
10. Ground-observer eclipse circumstances and a globe-based visibility map.
11. User-supplied OMM files, optional cached catalog refresh and provenance history.
12. Current-date stellar proper motion and calibrated photometry.
13. Multiple inspector docks, workspace import and named camera bookmarks.
14. Keyboard-complete panel repositioning and configurable shortcuts.
15. An accessible narrated tour with transcripts and multilingual descriptions.
16. Touch pinch-to-zoom in every 2D lab and a dedicated tablet cockpit.
17. Side-by-side synchronized saved experiments and parameter sweeps.
18. Offline storage management, pack size estimates and cache eviction controls.
19. Device-calibrated adaptive graphics budgets and an OffscreenCanvas fallback strategy.
20. Automated Cloudflare publication gated on passing CI and screenshot review.
