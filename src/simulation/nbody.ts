import type { Vec3 } from './orbital';
// Normalized units: AU, solar masses, Julian years. G = 4π² AU³ M☉⁻¹ yr⁻².
export const G = 4 * Math.PI * Math.PI;
export interface Body {
  id: string;
  name: string;
  mass: number;
  radius: number;
  color: string;
  p: Vec3;
  v: Vec3;
}
export interface Diagnostics {
  energy: number;
  angularMomentum: number;
  com: Vec3;
}
export function validateBodies(input: unknown): Body[] {
  if (!Array.isArray(input) || input.length < 1 || input.length > 64)
    throw new Error('A simulation needs 1–64 bodies.');
  const ids = new Set<string>();
  return input.map((b) => {
    if (
      !b ||
      typeof b.id !== 'string' ||
      ids.has(b.id) ||
      typeof b.name !== 'string' ||
      b.name.length > 60 ||
      !/^#[0-9a-f]{6}$/i.test(b.color) ||
      !Number.isFinite(b.mass) ||
      b.mass <= 0 ||
      b.mass > 100 ||
      !Number.isFinite(b.radius) ||
      b.radius <= 0 ||
      b.radius > 10
    )
      throw new Error('Invalid body data.');
    for (const k of ['p', 'v'])
      if (
        !Array.isArray(b[k]) ||
        b[k].length !== 3 ||
        !b[k].every(
          (n: unknown) => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) < 1e5,
        )
      )
        throw new Error('Invalid position or velocity.');
    ids.add(b.id);
    return structuredClone(b) as Body;
  });
}
function accelerations(bodies: Body[], softening: number): Vec3[] {
  const a: Vec3[] = bodies.map(() => [0, 0, 0]);
  for (let i = 0; i < bodies.length; i++)
    for (let j = i + 1; j < bodies.length; j++) {
      const d = bodies[i].p.map((v, k) => bodies[j].p[k] - v);
      const d2 = d.reduce((s, v) => s + v * v, 0) + softening * softening;
      if (d2 === 0) continue;
      const f = G / (d2 * Math.sqrt(d2));
      for (let k = 0; k < 3; k++) {
        a[i][k] += d[k] * f * bodies[j].mass;
        a[j][k] -= d[k] * f * bodies[i].mass;
      }
    }
  return a;
}
export function step(bodies: Body[], dt: number, merge = true, softening = 0) {
  const a = accelerations(bodies, softening);
  bodies.forEach((b, i) => {
    for (let k = 0; k < 3; k++) {
      b.v[k] += 0.5 * dt * a[i][k];
      b.p[k] += dt * b.v[k];
    }
  });
  const next = accelerations(bodies, softening);
  bodies.forEach((b, i) => {
    for (let k = 0; k < 3; k++) b.v[k] += 0.5 * dt * next[i][k];
  });
  if (merge)
    for (let i = 0; i < bodies.length; i++)
      for (let j = bodies.length - 1; j > i; j--) {
        const b = bodies[i],
          c = bodies[j];
        if (Math.hypot(...b.p.map((v, k) => v - c.p[k])) < b.radius + c.radius) {
          const m = b.mass + c.mass;
          b.p = b.p.map((v, k) => (v * b.mass + c.p[k] * c.mass) / m) as Vec3;
          b.v = b.v.map((v, k) => (v * b.mass + c.v[k] * c.mass) / m) as Vec3;
          b.mass = m;
          b.radius = Math.cbrt(b.radius ** 3 + c.radius ** 3);
          bodies.splice(j, 1);
        }
      }
}
export function diagnostics(bodies: Body[], softening = 0): Diagnostics {
  let energy = 0,
    mass = 0;
  const com: Vec3 = [0, 0, 0],
    L: Vec3 = [0, 0, 0];
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    mass += b.mass;
    energy += 0.5 * b.mass * b.v.reduce((s, v) => s + v * v, 0);
    for (let k = 0; k < 3; k++) {
      com[k] += b.mass * b.p[k];
      L[k] += b.mass * (b.p[(k + 1) % 3] * b.v[(k + 2) % 3] - b.p[(k + 2) % 3] * b.v[(k + 1) % 3]);
    }
    for (let j = i + 1; j < bodies.length; j++) {
      const d = Math.hypot(...b.p.map((v, k) => v - bodies[j].p[k]), softening);
      if (d > 0) energy -= (G * b.mass * bodies[j].mass) / d;
    }
  }
  return { energy, angularMomentum: Math.hypot(...L), com: com.map((v) => v / mass) as Vec3 };
}
export function preset(name: string): Body[] {
  if (name === 'binary')
    return [
      {
        id: 'a',
        name: 'Star A',
        mass: 0.5,
        radius: 0.025,
        color: '#ffe3a4',
        p: [-0.5, 0, 0],
        v: [0, -Math.PI, 0],
      },
      {
        id: 'b',
        name: 'Star B',
        mass: 0.5,
        radius: 0.025,
        color: '#9ccfff',
        p: [0.5, 0, 0],
        v: [0, Math.PI, 0],
      },
    ];
  if (name === 'three')
    return [
      {
        id: 'a',
        name: 'Star A',
        mass: 1,
        radius: 0.02,
        color: '#ffe3a4',
        p: [-0.97000436, 0.24308753, 0],
        v: [0.466203685 * 2 * Math.PI, 0.43236573 * 2 * Math.PI, 0],
      },
      {
        id: 'b',
        name: 'Star B',
        mass: 1,
        radius: 0.02,
        color: '#a4c8ff',
        p: [0.97000436, -0.24308753, 0],
        v: [0.466203685 * 2 * Math.PI, 0.43236573 * 2 * Math.PI, 0],
      },
      {
        id: 'c',
        name: 'Star C',
        mass: 1,
        radius: 0.02,
        color: '#f1a4c4',
        p: [0, 0, 0],
        v: [-0.93240737 * 2 * Math.PI, -0.86473146 * 2 * Math.PI, 0],
      },
    ];
  if (name === 'collision')
    return [
      {
        id: 'a',
        name: 'World A',
        mass: 0.001,
        radius: 0.07,
        color: '#8abefa',
        p: [-0.6, 0, 0],
        v: [0.4, 0, 0],
      },
      {
        id: 'b',
        name: 'World B',
        mass: 0.001,
        radius: 0.07,
        color: '#e8ac87',
        p: [0.6, 0, 0],
        v: [-0.4, 0, 0],
      },
    ];
  return [
    {
      id: 'sun',
      name: 'Sun',
      mass: 1,
      radius: 0.00465,
      color: '#ffe0a0',
      p: [0, 0, 0],
      v: [0, -3e-6 * 2 * Math.PI, 0],
    },
    {
      id: 'earth',
      name: 'Earth',
      mass: 3e-6,
      radius: 0.0000426,
      color: '#8cbdff',
      p: [1, 0, 0],
      v: [0, 2 * Math.PI, 0],
    },
  ];
}
