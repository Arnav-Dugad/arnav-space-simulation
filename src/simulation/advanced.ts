import { G, step, type Body } from './nbody';
import type { Vec3 } from './orbital';
export const dot = (a: Vec3, b: Vec3) => a.reduce((s, v, k) => s + v * b[k], 0);
export const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const norm = (v: Vec3) => Math.hypot(...v);
export function orbitalState(p: Vec3, v: Vec3, mu = G) {
  const r = norm(p),
    speed = norm(v),
    h = cross(p, v),
    h2 = dot(h, h),
    energy = (speed * speed) / 2 - mu / r,
    eVec = cross(v, h).map((x, k) => x / mu - p[k] / r) as Vec3,
    e = norm(eVec),
    a = -mu / (2 * energy);
  return {
    r,
    speed,
    h,
    e,
    energy,
    a,
    periapsis: h2 / mu / (1 + e),
    apoapsis: e < 1 ? a * (1 + e) : Infinity,
    period: energy < 0 ? 2 * Math.PI * Math.sqrt(a ** 3 / mu) : Infinity,
    classification:
      Math.abs(energy) / (mu / r) < 1e-8
        ? 'Parabolic'
        : e < 0.001
          ? 'Circular'
          : energy < 0
            ? 'Elliptical'
            : 'Hyperbolic',
  };
}
export function keplerBody(
  a: number,
  e: number,
  inclination: number,
  node: number,
  peri: number,
  anomaly: number,
  centralMass: number,
  mass = 3e-6,
): Body {
  if (!(a > 0 && e >= 0 && e < 0.99 && centralMass > 0))
    throw new Error('Use positive a and mass, with 0 ≤ e < 0.99.');
  const [i, n, w, f] = [inclination, node, peri, anomaly].map((v) => (v * Math.PI) / 180),
    r = (a * (1 - e * e)) / (1 + e * Math.cos(f)),
    h = Math.sqrt(G * centralMass * a * (1 - e * e));
  const rotate = ([x, y]: number[]): Vec3 => [
    (Math.cos(n) * Math.cos(w) - Math.sin(n) * Math.sin(w) * Math.cos(i)) * x +
      (-Math.cos(n) * Math.sin(w) - Math.sin(n) * Math.cos(w) * Math.cos(i)) * y,
    (Math.sin(n) * Math.cos(w) + Math.cos(n) * Math.sin(w) * Math.cos(i)) * x +
      (-Math.sin(n) * Math.sin(w) + Math.cos(n) * Math.cos(w) * Math.cos(i)) * y,
    Math.sin(w) * Math.sin(i) * x + Math.cos(w) * Math.sin(i) * y,
  ];
  return {
    id: crypto.randomUUID(),
    name: 'New world',
    mass,
    radius: 0.0000426,
    color: '#bca8ed',
    p: rotate([r * Math.cos(f), r * Math.sin(f)]),
    v: rotate([
      ((-G * centralMass) / h) * Math.sin(f),
      ((G * centralMass) / h) * (e + Math.cos(f)),
    ]),
  };
}
export function burn(
  body: Body,
  central: Body,
  prograde: number,
  radial: number,
  normal: number,
): Body {
  const p = body.p.map((v, k) => v - central.p[k]) as Vec3,
    v = body.v.map((v, k) => v - central.v[k]) as Vec3,
    r = norm(p),
    vm = norm(v),
    h = cross(p, v),
    hm = norm(h);
  if (r === 0 || vm === 0 || hm === 0)
    throw new Error('The maneuver needs a nonzero orbital state.');
  return {
    ...structuredClone(body),
    v: body.v.map(
      (x, k) => x + (prograde * v[k]) / vm + (radial * p[k]) / r + (normal * h[k]) / hm,
    ) as Vec3,
  };
}
export function encounter(bodies: Body[]) {
  let distance = Infinity,
    pair = '—',
    speed = 0;
  let ids: string[] = [],
    positions: Vec3[] = [];
  for (let i = 0; i < bodies.length; i++)
    for (let j = i + 1; j < bodies.length; j++) {
      const d = norm(bodies[i].p.map((v, k) => v - bodies[j].p[k]) as Vec3);
      if (d < distance) {
        distance = d;
        pair = `${bodies[i].name} / ${bodies[j].name}`;
        ids = [bodies[i].id, bodies[j].id];
        positions = [structuredClone(bodies[i].p), structuredClone(bodies[j].p)];
        speed = norm(bodies[i].v.map((v, k) => v - bodies[j].v[k]) as Vec3);
      }
    }
  return { distance, pair, speed, ids, positions };
}
export function adaptiveStep(bodies: Body[], duration: number, merge = true) {
  let elapsed = 0,
    steps = 0,
    minStep = duration,
    collisionDelta = 0,
    kineticLoss = 0,
    collisions = 0;
  while (elapsed < duration - 1e-14) {
    let dt = duration - elapsed;
    for (let i = 0; i < bodies.length; i++)
      for (let j = i + 1; j < bodies.length; j++) {
        const r = Math.max(
          norm(bodies[i].p.map((v, k) => v - bodies[j].p[k]) as Vec3),
          bodies[i].radius + bodies[j].radius,
        );
        dt = Math.min(dt, 0.025 * Math.sqrt(r ** 3 / (G * (bodies[i].mass + bodies[j].mass))));
        const speed = norm(bodies[i].v.map((v, k) => v - bodies[j].v[k]) as Vec3),
          collisionRadius = bodies[i].radius + bodies[j].radius;
        if (speed > 0)
          dt = Math.min(
            dt,
            (0.2 * Math.max(r - collisionRadius, collisionRadius * 0.1, 1e-8)) / speed,
          );
      }
    if (dt < 1e-9 || steps++ > 4096)
      throw new Error(
        'Encounter is too close for this precision budget. Increase collision radii or reduce speed.',
      );
    const result = step(bodies, dt, merge);
    collisionDelta += result.collisionDelta;
    kineticLoss += result.kineticLoss;
    collisions += result.collisions;
    elapsed += dt;
    minStep = Math.min(minStep, dt);
  }
  return { steps, minStep, collisionDelta, kineticLoss, collisions };
}
export function planetProperties(
  massEarth: number,
  radiusEarth: number,
  distanceAU: number,
  albedo: number,
  luminosity = 1,
) {
  const mass = massEarth * 5.9722e24,
    r = radiusEarth * 6371000,
    Gsi = 6.6743e-11;
  return {
    gravity: (Gsi * mass) / r ** 2,
    density: mass / ((4 / 3) * Math.PI * r ** 3),
    escape: Math.sqrt((2 * Gsi * mass) / r) / 1000,
    temperature:
      ((luminosity * 3.828e26 * (1 - albedo)) /
        (16 * Math.PI * 5.670374419e-8 * (distanceAU * 149597870700) ** 2)) **
      0.25,
  };
}
export function blackHole(massSolar: number, radiusRs: number, impactRs: number) {
  if (
    !Number.isFinite(massSolar + radiusRs + impactRs) ||
    massSolar <= 0 ||
    radiusRs <= 1 ||
    impactRs < 10
  )
    throw new Error(
      'Use positive mass, a static observer outside the horizon, and weak-field impact parameter ≥ 10 rₛ.',
    );
  const rs = (2 * 6.6743e-11 * massSolar * 1.98847e30) / 299792458 ** 2;
  return {
    radiusKm: rs / 1000,
    dilation: radiusRs > 1 ? Math.sqrt(1 - 1 / radiusRs) : 0,
    deflectionRad: 2 / impactRs,
    photonSphereKm: (1.5 * rs) / 1000,
    iscoKm: (3 * rs) / 1000,
  };
}
export interface RocketConfig {
  dryMass: number;
  fuel: number;
  thrust: number;
  isp: number;
  cd: number;
  area: number;
  pitch: number;
  throttle: number;
  stages: number;
}
export interface RocketState {
  t: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fuel: number;
  dryMass: number;
  stage: number;
  maxQ: number;
  altitude: number;
  speed: number;
  dynamicPressure: number;
  acceleration: number;
}
export function rocketInitial(c: RocketConfig): RocketState {
  if (
    !Object.values(c).every(Number.isFinite) ||
    c.dryMass <= 0 ||
    c.fuel < 0 ||
    c.thrust < 0 ||
    c.isp <= 0 ||
    c.stages < 1 ||
    c.stages > 3 ||
    !Number.isInteger(c.stages) ||
    c.throttle < 0 ||
    c.throttle > 1 ||
    c.cd < 0 ||
    c.area < 0
  )
    throw new Error('Invalid rocket configuration.');
  return {
    t: 0,
    x: 0,
    y: 6371000,
    vx: 0,
    vy: 0,
    fuel: c.fuel / c.stages,
    dryMass: c.dryMass,
    stage: 1,
    maxQ: 0,
    altitude: 0,
    speed: 0,
    dynamicPressure: 0,
    acceleration: 0,
  };
}
export function rocketStep(s: RocketState, c: RocketConfig, dt = 0.1): RocketState {
  if (s.altitude < 0 || dt <= 0) return s;
  const mu = 3.986004418e14,
    R = 6371000,
    r = Math.hypot(s.x, s.y),
    speed = Math.hypot(s.vx, s.vy),
    rho = 1.225 * Math.exp(-Math.max(0, r - R) / 8500),
    q = 0.5 * rho * speed ** 2;
  const requested = s.fuel > 0 ? c.thrust * 1000 * c.throttle : 0,
    used = Math.min(s.fuel, (requested / (c.isp * 9.80665)) * dt),
    thrust = (used * c.isp * 9.80665) / dt,
    mass = s.dryMass + s.fuel + ((c.stages - s.stage) * c.fuel) / c.stages - used / 2;
  const pitch = (c.pitch * Math.PI) / 180,
    ux = s.x / r,
    uy = s.y / r,
    tx = uy,
    ty = -ux,
    drag = q * c.cd * c.area;
  const ax =
      (-mu * s.x) / r ** 3 +
      (thrust / mass) * (ux * Math.cos(pitch) + tx * Math.sin(pitch)) -
      (speed > 0 ? ((drag / mass) * s.vx) / speed : 0),
    ay =
      (-mu * s.y) / r ** 3 +
      (thrust / mass) * (uy * Math.cos(pitch) + ty * Math.sin(pitch)) -
      (speed > 0 ? ((drag / mass) * s.vy) / speed : 0);
  const x = s.x + s.vx * dt + 0.5 * ax * dt * dt,
    y = s.y + s.vy * dt + 0.5 * ay * dt * dt,
    vx = s.vx + ax * dt,
    vy = s.vy + ay * dt;
  let fuel = s.fuel - used,
    dryMass = s.dryMass,
    stage = s.stage;
  if (fuel <= 0 && stage < c.stages) {
    stage++;
    fuel = c.fuel / c.stages;
    dryMass = Math.max(0.1 * c.dryMass, c.dryMass * (1 - 0.18 * (stage - 1)));
  }
  return {
    t: s.t + dt,
    x,
    y,
    vx,
    vy,
    fuel,
    dryMass,
    stage,
    maxQ: Math.max(s.maxQ, q),
    altitude: Math.hypot(x, y) - R,
    speed: Math.hypot(vx, vy),
    dynamicPressure: q,
    acceleration: Math.hypot(ax, ay),
  };
}
