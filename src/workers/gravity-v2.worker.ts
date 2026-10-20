import { diagnostics, step, validateBodies, type Body } from '../simulation/nbody';
import { adaptiveStep, encounter } from '../simulation/advanced';
let bodies: Body[] = [],
  time = 0,
  initial = 0,
  collisionDelta = 0,
  kineticLoss = 0,
  collisions = 0;
let history: {
    bodies: Body[];
    time: number;
    collisionDelta: number;
    kineticLoss: number;
    collisions: number;
  }[] = [],
  index = -1;
let closest = { ...encounter([]), time: 0 };
let effectiveDt = 0,
  substeps = 0;
function capture() {
  history = history.slice(0, index + 1);
  history.push({ bodies: structuredClone(bodies), time, collisionDelta, kineticLoss, collisions });
  if (history.length > 600) history.shift();
  index = history.length - 1;
}
self.onmessage = (event: MessageEvent) => {
  const started = performance.now();
  try {
    const { type } = event.data;
    if (type === 'reset') {
      bodies = validateBodies(event.data.bodies);
      time = 0;
      initial = diagnostics(bodies).energy;
      collisionDelta = kineticLoss = collisions = 0;
      closest = { ...encounter(bodies), time: 0 };
      history = [];
      index = -1;
      capture();
    }
    if (type === 'rewind') {
      index = Math.max(0, Math.min(history.length - 1, Math.round(Number(event.data.index))));
      const record = history[index];
      bodies = structuredClone(record.bodies);
      time = record.time;
      collisionDelta = record.collisionDelta;
      kineticLoss = record.kineticLoss;
      collisions = record.collisions;
      closest = history.slice(0, index + 1).reduce(
        (best, item) => {
          const value = encounter(item.bodies);
          return value.distance < best.distance ? { ...value, time: item.time } : best;
        },
        { ...encounter(bodies), time },
      );
    }
    if (type === 'step') {
      const dt = Math.max(0.000001, Math.min(0.002, Number(event.data.dt) || 0.0002)),
        count = Math.max(1, Math.min(100, Math.floor(event.data.count) || 1));
      substeps = 0;
      effectiveDt = dt;
      for (let i = 0; i < count; i++) {
        const before = encounter(bodies);
        if (before.distance < closest.distance) closest = { ...before, time };
        const result = event.data.adaptive
          ? adaptiveStep(bodies, dt, event.data.merge)
          : { ...step(bodies, dt, event.data.merge), steps: 1, minStep: dt };
        collisionDelta += result.collisionDelta;
        kineticLoss += result.kineticLoss;
        collisions += result.collisions;
        substeps += result.steps;
        effectiveDt = Math.min(effectiveDt, result.minStep);
        time += dt;
        const after = encounter(bodies);
        if (after.distance < closest.distance) closest = { ...after, time };
      }
      if (!bodies.every((b) => [...b.p, ...b.v].every(Number.isFinite)))
        throw new Error('Numerical instability. Reduce timestep or reset.');
      capture();
    }
    const d = diagnostics(bodies);
    self.postMessage({
      bodies,
      time,
      ...d,
      collisionDelta,
      kineticLoss,
      collisions,
      effectiveDt,
      substeps,
      closest,
      solverMs: performance.now() - started,
      encounter: encounter(bodies),
      historyIndex: index,
      historyLength: history.length,
      drift: initial === 0 ? 0 : (d.energy - initial - collisionDelta) / Math.abs(initial),
    });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : 'Simulation failed.' });
  }
};
