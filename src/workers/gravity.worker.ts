import { diagnostics, step, validateBodies, type Body } from '../simulation/nbody';
let bodies: Body[] = [];
let time = 0;
let initial = 0;
self.onmessage = (event: MessageEvent) => {
  try {
    const { type } = event.data;
    if (type === 'reset') {
      bodies = validateBodies(event.data.bodies);
      time = 0;
      initial = diagnostics(bodies).energy;
    }
    if (type === 'step') {
      const dt = Math.max(0.000001, Math.min(0.002, Number(event.data.dt) || 0.0002));
      const count = Math.max(1, Math.min(100, Math.floor(event.data.count) || 1));
      for (let i = 0; i < count; i++) {
        step(bodies, dt, event.data.merge);
        time += dt;
      }
      if (!bodies.every((b) => [...b.p, ...b.v].every(Number.isFinite)))
        throw new Error('Numerical instability. Reduce timestep or reset.');
    }
    const d = diagnostics(bodies);
    self.postMessage({
      bodies,
      time,
      ...d,
      drift: initial === 0 ? 0 : (d.energy - initial) / Math.abs(initial),
    });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : 'Simulation failed.' });
  }
};
