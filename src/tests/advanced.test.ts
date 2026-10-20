import { describe, expect, it } from 'vitest';
import {
  adaptiveStep,
  blackHole,
  burn,
  keplerBody,
  norm,
  orbitalState,
  planetProperties,
  rocketInitial,
  rocketStep,
  type RocketConfig,
} from '../simulation/advanced';
import { diagnostics, G, preset, step, type Body } from '../simulation/nbody';

const body = (id: string, mass: number, p: Body['p'], v: Body['v'], radius = 0.001): Body => ({
  id,
  name: id,
  mass,
  radius,
  color: '#ffffff',
  p,
  v,
});
const rocket: RocketConfig = {
  dryMass: 1000,
  fuel: 1000,
  thrust: 10,
  isp: 300,
  cd: 0,
  area: 1,
  pitch: 0,
  throttle: 1,
  stages: 1,
};

describe('Independent orbital identities', () => {
  it('creates a unit circular orbit with a one-year Kepler period', () => {
    const world = keplerBody(1, 0, 0, 0, 0, 0, 1);
    expect(world.p).toEqual([1, 0, 0]);
    expect(world.v[0]).toBeCloseTo(0, 12);
    expect(world.v[1]).toBeCloseTo(2 * Math.PI, 12);
    const state = orbitalState(world.p, world.v);
    expect(state.period).toBeCloseTo(1, 12);
    expect(state.e).toBeCloseTo(0, 12);
    expect(state.classification).toBe('Circular');
  });

  it('preserves eccentric periapsis/apoapsis and rotates the orbit into a polar plane', () => {
    const periapsis = keplerBody(2, 0.5, 90, 90, 0, 0, 1);
    expect(periapsis.p[0]).toBeCloseTo(0, 12);
    expect(periapsis.p[1]).toBeCloseTo(1, 12);
    expect(periapsis.p[2]).toBeCloseTo(0, 12);
    expect(periapsis.v[2]).toBeCloseTo(Math.sqrt(1.5 * G), 12);
    const apoapsis = keplerBody(2, 0.5, 90, 90, 0, 180, 1);
    expect(norm(apoapsis.p)).toBeCloseTo(3, 12);
    // Specific angular momentum and orbital energy are invariant under rotation.
    for (const world of [periapsis, apoapsis]) {
      const state = orbitalState(world.p, world.v);
      expect(state.a).toBeCloseTo(2, 12);
      expect(state.e).toBeCloseTo(0.5, 12);
      expect(state.periapsis).toBeCloseTo(1, 12);
      expect(state.apoapsis).toBeCloseTo(3, 12);
      expect(state.period).toBeCloseTo(Math.sqrt(8), 12);
    }
  });

  it('applies maneuvers in the moving central body frame without mutating inputs', () => {
    const center = body('central', 1, [10, 2, 3], [4, 5, 6]);
    const craft = body('craft', 1e-6, [11, 2, 3], [4, 7, 6]);
    const result = burn(craft, center, 0.1, 0.2, 0.3);
    expect(result.v[0]).toBeCloseTo(4.2, 12);
    expect(result.v[1]).toBeCloseTo(7.1, 12);
    expect(result.v[2]).toBeCloseTo(6.3, 12);
    expect(craft.v).toEqual([4, 7, 6]);
    expect(center.v).toEqual([4, 5, 6]);
    expect(result.p).toEqual(craft.p);
  });

  it('treats numerical escape-speed roundoff symmetrically on either side', () => {
    for (const relativeEnergy of [-1e-12, 0, 1e-12]) {
      const state = orbitalState([1, 0, 0], [0, Math.sqrt(2 * G * (1 + relativeEnergy)), 0]);
      expect(state.classification).toBe('Parabolic');
    }
    expect(orbitalState([1, 0, 0], [0, 10, 0]).classification).toBe('Hyperbolic');
  });
});

describe('Adaptive gravity and collision budgets', () => {
  it('converges toward the analytic circular binary at second order', () => {
    const coarse = preset('binary');
    const fine = preset('binary');
    adaptiveStep(coarse, 0.25, false);
    for (let i = 0; i < 1000; i++) adaptiveStep(fine, 0.00025, false);
    const error = (bodies: Body[]) =>
      Math.hypot(bodies[1].p[0], bodies[1].p[1] - 0.5, bodies[1].p[2]);
    expect(error(coarse)).toBeLessThan(0.001);
    expect(error(fine)).toBeLessThan(error(coarse) / 50);
  });

  it('preserves angular momentum and bounded energy on a noncolliding binary', () => {
    const bodies = preset('binary');
    const initial = diagnostics(bodies);
    const result = adaptiveStep(bodies, 1, false);
    const final = diagnostics(bodies);
    expect(result.steps).toBeGreaterThan(100);
    expect(result.collisions).toBe(0);
    expect(Math.abs((final.energy - initial.energy) / initial.energy)).toBeLessThan(1e-5);
    expect(
      Math.abs((final.angularMomentum - initial.angularMomentum) / initial.angularMomentum),
    ).toBeLessThan(1e-12);
    expect(norm(final.com)).toBeLessThan(1e-12);
  });

  it('detects a fast low-mass crossing instead of tunneling through collision radii', () => {
    const bodies = [
      body('a', 1e-12, [-0.5, 0, 0], [100, 0, 0], 0.01),
      body('b', 1e-12, [0.5, 0, 0], [-100, 0, 0], 0.01),
    ];
    const result = adaptiveStep(bodies, 0.01, true);
    expect(result.collisions).toBe(1);
    expect(bodies).toHaveLength(1);
    expect(bodies[0].mass).toBeCloseTo(2e-12, 20);
    expect(norm(bodies[0].v)).toBeLessThan(1e-10);
  });

  it('separates inelastic kinetic loss from the full gravitational energy jump', () => {
    const bodies = [
      body('a', 1, [-0.1, 0, 0], [1, 2, 0], 0.2),
      body('b', 3, [0.1, 0, 0], [-1, 0, 0], 0.2),
      body('c', 2, [3, 1, 0], [0, 0, 0]),
    ];
    const before = diagnostics(bodies);
    // Zero time isolates the instantaneous merger from integration truncation.
    const result = step(bodies, 0, true);
    const after = diagnostics(bodies);
    expect(result.collisions).toBe(1);
    expect(result.kineticLoss).toBeCloseTo(3, 12);
    expect(result.collisionDelta).toBeCloseTo(after.energy - before.energy, 10);
    expect(result.collisionDelta).not.toBeCloseTo(-result.kineticLoss, 2);
    expect(bodies[0].mass).toBe(4);
    expect(bodies[0].p[0]).toBeCloseTo(0.05, 12);
    expect(bodies[0].v).toEqual([-0.5, 0.5, 0]);
    expect(bodies[0].radius ** 3).toBeCloseTo(2 * 0.2 ** 3, 12);
  });
});

describe('Planet and Schwarzschild reference cases', () => {
  it('matches the mean spherical Earth and radiative equilibrium reference values', () => {
    const earth = planetProperties(1, 1, 1, 0.3);
    expect(earth.gravity).toBeCloseTo(9.82, 2);
    expect(earth.density).toBeCloseTo(5513, 0);
    expect(earth.escape).toBeCloseTo(11.186, 2);
    expect(earth.temperature).toBeGreaterThan(253);
    expect(earth.temperature).toBeLessThan(256);
  });

  it('obeys independent mass/radius and irradiation scaling laws', () => {
    const base = planetProperties(1, 1, 1, 0.3);
    const doubledRadius = planetProperties(4, 2, 1, 0.3);
    expect(doubledRadius.gravity).toBeCloseTo(base.gravity, 12);
    expect(doubledRadius.density).toBeCloseTo(base.density / 2, 12);
    expect(doubledRadius.escape).toBeCloseTo(base.escape * Math.sqrt(2), 12);
    expect(planetProperties(1, 1, 4, 0.3).temperature).toBeCloseTo(base.temperature / 2, 12);
    expect(planetProperties(1, 1, 1, 0.3, 16).temperature).toBeCloseTo(base.temperature * 2, 12);
    expect(planetProperties(1, 1, 1, 1).temperature).toBe(0);
  });

  it('matches the solar-mass horizon radius and static-observer clock ratio', () => {
    const solar = blackHole(1, 4 / 3, 100);
    expect(solar.radiusKm).toBeCloseTo(2.95334, 4);
    expect(solar.dilation).toBeCloseTo(0.5, 12);
    expect(solar.photonSphereKm).toBeCloseTo(1.5 * solar.radiusKm, 12);
    expect(solar.iscoKm).toBeCloseTo(3 * solar.radiusKm, 12);
    expect(blackHole(10, 4 / 3, 100).radiusKm).toBeCloseTo(10 * solar.radiusKm, 12);
    expect(blackHole(1, 1e9, 100).dilation).toBeCloseTo(1, 8);
    expect(solar.deflectionRad).toBeCloseTo(0.02, 12);
  });

  it('rejects nonexistent static observers and strong-field use of weak bending', () => {
    expect(() => blackHole(1, 1, 100)).toThrow();
    expect(() => blackHole(1, 0.5, 100)).toThrow();
    expect(() => blackHole(1, 2, 9)).toThrow();
    expect(() => blackHole(-1, 2, 100)).toThrow();
  });
});

describe('Rocket mass and impulse accounting', () => {
  it('uses NASA specific-impulse mass flow and consumes no fuel at engine cutoff', () => {
    const initial = rocketInitial(rocket);
    const next = rocketStep(initial, rocket, 1);
    expect(initial.fuel - next.fuel).toBeCloseTo(10000 / (300 * 9.80665), 10);
    const cut = rocketStep(initial, { ...rocket, throttle: 0 }, 1);
    expect(cut.fuel).toBe(initial.fuel);
  });

  it('converges to the ideal rocket-equation delta-v in a gravity-free vacuum limit', () => {
    let state = { ...rocketInitial(rocket), y: 1e12, altitude: 1e12 - 6371000 };
    let iterations = 0;
    while (state.fuel > 0 && iterations++ < 2000) state = rocketStep(state, rocket, 0.2);
    expect(state.fuel).toBe(0);
    expect(state.vy).toBeCloseTo(300 * 9.80665 * Math.log(2), 2);
    expect(state.vx).toBe(0);
  });

  it('recovers Earth freefall and conserves propellant with an inactive engine', () => {
    const initial = { ...rocketInitial(rocket), y: 7371000, altitude: 1000000 };
    const result = rocketStep(initial, { ...rocket, throttle: 0 }, 0.01);
    expect(result.vy / 0.01).toBeCloseTo(-7.336, 2);
    expect(result.fuel).toBe(initial.fuel);
    expect(result.vx).toBe(0);
  });

  it('exhausts each stage once and never creates dry mass at separation', () => {
    const config = { ...rocket, dryMass: 50, fuel: 2, thrust: 100, stages: 2 };
    const initial = { ...rocketInitial(config), y: 7371000, altitude: 1000000 };
    const first = rocketStep(initial, config, 0.1);
    expect(first.stage).toBe(2);
    expect(first.fuel).toBe(1);
    expect(first.dryMass).toBeLessThan(initial.dryMass);
    const final = rocketStep(first, config, 0.1);
    expect(final.stage).toBe(2);
    expect(final.fuel).toBe(0);
    expect(final.dryMass).toBe(first.dryMass);
    const coast = rocketStep(final, config, 0.1);
    expect(coast.fuel).toBe(0);
    expect(coast.stage).toBe(2);
  });

  it('rejects a zero-stage or invalid engine configuration before flight', () => {
    expect(() => rocketInitial({ ...rocket, stages: 0 })).toThrow();
    expect(() => rocketInitial({ ...rocket, isp: 0 })).toThrow();
    expect(() => rocketInitial({ ...rocket, dryMass: -1 })).toThrow();
  });
});
