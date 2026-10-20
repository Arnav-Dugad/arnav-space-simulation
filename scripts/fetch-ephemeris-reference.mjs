// Regenerate public NASA/JPL reference vectors. Uses a small sequential request
// queue: Horizons may return HTML on transient server/rate-limit errors.
import fs from 'node:fs';

const dates = [
  '2000-01-01T12:00:00Z',
  '2010-01-01T00:00:00Z',
  '2024-01-01T00:00:00Z',
  '2026-10-20T00:00:00Z',
  '2050-01-01T00:00:00Z',
];
const epochs = dates.map((d) => Date.parse(d) / 86400000 + 2440587.5);
const ids = {
  mercury: '199',
  venus: '299',
  earth: '399',
  mars: '499',
  jupiter: '5',
  saturn: '6',
  uranus: '7',
  neptune: '8',
  moon: '301',
};
const targets = [];
for (const [id, command] of Object.entries(ids)) {
  const params = new URLSearchParams({
    format: 'json',
    COMMAND: `'${command}'`,
    OBJ_DATA: "'NO'",
    MAKE_EPHEM: "'YES'",
    EPHEM_TYPE: "'VECTORS'",
    CENTER: id === 'moon' ? "'500@399'" : "'500@10'",
    TLIST: `'${epochs.join(' ')}'`,
    OUT_UNITS: "'AU-D'",
    REF_PLANE: "'ECLIPTIC'",
    REF_SYSTEM: "'ICRF'",
    VEC_CORR: "'NONE'",
    VEC_TABLE: "'2'",
    CSV_FORMAT: "'YES'",
    TIME_TYPE: "'UT'",
  });
  const url = 'https://ssd.jpl.nasa.gov/api/horizons.api?' + params;
  let payload;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url);
      payload = await response.json();
      if (!response.ok || payload.error || !payload.result?.includes('$$SOE'))
        throw new Error(JSON.stringify(payload));
      break;
    } catch (error) {
      if (attempt === 2) throw new Error(`${id}: ${error}`);
    }
  }
  const lines = payload.result.split('$$SOE')[1].split('$$EOE')[0].trim().split('\n');
  const samples = lines.map((line, i) => {
    const p = line.split(',').map((x) => x.trim());
    return {
      date: dates[i],
      julianDayUTC: Number(p[0]),
      positionAU: p.slice(2, 5).map(Number),
      velocityAUPerDay: p.slice(5, 8).map(Number),
    };
  });
  if (
    samples.length !== dates.length ||
    samples.some((s) => s.positionAU.length !== 3 || s.positionAU.some((v) => !Number.isFinite(v)))
  )
    throw new Error('Malformed Horizons rows');
  targets.push({
    id,
    targetId: command,
    centerId: id === 'moon' ? '399' : '10',
    kernel: payload.result.match(/Target body name:.*\{source: ([^}]+)/)?.[1] ?? 'see Horizons',
    query: url,
    samples,
  });
  console.log(`Fetched ${id}: ${samples.length} reference vectors`);
}
const dataset = {
  title: 'JPL Horizons geometric reference vectors',
  retrievedAt: new Date().toISOString(),
  source: 'https://ssd.jpl.nasa.gov/horizons/',
  apiDocumentation: 'https://ssd-api.jpl.nasa.gov/doc/horizons.html',
  frame: 'J2000 mean ecliptic, ICRF X axis',
  units: 'AU and AU/day',
  timeScale: 'UTC; Horizons TIME_TYPE=UT, epochs after 1962',
  corrections: 'NONE: geometric positions, no light time or aberration',
  notes: [
    'Mercury, Venus, Earth and Mars use body centers. Outer planets use system barycenters, matching JPL approximate-element intent; center/barycenter differences remain part of a comparison with planet-center engine vectors.',
    'The educational Earth orbit in orbital.ts represents Earth-Moon barycenter; comparison against Earth center includes lunar displacement.',
    'Five sparse epochs are validation samples, not an accuracy guarantee across the full date range. Horizons uses IAU76 ecliptic obliquity; Astronomy Engine uses its J2000 mean-ecliptic conversion, a very small frame difference.',
  ],
  targets,
};
fs.mkdirSync('public/data', { recursive: true });
fs.writeFileSync('public/data/ephemeris-reference.json', JSON.stringify(dataset, null, 2) + '\n');
