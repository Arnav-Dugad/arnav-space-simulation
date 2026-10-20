import { describe, expect, it } from 'vitest';
import { AU_KM, MU_SUN, planets } from '../data/planets';
import {
  solveKepler,
  orbitPosition,
  hohmann,
  circularVelocity,
  propellant,
  renderPosition,
} from '../simulation/orbital';
import { preset, step, diagnostics, validateBodies, type Body } from '../simulation/nbody';
describe('Orbital mechanics', () => {
  it('solves Kepler’s equation even for high eccentricity', () => {
    for (const e of [0, 0.1, 0.8, 0.99])
      for (const m of [-3, -1, 0, 1, 3]) {
        const E = solveKepler(m, e);
        expect(E - e * Math.sin(E)).toBeCloseTo(m, 10);
      }
  });
  it('matches Earth’s ~29.78 km/s circular speed and sidereal year', () => {
    expect(circularVelocity(MU_SUN, AU_KM)).toBeCloseTo(29.7847, 3);
    const period = (2 * Math.PI * Math.sqrt(AU_KM ** 3 / MU_SUN)) / 86400;
    expect(period).toBeCloseTo(365.2569, 2);
  });
  it('matches the rounded J2000 Earth–Moon barycenter reference position', () => {
    const p = orbitPosition(planets[2], Date.UTC(2000, 0, 1, 12));
    expect(p[0]).toBeCloseTo(-0.17717, 4);
    expect(p[1]).toBeCloseTo(0.96721, 4);
    expect(Math.abs(p[2])).toBeLessThan(1e-5);
  });
  it('keeps each planet within its perihelion and aphelion bounds at J2000', () => {
    for (const p of planets) {
      for (let i = 0; i < 50; i++) {
        const r = Math.hypot(...orbitPosition(p, Date.UTC(2000, 0, 1, 12), (i * Math.PI) / 25));
        const [a, e] = p.elements;
        expect(r).toBeGreaterThanOrEqual(a * (1 - e) - 1e-10);
        expect(r).toBeLessThanOrEqual(a * (1 + e) + 1e-10);
      }
    }
  });
  it('computes an Earth–Mars Hohmann transfer of about 259 days', () => {
    const t = hohmann(AU_KM, 1.52371034 * AU_KM);
    expect(t.days).toBeCloseTo(258.9, 0);
    expect(t.departure).toBeCloseTo(2.945, 2);
    expect(t.arrival).toBeCloseTo(2.649, 2);
    expect(t.phase).toBeCloseTo(44.35, 0);
  });
  it('handles equal-radius transfers and the ideal rocket equation', () => {
    expect(hohmann(AU_KM, AU_KM).total).toBeCloseTo(0, 12);
    expect(propellant(1000, 0, 450)).toBe(0);
    expect(propellant(1000, (9.80665 * 450 * Math.log(2)) / 1000, 450)).toBeCloseTo(1000, 8);
  });
  it('maps ecliptic coordinates without changing proportional angles or handedness', () => {
    expect(renderPosition([1, 0, 0], true)).toEqual([10, 0, -0]);
    expect(renderPosition([0, 1, 0], true)).toEqual([0, 0, -10]);
    expect(renderPosition([0, 0, 1], true)).toEqual([0, 10, -0]);
  });
  it('rejects invalid physics inputs', () => {
    expect(() => solveKepler(0, 1)).toThrow();
    expect(() => circularVelocity(1, 0)).toThrow();
    expect(() => propellant(1, 1, 0)).toThrow();
    expect(() => hohmann(-1, 2)).toThrow();
  });
});
describe('Velocity Verlet gravity solver', () => {
  it('preserves orbital energy and angular momentum over 10 Earth orbits', () => {
    const bodies = preset('solar');
    const first = diagnostics(bodies);
    for (let i = 0; i < 50000; i++) step(bodies, 0.0002, false);
    const last = diagnostics(bodies);
    expect(Math.abs((last.energy - first.energy) / first.energy)).toBeLessThan(1e-7);
    expect(
      Math.abs((last.angularMomentum - first.angularMomentum) / first.angularMomentum),
    ).toBeLessThan(1e-10);
    expect(Math.hypot(...bodies[1].p)).toBeCloseTo(1, 4);
  });
  it('preserves binary separation and stationary center of mass', () => {
    const bodies = preset('binary');
    for (let i = 0; i < 10000; i++) step(bodies, 0.0001, false);
    expect(Math.hypot(...bodies[0].p.map((v, k) => v - bodies[1].p[k]))).toBeCloseTo(1, 5);
    expect(Math.hypot(...diagnostics(bodies).com)).toBeLessThan(1e-12);
  });
  it('merges colliding bodies while conserving mass and momentum', () => {
    const bodies: Body[] = [
      { id: 'a', name: 'A', mass: 1, radius: 1, color: '#ffffff', p: [0, 0, 0], v: [1, 0, 0] },
      { id: 'b', name: 'B', mass: 2, radius: 1, color: '#ffffff', p: [0.5, 0, 0], v: [-0.5, 0, 0] },
    ];
    step(bodies, 1e-8, true);
    expect(bodies).toHaveLength(1);
    expect(bodies[0].mass).toBe(3);
    expect(bodies[0].v[0]).toBeCloseTo(0, 10);
    expect(bodies[0].radius).toBeCloseTo(Math.cbrt(2), 10);
  });
  it('supports non-merging fly-through collisions', () => {
    const bodies = preset('collision');
    bodies[1].p = [-0.5, 0, 0];
    step(bodies, 1e-8, false);
    expect(bodies).toHaveLength(2);
  });
  it('validates imported files and isolates cloned state', () => {
    expect(() => validateBodies([])).toThrow();
    expect(() => validateBodies([{ ...preset('solar')[0], mass: NaN }])).toThrow();
    expect(() => validateBodies([{ ...preset('solar')[0], color: 'url(bad)' }])).toThrow();
    expect(() => validateBodies([preset('solar')[0], preset('solar')[0]])).toThrow();
    const p = preset('solar');
    const copy = validateBodies(p);
    copy[0].p[0] = 10;
    expect(p[0].p[0]).toBe(0);
  });
});
