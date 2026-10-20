# Release status and improvement backlog

The first-light release implements the brief's foundation and first Solar System experience, plus a functional baseline of the gravity, transfer, and comparison tools. It does not claim the complete 41-section roadmap.

| Experience | Status | Practical limits |
| --- | --- | --- |
| React/TypeScript application, design system, navigation | Complete for initial release | Desktop sidebar and mobile bottom navigation; English interface |
| Solar System explorer | Functional, simplified | Eight planets, JPL approximate elements, 1800–2050; not a Horizons ephemeris |
| Surface maps, lighting, Saturn rings | Functional, simplified | Illustrative rotation, approximate atmosphere, constant render-light intensity |
| Moon visualization | Educational visualization | One schematic Earth satellite; no lunar ephemeris |
| Planet inspector, search, favorites | Complete for initial release | Curated bundled data; favorites use device storage |
| Playback, dates, reverse, camera modes | Complete for initial release | Focus, top, system; step ±1 day; no spacecraft camera |
| Scale controls | Functional, simplified | Radially compressed or proportional distances; sizes always exaggerated |
| Eight-world guided tour | Complete for initial release | Manual progression with contextual text; no audio |
| N-body solver and Web Worker | Functional, simplified | Newtonian point masses, fixed-step velocity Verlet; up to 64 bodies |
| Body editor and creation | Functional, simplified | Numeric XYZ positions and velocities, mass/radius edits; no 3D dragging |
| Collision handling | Functional, simplified | Perfectly inelastic merging; mass and momentum conserved |
| Simulation diagnostics | Functional | Total energy, relative drift, angular momentum magnitude, center of mass |
| Save/load and JSON portability | Complete for initial release | Current state only; elapsed time and trails restart |
| Gravity presets | Functional | Sun–Earth, binary, figure eight, collision |
| Mission planner | Functional, simplified | Circular coplanar heliocentric Hohmann estimates, phase geometry, ideal propellant |
| Planetary comparison | Functional | Pairwise reference table and radius ratios; ring systems omitted |
| Quality and motion preferences | Complete for initial release | Two rendering profiles; no automatic GPU benchmark |
| Accessibility baseline | Functional | Semantic controls, native modal focus trap, keyboard navigation, reduced motion |
| Black hole, rocket flight, eclipse labs | Planned | No placeholder navigation is exposed |
| Exoplanet, asteroid, satellite and stellar catalogs | Planned | No fake live data is displayed |
| Advanced orbital lab and maneuver nodes | Planned | Hohmann baseline only |
| Planet creator, challenges, audio, general relativity | Planned | Not included |

## Prioritized improvements

1. **Science:** compare JPL approximate coordinates against a bundled set of Horizons state vectors at multiple epochs with published error bounds.
2. **Science:** implement a lunar ephemeris, replacing the schematic Moon orbit and tilt.
3. **Science:** add an adaptive close-encounter integrator with explicit tolerance and conservation reporting.
4. **Science:** show collision energy loss separately from integration drift and distinguish pre/post-merge baselines.
5. **Science:** expose angular-momentum vector components and a recent energy drift graph.
6. **Science:** add full six-element orbit creation with circular-speed and escape-speed helpers.
7. **Rendering:** calibrate prime meridians, spin pole directions, and retrograde rotation against IAU orientation models.
8. **Rendering:** implement Earth night lights using the bundled map and a Sun-direction mask.
9. **Rendering:** add ring shadowing and a textured Saturn ring transparency test across camera angles.
10. **Rendering:** add a true physical-size mode with logarithmic depth handling and a local origin for planetary close-ups.
11. **UI:** split the explorer's inspector and playback components out of the app shell as the control set grows.
12. **UI:** add editable body names, keyboard creation shortcuts, and undoable sandbox edits.
13. **UI:** add a scale legend that measures rendered distance distortion at the selected body's radius.
14. **Animation:** replace time-dependent camera lerp with frame-rate-independent easing and interruption-safe transitions.
15. **Exploration:** add Jupiter's Galilean moons with attributed orbital models and selectable inspectors.
16. **Education:** create a stable-orbit challenge with numerical success criteria over ten measured periods.
17. **Education:** add a Kepler equal-area visualization driven by the same eccentric-anomaly solver.
18. **Performance:** move the sandbox draw loop to OffscreenCanvas when supported and stop render loops when the page is hidden.
19. **Performance:** load non-selected planet textures on demand with a bounded GPU texture cache.
20. **Data:** add a cached, epoch-labelled CelesTrak OMM + SGP4 satellite explorer; handle provider failure explicitly.
21. **Data:** add a curated NASA Exoplanet Archive snapshot, with null-safe uncertainties and attributed last-update dates.
22. **Mobile:** implement touch body repositioning in a plane with numeric altitude controls and pointer-capture cancellation.
23. **Experimental:** add a black-hole lab with Schwarzschild-radius calculations and a clearly marked lensing approximation.
24. **Missions:** extend the planner to patched-conic departure/arrival excess velocities, parking orbit burns, and actual phase-window searches.
25. **Rocket physics:** implement a tested 2D variable-mass ascent integrator with drag, thrust cutoff, staging, and replay.
26. **Deployment:** configure Cloudflare Workers Builds against the GitHub repository for automatic deployments after CI.

## Observations

- The initial texture set is about 6.4 MB uncompressed as files. These maps are served locally and cached; the GPU uploads are bounded by scene teardown.
- Three.js is isolated into a separate lazy-loaded vendor chunk, approximately 141 KB gzip. It exceeds Vite's default raw chunk advisory threshold but is expected for a WebGL engine.
- Graphics resources, workers, resize observers, and animation frames are explicitly cleaned up on route changes.
- Low quality reduces pixel ratio, sphere subdivisions, and star count. There is no claim of a specific frame rate across untested devices.
- Scientific values are intentionally rounded to match their reference sources. Surface/temperature/gravity conventions differ for giant planets and are explained in context.
