# Scientific validation of the interactive laboratories

Verified on 2026-10-20. These checks validate the stated educational models;
they do not establish navigation, climate, launch-vehicle, or strong-field
ray-tracing accuracy. See `src/tests/advanced.test.ts` for independent identities
and reference cases, and `docs/EPHEMERIS.md` for the separate JPL comparisons.

## Units and constants

The gravity sandbox uses AU, a normalized solar mass, and a normalized orbital
year with `G = 4*pi^2`. This is the convenient Kepler normalization that makes
the negligible-mass, 1-AU circular orbit have a one-unit period. Its year should
not be used as an exact SI conversion of the observed Earth's orbital period.
The SI laboratories use meters, seconds, kilograms, and newtons internally;
rocket thrust input is in kN and escape speed output is in km/s.

The SI gravitational constant `6.67430e-11`, speed of light `299792458`,
Stefan-Boltzmann constant `5.670374419e-8`, and conventional standard gravity
`9.80665` agree with the [NIST 2022 CODATA listing](https://physics.nist.gov/cuu/Constants/Table/allascii.txt).
The model truncates the Stefan-Boltzmann decimal. Gravity is a measured
constant; the SI speed of light and conventional standard gravity are exact.
The nominal solar luminosity `3.828e26 W` is an IAU conversion constant, rather
than a current variable solar measurement. See [IAU 2015 Resolution B3](https://iauarchive.eso.org/static/resolutions/IAU2015_English.pdf), pages 6–9.

## Orbit construction and maneuvers

Tests recover the 1-AU, one-period circular case and a polar ellipse whose
periapsis and apoapsis are 1 and 3 AU. Rotation must preserve specific orbital
energy and angular momentum. Near-escape states use a dimensionless symmetric
classification tolerance, avoiding a bound/unbound label caused by roundoff.
The constructor assumes a fixed central mass for the initial Kepler elements;
subsequent sandbox evolution includes every body's gravitational reaction.
For a massive companion, its initial two-body relative orbit would need
`mu = G*(centralMass + companionMass)` and barycentric states for exact elements.

Burns use velocity-prograde, position-radial, and angular-momentum-normal
directions relative to the moving selected center. The regression includes
a translation and common velocity boost, so an absolute world-frame burn
cannot pass. Velocity-prograde and radial are generally not perpendicular
on an eccentric orbit; these controls are not an orthogonal RTN basis.

## Integration and collisions

The second-order velocity-Verlet solver is checked against the analytic equal
circular binary, with a finer external timestep producing at least 50 times
less positional error in the reference test. A separate one-period test checks
relative energy drift below `1e-5`, angular momentum drift below `1e-12`, and a
stationary center of mass. Those thresholds apply to that fixture; adaptive
timesteps do not provide a global energy-error guarantee or preserve the
fixed-step method's symplectic properties.

Adaptive subdivision uses both gravitational and relative-motion timescales.
The fast-crossing regression catches a collision that endpoint-only checks
with a gravitational-timescale-only step can miss. A finite minimum step and
work budget reject encounters that cannot be resolved at the selected speed.
This is not an exact continuous collision-time solver.

Mergers conserve mass, center of mass, linear momentum, and summed volume.
Tests separate the reduced-mass inelastic kinetic loss from the complete
mechanical-energy change, which also includes removed pair potential and
changed third-body potential. `collisionDelta` records that complete jump.
Relative orbital angular momentum may become remnant spin in a real merger;
the point-body model does not track spin. Angular-momentum conservation should
therefore be assessed on nonmerging intervals, not claimed across a merger.

## Planet properties and equilibrium temperature

The Earth reference uses a mass of `5.9722e24 kg` and mean spherical radius
`6371 km`. Calculated surface gravity, bulk density, and escape speed agree
with the rounded [NASA Earth Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html).
The sphere has no centrifugal reduction, oblateness, or altitude-dependent
interior density model. Gravity, density, and escape-speed scaling tests use
independent radius/mass transformations.

The temperature model balances absorbed stellar power over a projected disk
against blackbody emission over the complete sphere: unit emissivity, uniform
heat redistribution, Bond albedo, no internal heat, and no greenhouse warming.
Its Earth-like result of roughly 255 K is an equilibrium effective temperature,
not the approximately 288 K observed mean surface temperature. Tests check
the inverse-square-root distance and fourth-root luminosity scaling.

## Schwarzschild laboratory

The model is nonrotating, uncharged, spherically symmetric, and isolated.
The horizon is `rs = 2GM/c^2`; the photon sphere and timelike ISCO are
`1.5rs` and `3rs`. Static clocks outside the horizon use
`dTau/dt = sqrt(1-rs/r)`, relative to the asymptotic time coordinate, without
additional orbital-motion time dilation. See [University of Maryland black-hole lectures](https://pages.astro.umd.edu/~richard/ASTR480/A480_black_holes_2019_lec1.pdf)
and [relativity course notes](https://physics.umd.edu/grt/taj/675e/675bnotes.html).
Tests check the approximately 2.95334-km solar-mass horizon and the exact
one-half static clock ratio at `r = 4rs/3`. Static observers at or inside the
horizon are rejected. A drawn accretion disk or lensing illustration is not
a numerically integrated null-geodesic solution.

The bending expression `4GM/(bc^2) = 2rs/b` is the leading weak-field term.
The API requires `b >= 10rs` to avoid the strongest regime, but even that
cutoff does not make the omitted higher-order terms zero or establish an
error bound. It should remain labeled an approximation.

## Rocket laboratory

[NASA's specific-impulse explanation](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/specific-impulse/)
supports the flow relation `thrust = massFlow * Isp * g0`. Tests check actual
propellant depletion and engine cutoff, then compare a complete single-stage
burn in the far-field vacuum limit against the independent logarithmic
[ideal rocket equation](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/ideal-rocket-equation/).
A separate inactive-engine fixture checks Earth freefall. Stage exhaustion
must not create dry mass or load the same stage twice.

The trajectory is planar about a spherical, nonrotating Earth. It includes
inverse-square gravity, a constant-Isp engine, pitch relative to the local
vertical, and a simple exponential atmosphere. It omits winds, Earth rotation,
lift, throttle dynamics, changing pressure-specific engine performance, and
heating. Dynamic pressure is sampled at each step's beginning. Stages split
propellant equally and discard a prescribed fraction of the initial dry mass;
that fraction is a toy vehicle assumption, not a measured rocket design.
The integrator averages partially exhausted thrust over a whole step, so it
does not resolve the exact substep staging/cutoff instant. There is no pad
reaction force: insufficient thrust can produce a ground-impact state.
