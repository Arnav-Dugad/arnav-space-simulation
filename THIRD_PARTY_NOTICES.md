# Imagery and data credits

## Planet maps

The original thirteen 2K maps listed below in `public/textures/` are by **Solar System Scope / INOVE**, based on NASA imagery and elevation data. They are distributed under [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/). The newer `earth_high.jpg` and `earth_relief.jpg` have separate provenance and terms below.

Source: https://www.solarsystemscope.com/textures/

The maps are bundled unmodified at 2K resolution, with filenames simplified. Colors and geographic gaps were adjusted by the original creators. Earth clouds are used as a transparent material; the Saturn ring map is remapped onto a ring mesh. Surface textures are illustrative maps, not current observations.

Mercury was obtained from the [Wikimedia Commons copy](https://commons.wikimedia.org/wiki/File:Solarsystemscope_texture_2k_mercury.jpg) of the same Solar System Scope map. The remaining maps were downloaded directly from the provider. Files: mercury, venus_atmosphere, earth_daymap, earth_clouds, earth_nightmap, mars, jupiter, saturn, saturn_ring, uranus, neptune, sun, moon. The night map supplies Earth's night-side city lights and the labelled observation layer.

## Additional imagery and catalogs

- `earth_high.jpg`: NASA Blue Marble Next Generation, January 2004, reduced to 8192 × 4096. Credit NASA Earth Observatory / NASA Goddard, Reto Stöckli and Robert Simmon, MODIS teams. NASA media use guidance applies; no endorsement is implied.
- `earth_relief.jpg`: NASA Earth Observatory / Jesse Allen, using GEBCO_08 data produced by BODC. This is a derivative elevation visualization, not a height grid. The original GEBCO_08 terms permit credited educational and noncommercial reproductions; do not apply MIT or newer GEBCO public-domain terms to this asset.
- `bright-stars.json`: derived subset of HYG v4.1, David Nash / Astronomy Nexus, under **CC BY-SA 4.0**. The derivative catalog retains that license separately from the MIT application code.
- CelesTrak station OMM snapshot: Dr. T. S. Kelso / CelesTrak and underlying US Space Force elements. Cached snapshot, not a live feed. Provider use policy applies.
- NASA Exoplanet Archive: NASA / Caltech-IPAC; preserve individual publication references and uncertainty/mass provenance.
- JPL close-approach and Horizons vector snapshots: NASA/JPL Solar System Dynamics. Source queries, retrieval dates, frame, epoch and field units remain in JSON metadata.

Full source links, transformation details, applicable terms, checksums and limitations: [DATA_SOURCES.md](docs/DATA_SOURCES.md). Ephemeris attribution and independent reference queries: [EPHEMERIS.md](docs/EPHEMERIS.md).

## Scientific reference sources

- [NASA/JPL approximate planetary positions](https://ssd.jpl.nasa.gov/planets/approx_pos.html): Table 1 elements and secular rates, 1800–2050, mean ecliptic and equinox of J2000. The Earth entry is the Earth–Moon barycenter. Published by JPL from Standish and Williams. Attribution is retained here and in the interface.
- [NASA/NSSDC Planetary Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/): rounded physical parameters. Equatorial radius is half the listed diameter. Major moon names are curated, not a current complete moon-count catalog.
- [IAU 2015 Resolution B3](https://www.iau.org/static/resolutions/IAU2015_English.pdf): nominal solar gravitational parameter, 1.3271244 × 10²⁰ m³/s². The more precise conventional value used in the engine is 1.32712440018 × 10¹¹ km³/s²; the difference is immaterial to this educational approximation.
- [NIST standard gravity](https://physics.nist.gov/cgi-bin/cuu/Value?gn): 9.80665 m/s² in the ideal rocket equation.
- Figure-eight three-body preset: rounded initial conditions of Chenciner and Montgomery's equal-mass figure-eight solution (2000), expressed in the normalized units of the engine. It is a numerical initial condition, not a pre-recorded animation.

Sources checked 20 October 2026. Arnav Space Simulation is independent and does not imply endorsement by NASA, JPL, INOVE, or the IAU.

## Software and typefaces

React, Three.js, Lucide, Vite, TypeScript, and the development tools retain their respective package licenses. Astronomy Engine by Don Cross and satellite.js by Shashwat Kandadai and contributors use MIT licenses. DM Sans and Manrope are bundled through Fontsource under the SIL Open Font License; license texts are included in their installed packages. Both fonts are served locally, with system sans-serif fallbacks.
