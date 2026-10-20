# Ephemerides and coordinate conventions

`src/simulation/ephemeris.ts` adapts Astronomy Engine 2.1.19. Every date argument
is a UTC JavaScript timestamp in milliseconds. The adapter passes `Date` objects
to the library, avoiding its different interpretation of numeric dates.

All adapter position vectors use right-handed J2000 mean-ecliptic axes and AU.
Moon vectors are relative to Earth; Galilean moon vectors are relative to
Jupiter. Planet vectors are relative to the Sun. They are geometric positions,
with no apparent-position light-time shift. Rendering should perform the existing
`(x, y, z) -> (x, z, -y)` transform only after the physical calculation.

## Source models

- [Astronomy Engine source and model overview](https://github.com/cosinekitty/astronomy):
  compact analytical planetary calculations with an upstream angular accuracy
  target of about one arcminute. That target is not a per-value uncertainty or
  a claim of spacecraft-navigation precision.
- [Library reference](https://github.com/cosinekitty/astronomy/blob/master/source/js/README.md):
  `GeoMoon` uses the Improved Lunar Ephemeris/Brown lunar theory adaptation;
  the library source attributes its Galilean calculations to the L1.2 model by
  Duriez, Lainey, and Vienne.
- [IAU WGCCRE rotational elements](https://astropedia.astrogeology.usgs.gov/download/Docs/WGCCRE/WGCCRE2015reprint.pdf):
  the library's `RotationAxis` source for planetary pole and prime-meridian
  orientation. Earth additionally uses precession/nutation. Its Greenwich basis
  is calculated from apparent sidereal time and the equator-of-date transform,
  rather than combining its spin field with a generic planetary pole formula.

The orientation adapter returns orthonormal `primeMeridian`, `east`, and `north`
basis vectors. Venus and Uranus preserve their retrograde rotation. IAU north
does not always mean the angular-momentum direction. A surface map must still
have a verified longitude convention and UV origin before its texture can be
called longitude-calibrated.

## Independent reference samples

`public/data/ephemeris-reference.json` contains 45 actual
[JPL Horizons](https://ssd.jpl.nasa.gov/horizons/) vectors retrieved on
2026-10-20. Every target includes the exact API query and returned kernel name.
Epochs are 2000-01-01 12:00 UTC and midnight UTC on 2010-01-01, 2024-01-01,
2026-10-20, and 2050-01-01. Positions are geometric J2000 ecliptic vectors.
Run `node scripts/fetch-ephemeris-reference.mjs` to retrieve them again.

Observed maximum three-dimensional position residuals across those five dates:

| Body | Astronomy Engine, km | Approximate-element model, km |
| --- | ---: | ---: |
| Mercury | 3,662 | 6,771 |
| Venus | 3,380 | 8,332 |
| Earth | 2,188 | 14,240 |
| Mars | 4,186 | 67,951 |
| Jupiter | 42,839 | 1,148,891 |
| Saturn | 127,714 | 3,848,817 |
| Uranus | 180,841 | 1,453,742 |
| Neptune | 432,291 | 1,129,254 |
| Geocentric Moon | 24 | Not modeled |

These are measured sample residuals, not error bounds for other dates. All
45 Astronomy Engine samples have angular residuals below 60 arcseconds.
Planetary distance makes a small angular residual correspond to a large
position residual at the outer planets.

Mercury, Venus, Earth, and Mars references use body centers. Outer-planet
references use planetary-system barycenters. The approximate Earth elements
refer to the Earth-Moon barycenter, so their Earth-center comparison includes
the displacement caused by the Moon. The Horizons J2000 ecliptic definition
uses IAU76 obliquity; a small frame-definition difference remains against the
library conversion. Do not use the table as a clean isolated measurement of
only the planetary series truncation error.

`ephemerisValidationRows()` calculates residuals against the saved data; it
does not generate reference values from the tested model. The tests also
check coordinate origins, physical moon distances, orientation orthogonality,
retrograde motion, and the 2024-04-08 total solar eclipse.

## Eclipse results

`upcomingEclipses` searches the library's physical solar/lunar shadow geometry.
Global solar events do not imply visibility at the user's location. For a
partial global solar eclipse, the adapter preserves undefined peak coordinates
and obscuration as `null`; it does not invent an observing location or value.
