import { describe, expect, it } from 'vitest';
import {
  eciToGeodetic,
  gstime,
  jday,
  json2satrec,
  propagate,
  sgp4,
  twoline2satrec,
} from 'satellite.js';
import stations from '../../public/data/stations.json';
import approaches from '../../public/data/approaches.json';
import exoplanets from '../../public/data/exoplanets.json';
import stars from '../../public/data/bright-stars.json';

const radians = Math.PI / 180;
const verifiedOMM = (row: (typeof stations.records)[number]): Parameters<typeof json2satrec>[0] => {
  if (row.EPHEMERIS_TYPE !== 0 || row.CLASSIFICATION_TYPE !== 'U')
    throw new Error('Unsupported or classified orbital elements');
  return { ...row, EPHEMERIS_TYPE: 0, CLASSIFICATION_TYPE: 'U' };
};

describe('Bundled astronomy catalog contracts', () => {
  it('retains source identity, retrieval UTC, units and honest snapshot metadata', () => {
    for (const catalog of [stations, approaches, exoplanets, stars]) {
      const meta = catalog.metadata;
      expect(meta.schemaVersion).toBe(1);
      expect(meta.recordCount).toBe(catalog.records.length);
      expect(catalog.records.length).toBeGreaterThan(0);
      expect(meta.retrievedAt).toMatch(/Z$/);
      expect(Number.isFinite(Date.parse(meta.retrievedAt))).toBe(true);
      expect(new URL(meta.sourceUrl).protocol).toBe('https:');
      expect(new URL(meta.documentationUrl).protocol).toBe('https:');
      expect(meta.sourceSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(meta.attribution.length).toBeGreaterThan(20);
      expect(meta.notes.length).toBeGreaterThan(1);
      expect(Object.keys(meta.units).length).toBeGreaterThan(2);
    }
    expect(stations.metadata.epoch).toContain('Per-record');
    expect(exoplanets.metadata.epoch).toBeNull();
    expect(stars.metadata.license).toBe('CC BY-SA 4.0');
  });

  it('keeps uncertainty, limits and mass provenance instead of manufacturing measurements', () => {
    // These selected records exercise three materially different data interpretations.
    const proxima = exoplanets.records.find((r) => r.pl_name === 'Proxima Cen b')!;
    const kepler22 = exoplanets.records.find((r) => r.pl_name === 'Kepler-22 b')!;
    const kepler186 = exoplanets.records.find((r) => r.pl_name === 'Kepler-186 f')!;
    expect(proxima.pl_bmassprov).toBe('Msini');
    expect(kepler22.pl_bmasselim).toBe(1);
    expect(kepler186.pl_bmassprov).toBe('M-R relationship');
    const pegasi = exoplanets.records.find((r) => r.pl_name === '51 Peg b')!;
    expect(pegasi.pl_rade_reflink).toContain('Calculated Value');
    expect(pegasi.pl_radeerr1).toBeNull();
    expect(pegasi.pl_radeerr2).toBeNull();
    expect(pegasi.pl_bmasseerr1).not.toBe(-pegasi.pl_bmasseerr2!);
    for (const row of exoplanets.records) {
      for (const key of ['pl_rade', 'pl_bmasse', 'pl_orbper', 'pl_eqt'] as const) {
        const upper = row[`${key}err1`];
        const lower = row[`${key}err2`];
        if (upper !== null) expect(upper, `${row.pl_name} ${key} upper`).toBeGreaterThanOrEqual(0);
        if (lower !== null) expect(lower, `${row.pl_name} ${key} lower`).toBeLessThanOrEqual(0);
      }
    }
  });

  it('preserves CAD time scales, statistical bounds, precision and absent diameters', () => {
    expect(approaches.metadata.apiVersion).toBe('1.5');
    expect(approaches.metadata.units.cd).toBe('calendar TDB');
    expect(approaches.metadata.units.dist_min).toContain('3-sigma');
    expect(approaches.metadata.units.diameter_sigma).toContain('1-sigma');
    expect(approaches.metadata.totalMatching).toBeGreaterThanOrEqual(approaches.records.length);
    let previousJulianDate = -Infinity;
    for (const row of approaches.records) {
      expect(typeof row.jd).toBe('string');
      expect(typeof row.dist).toBe('string');
      const jd = Number(row.jd),
        distance = Number(row.dist);
      expect(jd).toBeGreaterThanOrEqual(previousJulianDate);
      previousJulianDate = jd;
      expect(Number(row.dist_min)).toBeLessThanOrEqual(distance);
      expect(Number(row.dist_max)).toBeGreaterThanOrEqual(distance);
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThanOrEqual(approaches.metadata.queryWindow.maximumDistanceAu);
      expect(row.cd).toMatch(/^\d{4}-[A-Z][a-z]{2}-\d{2} \d{2}:\d{2}$/);
      expect(row.t_sigma_f).toMatch(/\d{2}:\d{2}/);
      // Unknown diameter and its error must remain unknown together, never numeric zero.
      if (row.diameter === null) expect(row.diameter_sigma).toBeNull();
    }
    expect(approaches.records.some((r) => r.diameter === null)).toBe(true);
  });

  it('keeps actual J2000 stars in physical coordinate and brightness ranges', () => {
    expect(stars.metadata.epoch).toContain('J2000.0');
    expect(stars.records.length).toBeGreaterThan(500);
    expect(new Set(stars.records.map((r) => r.id)).size).toBe(stars.records.length);
    for (const star of stars.records) {
      expect(star.id).not.toBe(0); // The Sun is deliberately excluded from the fixed starfield.
      expect(star.raDeg).toBeGreaterThanOrEqual(0);
      expect(star.raDeg).toBeLessThan(360);
      expect(star.decDeg).toBeGreaterThanOrEqual(-90);
      expect(star.decDeg).toBeLessThanOrEqual(90);
      expect(star.mag).toBeGreaterThan(-2);
      expect(star.mag).toBeLessThanOrEqual(4.5);
      const dec = star.decDeg * radians,
        ra = star.raDeg * radians;
      expect(
        Math.hypot(Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec)),
      ).toBeCloseTo(1, 12);
    }
    // Sirius at approximately 06h45m09s, -16deg43m: catches RA-hour/degree confusion.
    const sirius = stars.records.find((r) => r.name === 'Sirius')!;
    expect(sirius.raDeg).toBeCloseTo(101.287, 2);
    expect(sirius.decDeg).toBeCloseTo(-16.716, 2);
    expect(sirius.mag).toBeLessThan(-1.4);
    const polaris = stars.records.find((r) => r.name === 'Polaris')!;
    expect(polaris.decDeg).toBeGreaterThan(89);
  });
});

describe('SGP4 propagation used by the satellite catalog', () => {
  it('matches independent Vallado verification vectors at epoch and six hours', () => {
    // Vallado et al., AIAA 2006-6753 Rev 2, appendices D/E, satellite 00005.
    // https://celestrak.org/publications/AIAA/2006-6753/AIAA-2006-6753-Rev2.pdf
    // TEME km and km/s; WGS-72 verification data, not outputs copied from this application.
    const sat = twoline2satrec(
      '1 00005U 58002B   00179.78495062  .00000023  00000-0  28098-4 0  4753',
      '2 00005  34.2682 348.7242 1859667 331.7664  19.3264 10.82419157413667',
    );
    const reference = [
      {
        minutes: 0,
        position: [7022.46529266, -1400.08296755, 0.03995155],
        velocity: [1.893841015, 6.405893759, 4.53480725],
      },
      {
        minutes: 360,
        position: [-7154.03120202, -3783.17682504, -3536.19412294],
        velocity: [4.741887409, -4.151817765, -2.093935425],
      },
    ];
    for (const sample of reference) {
      const state = sgp4(sat, sample.minutes);
      if (!state) throw new Error('Vallado reference propagation failed');
      for (const [i, axis] of (['x', 'y', 'z'] as const).entries()) {
        expect(state.position[axis]).toBeCloseTo(sample.position[i], 6);
        expect(state.velocity[axis]).toBeCloseTo(sample.velocity[i], 8);
      }
    }
  });

  it('interprets CelesTrak epochs as UTC and propagates genuine OMM records', () => {
    for (const row of stations.records) {
      const epoch = new Date(`${row.EPOCH.replace(/Z$/, '')}Z`);
      expect(Number.isFinite(epoch.valueOf())).toBe(true);
      const sat = json2satrec(verifiedOMM(row));
      // ISO strings omit Z because TIME_SYSTEM=UTC is implicit in this provider format.
      expect(sat.jdsatepoch).toBeCloseTo(jday(epoch), 8);
      const state = propagate(sat, epoch);
      if (!state) throw new Error(`OMM propagation failed: ${row.OBJECT_NAME}`);
      const radius = Math.hypot(state.position.x, state.position.y, state.position.z);
      const speed = Math.hypot(state.velocity.x, state.velocity.y, state.velocity.z);
      expect(radius).toBeGreaterThan(6378);
      expect(radius).toBeLessThan(10000);
      expect(speed).toBeGreaterThan(6);
      expect(speed).toBeLessThan(9);
      const geo = eciToGeodetic(state.position, gstime(epoch));
      expect(geo.latitude).toBeGreaterThanOrEqual(-Math.PI / 2);
      expect(geo.latitude).toBeLessThanOrEqual(Math.PI / 2);
      expect(geo.longitude).toBeGreaterThanOrEqual(-Math.PI);
      expect(geo.longitude).toBeLessThanOrEqual(Math.PI);
      expect(geo.height).toBeGreaterThan(100);
      // The upstream stations group also includes FREGAT debris above 2,000 km.
      expect(geo.height).toBeLessThan(4000);
    }
  });

  it('keeps ISS altitude, period and inclination consistent with the actual elements', () => {
    const row = stations.records.find((r) => r.NORAD_CAT_ID === 25544)!;
    const epoch = new Date(`${row.EPOCH}Z`),
      state = propagate(json2satrec(verifiedOMM(row)), epoch);
    if (!state) throw new Error('ISS propagation failed');
    const r = state.position,
      v = state.velocity;
    const h = [r.y * v.z - r.z * v.y, r.z * v.x - r.x * v.z, r.x * v.y - r.y * v.x];
    const inclination = Math.acos(h[2] / Math.hypot(...h)) / radians;
    expect(inclination).toBeCloseTo(row.INCLINATION, 1);
    const geo = eciToGeodetic(r, gstime(epoch));
    expect(geo.height).toBeGreaterThan(350);
    expect(geo.height).toBeLessThan(500);
    expect(1440 / row.MEAN_MOTION).toBeGreaterThan(90);
    expect(1440 / row.MEAN_MOTION).toBeLessThan(96);
    // Independent Kepler estimate checks km/s units and sensible mean-motion conversion.
    const radius = Math.hypot(r.x, r.y, r.z);
    const circularPeriodMinutes = (2 * Math.PI * Math.sqrt(radius ** 3 / 398600.4418)) / 60;
    expect(Math.abs(circularPeriodMinutes / (1440 / row.MEAN_MOTION) - 1)).toBeLessThan(0.01);
  });
});
