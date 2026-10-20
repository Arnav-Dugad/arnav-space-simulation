import { AU_KM, MU_SUN, type Planet } from '../data/planets';
export type Vec3 = [number, number, number];
const rad = Math.PI / 180;
export function solveKepler(mean: number, eccentricity: number): number {
  if (!Number.isFinite(mean) || eccentricity < 0 || eccentricity >= 1)
    throw new Error('Expected an elliptical orbit (0 ≤ e < 1).');
  const m = ((((mean + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
  let e = m;
  for (let i = 0; i < 30; i++) {
    const d = (e - eccentricity * Math.sin(e) - m) / (1 - eccentricity * Math.cos(e));
    e -= d;
    if (Math.abs(d) < 1e-12) break;
  }
  return e;
}
export function elementsAt(planet: Planet, date: number) {
  const t = (date - Date.UTC(2000, 0, 1, 12)) / (36525 * 86400000);
  return planet.elements.map((v, i) => v + planet.rates[i] * t);
}
export function orbitPosition(planet: Planet, date: number, anomaly?: number): Vec3 {
  const [a, e, inc, l, peri, node] = elementsAt(planet, date);
  const E = anomaly ?? solveKepler((l - peri) * rad, e);
  const x = a * (Math.cos(E) - e),
    y = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const w = (peri - node) * rad,
    n = node * rad,
    i = inc * rad;
  return [
    (Math.cos(w) * Math.cos(n) - Math.sin(w) * Math.sin(n) * Math.cos(i)) * x +
      (-Math.sin(w) * Math.cos(n) - Math.cos(w) * Math.sin(n) * Math.cos(i)) * y,
    (Math.cos(w) * Math.sin(n) + Math.sin(w) * Math.cos(n) * Math.cos(i)) * x +
      (-Math.sin(w) * Math.sin(n) + Math.cos(w) * Math.cos(n) * Math.cos(i)) * y,
    Math.sin(w) * Math.sin(i) * x + Math.cos(w) * Math.sin(i) * y,
  ];
}
// Right-handed ecliptic (x,y,z) -> Three.js (x,z,-y), with explicit radial distance compression.
export function renderPosition(position: Vec3, trueScale = false): Vec3 {
  const r = Math.hypot(...position);
  const s = trueScale ? 10 : (5 + Math.log1p(r) * 12) / r;
  return [position[0] * s, position[2] * s, -position[1] * s];
}
export function circularVelocity(mu: number, radius: number) {
  if (mu <= 0 || radius <= 0) throw new Error('Positive μ and radius required.');
  return Math.sqrt(mu / radius);
}
export function hohmann(r1: number, r2: number, mu = MU_SUN) {
  if (r1 <= 0 || r2 <= 0 || !Number.isFinite(r1 + r2 + mu))
    throw new Error('Positive, finite orbital radii required.');
  const a = (r1 + r2) / 2;
  const departure = Math.abs(Math.sqrt(mu * (2 / r1 - 1 / a)) - Math.sqrt(mu / r1));
  const arrival = Math.abs(Math.sqrt(mu / r2) - Math.sqrt(mu * (2 / r2 - 1 / a)));
  const seconds = Math.PI * Math.sqrt((a * a * a) / mu);
  const phase = ((((Math.PI - Math.sqrt(mu / (r2 * r2 * r2)) * seconds) / rad) % 360) + 360) % 360;
  return {
    departure,
    arrival,
    total: departure + arrival,
    days: seconds / 86400,
    phase,
    a: a / AU_KM,
  };
}
export function propellant(dryMass: number, deltaV: number, isp: number) {
  if (dryMass <= 0 || deltaV < 0 || isp <= 0) throw new Error('Invalid rocket parameters.');
  return dryMass * Math.expm1((deltaV * 1000) / (isp * 9.80665));
}
