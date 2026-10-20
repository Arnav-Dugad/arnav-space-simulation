# Arnav Space Simulation data sources

The bundled JSON files are reproducible snapshots, not live feeds. Each has `{ metadata, records }`; metadata includes retrieval time in UTC, source URL, field units, attribution, limitations and record count. Missing provider values remain `null`. Retrieval time is not the epoch of a measurement or orbit. Sources were inspected on 20 October 2026.

## Space stations

`public/data/stations.json` contains the 21 records returned by [CelesTrak's stations GP query](https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=JSON). Original OMM field names and values are retained. `EPOCH` is UTC; angular elements are degrees and `MEAN_MOTION` is revolutions per day. The provider documents the omitted constants: Earth center, TEME frame, UTC time system and SGP4 theory.

Credit CelesTrak / Dr. T. S. Kelso and the underlying US Space Force orbital elements. Public availability does not establish a separate Creative Commons license. The [CelesTrak usage policy](https://celestrak.org/usage-policy.php) requires caching, requests no more often than the two-hour GP update interval, and stopping on non-200 responses. This release serves its saved snapshot and does not poll CelesTrak from visitors' browsers. Predictions require SGP4 and become less dependable away from each record's epoch; maneuvers can invalidate them. [Format reference](https://celestrak.org/NORAD/documentation/gp-data-formats.php).

## Exoplanets

`public/data/exoplanets.json` contains 24 curated examples from the NASA Exoplanet Archive's `pscomppars` table. The exact TAP query is retained in `metadata.sourceUrl`. It requested 25 names; `beta Pic b` did not match and was omitted rather than replaced. This is an educational selection, not a representative population sample. Composite rows may combine incompatible parameter determinations from different publications.

Native field names are preserved. `pl_orbper` is days, `pl_rade` Earth radii, `pl_bmasse` Earth masses, `pl_orbsmax` au and `sy_dist` parsecs. Uncertainty columns ending `err1` and `err2` are the upper and signed lower errors. A missing error is unknown, not zero. `pl_bmassprov` identifies mass versus minimum-mass interpretations. Corresponding `*lim` columns distinguish measurements from limits. The retained `*_reflink` values identify individual literature references or calculated estimates. Treat them as text; extract and validate links before rendering, rather than injecting provider HTML.

Credit the NASA Exoplanet Archive, operated by Caltech for NASA's Exoplanet Exploration Program, and the individual parameter papers. Cite the [PSCompPars dataset, DOI 10.26133/NEA13](https://doi.org/10.26133/NEA13) and [Christiansen et al. (2025), DOI 10.3847/PSJ/ade3c2](https://doi.org/10.3847/PSJ/ade3c2). We do not relicense the source scientific data as project code. Consult the archive's [acknowledgment guidance](https://exoplanetarchive.ipac.caltech.edu/docs/acknowledge.html), [TAP documentation](https://exoplanetarchive.ipac.caltech.edu/docs/TAP/usingTAP.html) and [column definitions](https://exoplanetarchive.ipac.caltech.edu/docs/API_PS_columns.html).

## Asteroid and comet encounters

`public/data/approaches.json` contains the first 40 of 48 matching NASA/JPL Small-Body Database close-approach predictions within 0.05 au of Earth, from 20 October 2026 through 18 January 2027. The API response signature was checked against documented version **1.5**. Array rows were converted to objects using the provider's returned `fields` list. Numeric strings preserve source precision; null diameters remain unknown.

`jd` and `cd` are **TDB**, not UTC. `dist`, `dist_min` and `dist_max` are au; the latter two are **3-sigma** distance bounds. `v_rel` and `v_inf` are km/s. `diameter_sigma` is a **1-sigma** diameter uncertainty in km. `t_sigma_f` is a formatted **3-sigma** time uncertainty. `orbit_id` identifies the solution behind each prediction. These are predicted encounters, not observations or an impact-risk list.

Credit NASA/JPL-Caltech, SBDB and CNEOS. Retain scientific source attribution and do not imply NASA endorsement. [CAD documentation](https://ssd-api.jpl.nasa.gov/doc/cad.html). The [API fair-use rules](https://ssd-api.jpl.nasa.gov/doc/) prohibit embedding the API in a website, require serialized requests, reasonable caching, error backoff and an application-specific User-Agent with contact information. The release uses bundled data; future refresh jobs must follow those rules. No NASA logos or branding assets are bundled.

## Real bright-star directions

`public/data/bright-stars.json` is a modified subset of **HYG Database v4.1**, David Nash / Astronexus, compiled from Hipparcos, Yale Bright Star and Gliese data. [Original CSV](https://raw.githubusercontent.com/astronexus/HYG-Database/main/hyg/CURRENT/hygdata_v41.csv), [field documentation](https://github.com/astronexus/HYG-Database/blob/main/hyg/README.md), [license statement](https://github.com/astronexus/HYG-Database/blob/main/LICENSE).

The **925-star derived catalog remains [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)**, separate from the code license. Redistribution must retain attribution, the license link, modification notice and the same license for adapted catalog data. Changes: exclude Sol, filter V magnitude at or brighter than 4.5, retain selected fields, convert right ascension from hours to degrees, rename fields and sort by magnitude. Names prefer the catalog proper name, then Bayer/Flamsteed designation, then Hipparcos ID. `raDeg` and `decDeg` have epoch and equinox **J2000.0**; `mag` is apparent visual magnitude; `colorIndex` is B−V. Current-date precession, aberration and proper motion are not applied by this snapshot.

## Earth close-up texture

`public/textures/earth_high.jpg` is NASA's January 2004 **Blue Marble: Next Generation** base map, reduced from 21,600 × 10,800 to **8,192 × 4,096** pixels using bicubic resampling and JPEG quality 90. It is a historical monthly surface composite, not a current photograph or seasonal live feed. Credit **NASA Earth Observatory / NASA Goddard Space Flight Center, Reto Stöckli and Robert Simmon**, with the MODIS instrument and science teams.

[NASA source and downloads](https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/), [original JPEG](https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-base/january/world.200401.3x21600x10800.jpg), [NASA media use guidance](https://www.nasa.gov/nasa-brand-center/images-and-media/). NASA imagery is generally reusable for educational and informational purposes under its media guidance; do not imply endorsement. This NASA image is distinct from the separately credited Solar System Scope textures already bundled in the project.

An attempted download of Solar System Scope's verified CC BY 4.0 8k Earth map returned HTTP 403; its verified Wikimedia Commons mirror returned HTTP 429. Those downloads were stopped and are not bundled or passed off as acquired assets. The NASA source above provides actual high-resolution data instead.

The base map's orientation was verified against NASA's linked [5,400 × 2,700 companion GeoTIFF](https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-base/january/world.200401.3x5400x2700_geo.tif). GeoTIFF tags identify WGS 84 / EPSG:4326, pixel scales approximately 0.0666667 degrees, and the upper-left corner at longitude −180°, latitude +90°. Thus Greenwich is at the image center, north is at the top, east increases to the right and the seam lies at ±180°. The decoded values and their source are retained in `public/data/earth-texture.json`. This establishes texture coordinates; celestial orientation still depends on the renderer's body frame and rotation model.

## Earth elevation visualization

`public/textures/earth_relief.jpg` is NASA Earth Observatory's unmodified **5,400 × 2,700** land topography visualization, with provenance and checksum in `public/data/earth-relief.json`. Credit **Jesse Allen, NASA Earth Observatory, using GEBCO data produced by the British Oceanographic Data Centre**. [NASA source and downloads](https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/topography-bathymetry-maps/), [original JPEG](https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/topography/gebco_08_rev_elev_5400x2700.jpg), [GEBCO_08 documentation and terms](https://www.bodc.ac.uk/data/hosted_data_systems/gebco_gridded_bathymetry_data/documents/gebco_08.pdf), [NASA media guidance](https://www.nasa.gov/nasa-brand-center/images-and-media/).

NASA documents the visualization as scaled over 0–6,400 meters. It is a historical compiled elevation visualization with no single acquisition epoch, not a normal map or an observed current surface. Treat the JPEG as a labelled educational topography layer; its quantization, clipping and coarse spatial resolution make it unsuitable for precise height measurements. Any rendered displacement or bump exaggeration should be separately identified. Source attribution is retained; no agency endorsement is implied.

This asset is separate from the code's MIT license. The original GEBCO_08 terms permit credited derivative reproductions for educational, research, conservation and other noncommercial uses. They ask users to contact BODC before commercial use or onward distribution of the source grid. This project uses NASA's derivative visualization for education; the raw grid is not distributed. Do not apply newer GEBCO releases' public-domain statements to GEBCO_08 without checking the applicable source terms.

## Propagation verification

`src/tests/catalogs.test.ts` checks the installed SGP4 implementation against two independently published TEME state vectors for satellite 00005, from Vallado et al., [AIAA 2006-6753 Rev 2, appendices D and E](https://celestrak.org/publications/AIAA/2006-6753/AIAA-2006-6753-Rev2.pdf). It additionally checks the bundled OMM epoch handling and physical ranges, ISS orbital inclination and period, source metadata, uncertainty signs, missing values, catalog limits and J2000 star directions. These regressions verify implementation and data contracts; they do not establish real-world tracking accuracy for stale elements.
