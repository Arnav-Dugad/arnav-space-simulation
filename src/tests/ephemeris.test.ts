import { describe, expect, it } from 'vitest';
import { AU_KM } from '../data/planets';
import {
  lunarOffset,
  ephemerisPosition,
  axisOrientation,
  jupiterMoonPositions,
  lunarPhase,
  upcomingEclipses,
} from '../simulation/ephemeris';
import { ephemerisValidationRows } from '../simulation/ephemerisValidation';

const j2000 = Date.UTC(2000, 0, 1, 12);
const dot = (a: number[], b: number[]) => a.reduce((s, v, i) => s + v * b[i], 0);

describe('Referenced ephemerides', () => {
  it('matches 45 independent saved JPL vectors, including five Moon epochs', () => {
    const rows = ephemerisValidationRows();
    expect(rows).toHaveLength(45);
    for (const row of rows) {
      // Upstream accuracy target is ~1 arcminute, not sub-km navigation.
      expect(row.engine.angularArcseconds, `${row.bodyId} at ${row.date}`).toBeLessThan(60);
      if (row.bodyId === 'moon') expect(row.engine.errorKm).toBeLessThan(150);
    }
  });

  it('measures the approximate-element model separately from the engine', () => {
    const rows = ephemerisValidationRows().filter((row) => row.educational);
    expect(rows).toHaveLength(40);
    expect(rows.every((row) => Number.isFinite(row.educational!.errorKm))).toBe(true);
    // A real error comparison must not quietly compare a model against itself.
    expect(rows.some((row) => row.educational!.errorKm > 10000)).toBe(true);
    expect(rows.reduce((s, r) => s + r.engine.errorKm, 0)).toBeLessThan(
      rows.reduce((s, r) => s + r.educational!.errorKm, 0),
    );
  });

  it('preserves relative origins and correct AU scale', () => {
    const earth = ephemerisPosition('earth', j2000);
    const moon = ephemerisPosition('moon', j2000);
    const offset = lunarOffset(j2000);
    for (let i = 0; i < 3; i++) expect(moon[i] - earth[i]).toBeCloseTo(offset[i], 12);
    expect(Math.hypot(...offset) * AU_KM).toBeGreaterThan(350000);
    expect(Math.hypot(...offset) * AU_KM).toBeLessThan(410000);
  });

  it('returns an orthonormal IAU body frame for prograde and retrograde worlds', () => {
    for (const id of ['earth', 'moon', 'venus', 'mars', 'uranus', 'neptune']) {
      const { north, primeMeridian, east, spinDegrees } = axisOrientation(id, j2000);
      expect(Math.hypot(...north)).toBeCloseTo(1, 12);
      expect(Math.hypot(...primeMeridian)).toBeCloseTo(1, 12);
      expect(Math.hypot(...east)).toBeCloseTo(1, 12);
      expect(dot(north, primeMeridian)).toBeCloseTo(0, 12);
      expect(dot(north, east)).toBeCloseTo(0, 12);
      expect(dot(primeMeridian, east)).toBeCloseTo(0, 12);
      expect(spinDegrees).toBeGreaterThanOrEqual(0);
      expect(spinDegrees).toBeLessThan(360);
    }
    // Earth Greenwich at J2000: sidereal angle ~280.46 deg in EQJ.
    const earth = axisOrientation('earth', j2000);
    expect(earth.primeMeridian[0]).toBeCloseTo(Math.cos((280.46 * Math.PI) / 180), 3);
    // Venus W decreases with time, preserving retrograde rotation.
    const w0 = axisOrientation('venus', j2000).spinDegrees;
    const w1 = axisOrientation('venus', j2000 + 86400000).spinDegrees;
    expect(((w1 - w0 + 540) % 360) - 180).toBeLessThan(0);
  });

  it('resolves the four Galilean orbits in Jupiter-relative physical units', () => {
    const moons = jupiterMoonPositions(j2000);
    const expectedKm = { io: 421700, europa: 671100, ganymede: 1070400, callisto: 1882700 };
    for (const id of Object.keys(expectedKm) as (keyof typeof expectedKm)[]) {
      const radius = Math.hypot(...moons[id]) * AU_KM;
      expect(radius / expectedKm[id]).toBeGreaterThan(0.95);
      expect(radius / expectedKm[id]).toBeLessThan(1.05);
    }
  });

  it('finds the observed April 2024 total solar eclipse through shadow geometry', () => {
    const events = upcomingEclipses(Date.UTC(2024, 3, 1), 2);
    const event = events[0];
    expect(event.type).toBe('solar');
    expect(event.kind).toBe('total');
    expect(new Date(event.peak).toISOString().slice(0, 10)).toBe('2024-04-08');
    expect(new Date(event.peak).getUTCHours()).toBe(18);
    expect(event.obscuration).toBe(1);
    expect(lunarPhase(event.peak).illuminatedFraction).toBeLessThan(0.001);
    expect(events[1].peak).toBeGreaterThan(event.peak);
  });

  it('rejects bad dates and unknown model bodies rather than returning fake vectors', () => {
    expect(() => lunarOffset(Number.NaN)).toThrow();
    expect(() => ephemerisPosition('unsupported', j2000)).toThrow();
    expect(() => upcomingEclipses(j2000, 0)).toThrow();
  });
});
