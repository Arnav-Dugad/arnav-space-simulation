import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Share2, Undo2, SlidersHorizontal, Flag, CornerUpRight } from 'lucide-react';
import { Modal, Metric, Range, Toggle } from './UI';
import NumberField from './NumberField';
import Chart from './Chart';
import { burn, encounter, keplerBody, orbitalState } from '../simulation/advanced';
import { G, step, type Body, type Diagnostics } from '../simulation/nbody';
import { csv, downloadFile, shareConfiguration } from '../utils/export';
import { savedExperiments, saveExperiment, removeExperiment } from '../utils/experiments';
export interface GravitySnapshot extends Diagnostics {
  bodies: Body[];
  time: number;
  drift: number;
  collisionDelta: number;
  kineticLoss: number;
  collisions: number;
  effectiveDt: number;
  substeps: number;
  historyIndex: number;
  historyLength: number;
  encounter: ReturnType<typeof encounter>;
  closest?: ReturnType<typeof encounter> & { time: number };
  solverMs?: number;
  error?: string;
}
export interface GravitySample {
  time: number;
  energy: number;
  drift: number;
  angular: number;
  distance: number;
  speed: number;
}
export default function GravityWorkbench({
  snapshot: s,
  samples,
  selected,
  reset,
  rewind,
  undo,
  adaptive,
  setAdaptive,
  notify,
  start,
  revision,
  autoSlow,
  setAutoSlow,
}: {
  snapshot: GravitySnapshot;
  samples: GravitySample[];
  selected: string;
  reset: (b: Body[]) => void;
  rewind: (i: number) => void;
  undo: () => void;
  adaptive: boolean;
  setAdaptive: (v: boolean) => void;
  notify: (t: string) => void;
  start: () => void;
  revision: number;
  autoSlow: boolean;
  setAutoSlow: (v: boolean) => void;
}) {
  const [modal, setModal] = useState<'orbit' | 'burn' | null>(null),
    [a, setA] = useState(1.6),
    [e, setE] = useState(0.1),
    [inc, setInc] = useState(0),
    [node, setNode] = useState(0),
    [peri, setPeri] = useState(0),
    [anomaly, setAnomaly] = useState(0),
    [dv, setDv] = useState({ prograde: 0, radial: 0, normal: 0 }),
    [challenge, setChallenge] = useState<{
      start: number;
      failed: boolean;
      target: number;
      revision: number;
    } | null>(null);
  const report = useRef<HTMLDivElement>(null);
  const [experiments, setExperiments] = useState(savedExperiments);
  const [experimentName, setExperimentName] = useState('My orbit experiment');
  const body = s.bodies.find((b) => b.id === selected),
    central = s.bodies[0];
  const state =
    body && body.id !== central.id && Math.hypot(...body.p.map((v, k) => v - central.p[k])) > 1e-12
      ? orbitalState(
          body.p.map((v, k) => v - central.p[k]) as [number, number, number],
          body.v.map((v, k) => v - central.v[k]) as [number, number, number],
          G * (central.mass + body.mass),
        )
      : null;
  const failed =
      challenge &&
      (challenge.failed ||
        challenge.revision !== revision ||
        !state ||
        state.e > 0.15 ||
        Math.abs(s.drift) > 0.001 ||
        s.time < challenge.start),
    success = challenge && !failed && s.time - challenge.start >= challenge.target;
  useEffect(() => {
    if (failed && challenge && !challenge.failed)
      setChallenge((c) => (c ? { ...c, failed: true } : null));
  }, [failed, challenge]);
  const canManeuver = !!state && Math.hypot(...state.h) > 1e-12;
  const preview = useMemo(() => {
    if (!canManeuver || !body) return [];
    const pair = [structuredClone(central), burn(body, central, dv.prograde, dv.radial, dv.normal)];
    const period = state?.period ?? 1,
      dt = Math.min(Number.isFinite(period) ? period / 600 : 0.002, 0.01);
    const points: number[][] = [];
    for (let i = 0; i < 600; i++) {
      step(pair, dt, false);
      points.push(pair[1].p.map((v, k) => v - pair[0].p[k]));
    }
    return points;
  }, [canManeuver, body, central, dv, state?.period]);
  const previewExtent = Math.max(0.01, ...preview.flatMap((v) => [Math.abs(v[0]), Math.abs(v[1])]));
  const exportSeries = () =>
    downloadFile(
      'arnav-space-simulation-diagnostics.csv',
      csv([
        [
          'time_yr',
          'energy_Msun_AU2_yr2',
          'corrected_energy_drift',
          'angular_momentum_Msun_AU2_yr',
          'closest_distance_AU',
          'relative_speed_AU_yr',
        ],
        ...samples.map((v) => [v.time, v.energy, v.drift, v.angular, v.distance, v.speed]),
      ]),
      'text/csv',
    );
  return (
    <div className="workbench" ref={report}>
      <div className="workbench-toolbar panel">
        <button onClick={() => setModal('orbit')}>
          <SlidersHorizontal size={15} /> Orbit creation assistant
        </button>
        <button
          disabled={!canManeuver}
          onClick={() => {
            rewind(s.historyIndex);
            setModal('burn');
          }}
        >
          <CornerUpRight size={15} /> Plan a maneuver
        </button>
        <button onClick={undo}>
          <Undo2 size={15} /> Undo last edit
        </button>
        <button
          onClick={async () => {
            try {
              const hash = shareConfiguration({ version: 2, bodies: s.bodies });
              await navigator.clipboard.writeText(`${location.origin}/#gravity/shared/${hash}`);
              notify('Experiment link copied, including model version and initial state.');
            } catch (error) {
              notify(
                error instanceof Error
                  ? error.message
                  : 'Clipboard unavailable. Export JSON instead.',
              );
            }
          }}
        >
          <Share2 size={15} /> Share experiment
        </button>
      </div>
      <section className="panel history-panel">
        <div className="section-label">
          EXPERIMENT LIBRARY <span>20 DEVICE SAVES</span>
        </div>
        <div className="experiment-save">
          <label>
            Experiment name
            <input
              value={experimentName}
              maxLength={60}
              onChange={(e) => setExperimentName(e.target.value)}
            />
          </label>
          <button
            className="solid-button"
            onClick={() => {
              try {
                setExperiments(saveExperiment(experimentName, s.bodies));
                notify('Named experiment saved. Find it with Ctrl / Command K.');
              } catch (error) {
                notify(error instanceof Error ? error.message : 'Device storage unavailable.');
              }
            }}
          >
            Save named experiment
          </button>
        </div>
        <p className="footnote">
          Saves the current bodies as new initial conditions. Time, trails, and diagnostics restart
          when loaded.
        </p>
        {experiments.map((v) => (
          <div className="experiment-entry" key={v.id}>
            <button
              onClick={() => {
                reset(structuredClone(v.bodies));
                notify(`${v.name} loaded as initial conditions.`);
              }}
            >
              <strong>{v.name}</strong>
              <small>
                {v.bodies.length} bodies · {new Date(v.savedAt).toLocaleDateString()}
              </small>
            </button>
            <button
              aria-label={`Delete experiment ${v.name}`}
              onClick={() => {
                try {
                  setExperiments(removeExperiment(v.id));
                } catch {
                  notify('Device storage unavailable.');
                }
              }}
            >
              Delete
            </button>
          </div>
        ))}
      </section>
      <section className="panel history-panel">
        <div className="section-label">
          SIMULATION HISTORY <span>{s.historyLength} RECORDED STATES · UP TO 600</span>
        </div>
        <Range
          label="Rewind simulation"
          value={s.historyIndex}
          min={0}
          max={Math.max(1, s.historyLength - 1)}
          onChange={rewind}
        />
        <p className="footnote">
          Rewinding restores the physical state and collision accounting. Resuming creates a new
          branch from that instant.
        </p>
      </section>
      <div className="analytics-grid">
        <section className="panel chart-panel">
          <Chart values={samples.map((v) => v.drift * 100)} label="Corrected energy drift (%)" />
          <Chart
            values={samples.map((v) => v.angular)}
            label="Angular momentum (M☉·AU²/yr)"
            color="#a1dacb"
          />
        </section>
        <section className="panel chart-panel">
          <Chart
            values={samples.map((v) => v.distance)}
            label="Closest approach (AU)"
            color="#c4a6ee"
          />
          <Chart
            values={samples.map((v) => v.speed)}
            label="Encounter relative speed (AU/yr)"
            color="#e5bd93"
          />
        </section>
      </div>
      <section className="panel science-readouts">
        <Metric
          label="Kinetic / potential energy"
          value={`${s.kinetic.toExponential(3)} / ${s.potential.toExponential(3)}`}
        />
        <Metric
          label="Collision kinetic energy dissipated"
          value={s.kineticLoss.toExponential(4)}
        />
        <Metric label="Collision model energy change" value={s.collisionDelta.toExponential(4)} />
        <Metric
          label="Angular vector [x,y,z]"
          value={s.angularVector.map((v) => v.toExponential(2)).join(', ')}
        />
        <Metric label="Closest pair" value={s.encounter.pair} />
        <Metric
          label="Closest recorded approach"
          value={
            s.closest && Number.isFinite(s.closest.distance)
              ? `${s.closest.distance.toPrecision(5)} AU · t=${s.closest.time.toFixed(4)} yr`
              : 'No pair recorded'
          }
        />
        <Metric label="Solver computation" value={(s.solverMs ?? 0).toFixed(2)} unit="ms / tick" />
        <Metric
          label="Effective timestep / substeps"
          value={`${s.effectiveDt.toExponential(2)} yr / ${s.substeps}`}
        />
        {state && (
          <>
            <Metric label="Selected orbit classification" value={state.classification} />
            <Metric
              label="Eccentricity / periapsis"
              value={`${state.e.toFixed(4)} / ${state.periapsis.toFixed(4)} AU`}
            />
          </>
        )}
      </section>
      <div className="panel challenge-panel">
        <div>
          <span className="section-label">
            <Flag size={14} /> STABLE ORBIT CHALLENGE
          </span>
          <h3>
            {success
              ? 'Ten orbits. One stable world.'
              : failed
                ? 'The orbit left the challenge tolerance.'
                : 'Keep a world stable for ten periods.'}
          </h3>
          <p>
            Start with a bound orbit with eccentricity below 0.15. Maintain corrected energy drift
            below 0.1%, without editing the system.
          </p>
          {challenge && (
            <progress max={challenge.target} value={Math.max(0, s.time - challenge.start)} />
          )}
        </div>
        <button
          className="solid-button"
          disabled={!state || !Number.isFinite(state.period)}
          onClick={() => {
            if (state) {
              setChallenge({ start: s.time, failed: false, target: state.period * 10, revision });
              start();
            }
          }}
        >
          {challenge ? 'Retry challenge' : 'Start challenge'}
        </button>
      </div>
      <div className="save-actions">
        <button onClick={exportSeries}>
          <Download size={15} /> Export diagnostics CSV
        </button>
        <button
          onClick={() =>
            downloadFile(
              'arnav-space-simulation-experiment.json',
              JSON.stringify(
                {
                  model: 'Newtonian velocity Verlet v2',
                  units: {
                    mass: 'solar masses',
                    length: 'AU',
                    time: 'normalized orbital years; G=4π²',
                  },
                  assumptions: ['Point-mass gravity', 'Perfectly inelastic collision merging'],
                  snapshot: s,
                  diagnostics: samples,
                },
                null,
                2,
              ),
            )
          }
        >
          <Download size={15} /> Download experiment report
        </button>
        <Toggle
          label="Adaptive close-encounter integration"
          checked={adaptive}
          onChange={() => setAdaptive(!adaptive)}
        />
        <Toggle
          label="Slow down close encounters"
          checked={autoSlow}
          onChange={() => setAutoSlow(!autoSlow)}
        />
      </div>
      {modal === 'orbit' && (
        <Modal title="Create a physically defined orbit" onClose={() => setModal(null)}>
          <p className="footnote">
            Six orbital elements relative to {central.name}. Preview is a schematic projection; the
            created body uses full 3D position and velocity.
          </p>
          <div className="numeric-grid">
            <NumberField
              label="Semi-major axis"
              value={a}
              min={0.01}
              max={100}
              unit="AU"
              onChange={setA}
            />
            <NumberField label="Eccentricity" value={e} min={0} max={0.98} onChange={setE} />
            <NumberField
              label="Inclination"
              value={inc}
              min={0}
              max={180}
              unit="degrees"
              onChange={setInc}
            />
            <NumberField
              label="Ascending node"
              value={node}
              min={0}
              max={360}
              unit="degrees"
              onChange={setNode}
            />
            <NumberField
              label="Argument of periapsis"
              value={peri}
              min={0}
              max={360}
              unit="degrees"
              onChange={setPeri}
            />
            <NumberField
              label="True anomaly"
              value={anomaly}
              min={0}
              max={360}
              unit="degrees"
              onChange={setAnomaly}
            />
          </div>
          <svg viewBox="0 0 440 170" className="orbit-preview" aria-label="Orbit creation preview">
            <ellipse
              cx={220 + e * 140}
              cy="85"
              rx="140"
              ry={Math.sqrt(1 - e * e) * 65}
              fill="none"
              stroke="#a8cafa"
            />
            <circle cx="220" cy="85" r="6" fill="#f6d29a" />
          </svg>
          <button
            className="solid-button"
            onClick={() => {
              try {
                const b = keplerBody(a, e, inc, node, peri, anomaly, central.mass);
                b.p = b.p.map((v, k) => v + central.p[k]) as [number, number, number];
                b.v = b.v.map((v, k) => v + central.v[k]) as [number, number, number];
                reset([...s.bodies, b]);
                setModal(null);
                notify('Orbital state created from all six elements.');
              } catch (error) {
                notify(String(error));
              }
            }}
          >
            Create world in this orbit
          </button>
        </Modal>
      )}
      {modal === 'burn' && body && state && canManeuver && (
        <Modal title={`Maneuver · ${body.name}`} onClose={() => setModal(null)}>
          <p className="footnote">
            Impulse components are AU/year relative to {central.name}. Drag the handle to adjust
            prograde and radial velocity, then execute the burn.
          </p>
          <svg
            viewBox="0 0 440 200"
            className="orbit-preview"
            aria-label="Integrated post-maneuver trajectory preview"
          >
            <circle cx="220" cy="100" r="4" fill="#ecd19b" />
            <polyline
              points={preview
                .map(
                  (p) =>
                    `${220 + (p[0] / previewExtent) * 185},${100 - (p[1] / previewExtent) * 85}`,
                )
                .join(' ')}
              fill="none"
              stroke="#b8a4ec"
              strokeWidth="1.5"
            />
          </svg>
          <p className="footnote">
            Numerically integrated two-body preview, projected into XY. The executed universe
            includes the other bodies and their perturbations.
          </p>
          <svg
            viewBox="0 0 440 200"
            className="orbit-preview"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                const r = e.currentTarget.getBoundingClientRect();
                setDv((d) => ({
                  ...d,
                  prograde: ((e.clientX - r.left - r.width / 2) / r.width) * 4,
                  radial: (-(e.clientY - r.top - r.height / 2) / r.height) * 4,
                }));
              }
            }}
          >
            <circle cx="220" cy="100" r="4" fill="#e9d49c" />
            <path
              d={`M220 100 L${220 + dv.prograde * 100} ${100 - dv.radial * 40}`}
              stroke="#a8cafa"
              strokeWidth="2"
            />
            <circle cx={220 + dv.prograde * 100} cy={100 - dv.radial * 40} r="10" fill="#a8cafa" />
          </svg>
          {(['prograde', 'radial', 'normal'] as const).map((key) => (
            <NumberField
              key={key}
              label={`${key[0].toUpperCase() + key.slice(1)} Δv`}
              value={dv[key]}
              min={-100}
              max={100}
              unit="AU/yr"
              onChange={(v) => setDv((d) => ({ ...d, [key]: v }))}
            />
          ))}
          <p className="footnote">
            Predicted eccentricity:{' '}
            {orbitalState(
              body.p.map((v, k) => v - central.p[k]) as [number, number, number],
              burn(body, central, dv.prograde, dv.radial, dv.normal).v.map(
                (v, k) => v - central.v[k],
              ) as [number, number, number],
              G * central.mass,
            ).e.toFixed(4)}
          </p>
          <button
            className="solid-button"
            onClick={() => {
              reset(
                s.bodies.map((b) =>
                  b.id === body.id ? burn(body, central, dv.prograde, dv.radial, dv.normal) : b,
                ),
              );
              setModal(null);
              notify('Impulse executed. Previous state is available with Undo.');
            }}
          >
            Execute burn
          </button>
        </Modal>
      )}
    </div>
  );
}
