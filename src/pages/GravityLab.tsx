import { useEffect, useRef, useState } from 'react';
import {
  Download,
  Upload,
  Save,
  FolderOpen,
  Plus,
  Trash2,
  Play,
  Pause,
  RotateCcw,
  Info,
  Copy,
} from 'lucide-react';
import { preset, validateBodies, diagnostics, G, type Body } from '../simulation/nbody';
import { Metric, Range, Toggle } from '../components/UI';
import GravityWorkbench, {
  type GravitySnapshot as Snapshot,
  type GravitySample,
} from '../components/GravityWorkbench';
import { encounter } from '../simulation/advanced';
import { readConfiguration } from '../utils/export';
function initialSnapshot(bodies: Body[]): Snapshot {
  return {
    bodies,
    time: 0,
    drift: 0,
    collisionDelta: 0,
    kineticLoss: 0,
    collisions: 0,
    effectiveDt: 0,
    substeps: 0,
    historyIndex: 0,
    historyLength: 1,
    encounter: encounter(bodies),
    ...diagnostics(bodies),
  };
}
export default function GravityLab({ notify }: { notify: (text: string) => void }) {
  const [snapshot, setSnapshot] = useState<Snapshot>(() => initialSnapshot(preset('solar')));
  const [playing, setPlaying] = useState(false);
  const [scenario, setScenario] = useState('solar');
  const [dt, setDt] = useState(0.0002);
  const [speed, setSpeed] = useState(8);
  const [merge, setMerge] = useState(true);
  const [zoom, setZoom] = useState(150);
  const [selected, setSelected] = useState('earth');
  const [showVectors, setShowVectors] = useState(false);
  const [adaptive, setAdaptive] = useState(true),
    [samples, setSamples] = useState<GravitySample[]>([]),
    [revision, setRevision] = useState(0),
    [autoSlow, setAutoSlow] = useState(true);
  const undoStates = useRef<Body[][]>([]),
    drag = useRef<{ id: string; before: Body[] } | null>(null);
  const worker = useRef<Worker | null>(null),
    busy = useRef(false),
    canvas = useRef<HTMLCanvasElement>(null),
    file = useRef<HTMLInputElement>(null);
  const history = useRef<Map<string, [number, number][]>>(new Map());
  const state = useRef({ snapshot, selected, zoom, showVectors });
  useEffect(() => {
    state.current = { snapshot, selected, zoom, showVectors };
  });
  useEffect(() => {
    const w = new Worker(new URL('../workers/gravity-v2.worker.ts', import.meta.url), {
      type: 'module',
    });
    worker.current = w;
    w.onmessage = (event: MessageEvent<Snapshot>) => {
      busy.current = false;
      if (event.data.error) {
        setPlaying(false);
        notify(event.data.error);
        return;
      }
      setSnapshot(event.data);
      const s = event.data;
      setSamples((old) => [
        ...old.slice(-599),
        {
          time: s.time,
          energy: s.energy,
          drift: s.drift,
          angular: s.angularMomentum,
          distance: s.encounter.distance,
          speed: s.encounter.speed,
        },
      ]);
    };
    w.onerror = () => {
      busy.current = false;
      setPlaying(false);
      notify('The physics worker failed. Reload to restart.');
    };
    let initial = preset('solar');
    try {
      const shared = location.hash.split('/shared/')[1];
      if (shared) {
        const data = readConfiguration(shared) as { bodies: unknown };
        initial = validateBodies(data.bodies);
        notify('Shared experiment loaded. Units: AU, solar masses, normalized orbital years.');
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Invalid share link.');
    }
    w.postMessage({ type: 'reset', bodies: initial });
    return () => {
      w.terminate();
      worker.current = null;
    };
    // Notification identity is deliberately independent of worker lifecycle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => {
      if (busy.current || document.hidden) return;
      busy.current = true;
      const nearest = encounter(state.current.snapshot.bodies);
      const close = autoSlow && nearest.distance < 0.15;
      worker.current?.postMessage({
        type: 'step',
        dt,
        count: close ? Math.min(speed, 2) : speed,
        merge,
        adaptive,
      });
    }, 33);
    return () => clearInterval(interval);
  }, [playing, dt, speed, merge, adaptive, autoSlow]);
  useEffect(() => {
    const c = canvas.current!,
      ctx = c.getContext('2d')!;
    let w = 0,
      h = 0,
      frame = 0,
      lastTime = -1;
    const resize = new ResizeObserver(() => {
      const b = c.getBoundingClientRect();
      w = b.width;
      h = b.height;
      c.width = w * Math.min(devicePixelRatio, 2);
      c.height = h * Math.min(devicePixelRatio, 2);
      ctx.setTransform(Math.min(devicePixelRatio, 2), 0, 0, Math.min(devicePixelRatio, 2), 0, 0);
    });
    resize.observe(c);
    function draw() {
      const { snapshot: s, selected, zoom, showVectors } = state.current;
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = '#1a2635';
      ctx.lineWidth = 0.5;
      const spacing = zoom;
      const offsetX = (w / 2) % spacing,
        offsetY = (h / 2) % spacing;
      for (let x = offsetX; x < w; x += spacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = offsetY; y < h; y += spacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      s.bodies.forEach((b) => {
        if (lastTime !== s.time) {
          const trail = history.current.get(b.id) ?? [];
          trail.push([b.p[0], b.p[1]]);
          if (trail.length > 1600) trail.shift();
          history.current.set(b.id, trail);
        }
        const trail = history.current.get(b.id) ?? [];
        ctx.beginPath();
        ctx.strokeStyle = b.color + '66';
        ctx.lineWidth = 1.25;
        trail.forEach(([x, y], i) => {
          if (i === 0) ctx.moveTo(w / 2 + x * zoom, h / 2 - y * zoom);
          else ctx.lineTo(w / 2 + x * zoom, h / 2 - y * zoom);
        });
        ctx.stroke();
        const x = w / 2 + b.p[0] * zoom,
          y = h / 2 - b.p[1] * zoom,
          r = Math.max(b.radius * zoom, b.mass > 0.1 ? 10 : 5);
        const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
        glow.addColorStop(0, b.color + '55');
        glow.addColorStop(1, b.color + '00');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, r * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        if (b.id === selected) {
          ctx.strokeStyle = '#d3e7ff';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(x, y, r + 6, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.font = '11px system-ui';
        ctx.fillStyle = '#a3adbd';
        ctx.textAlign = 'center';
        ctx.fillText(b.name, x, y + r + 22);
        if (showVectors) {
          const vx = b.v[0] * zoom * 0.04,
            vy = -b.v[1] * zoom * 0.04;
          ctx.strokeStyle = '#8cdad3';
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + vx, y + vy);
          ctx.stroke();
          const a = Math.atan2(vy, vx);
          ctx.beginPath();
          ctx.moveTo(x + vx - 8 * Math.cos(a - 0.4), y + vy - 8 * Math.sin(a - 0.4));
          ctx.lineTo(x + vx, y + vy);
          ctx.lineTo(x + vx - 8 * Math.cos(a + 0.4), y + vy - 8 * Math.sin(a + 0.4));
          ctx.stroke();
        }
      });
      lastTime = s.time;
      ctx.strokeStyle = '#96a4b7';
      ctx.beginPath();
      const cx = w / 2 + s.com[0] * zoom,
        cy = h / 2 - s.com[1] * zoom;
      ctx.moveTo(cx - 4, cy);
      ctx.lineTo(cx + 4, cy);
      ctx.moveTo(cx, cy - 4);
      ctx.lineTo(cx, cy + 4);
      ctx.stroke();
      if (!document.hidden) frame = requestAnimationFrame(draw);
    }
    frame = requestAnimationFrame(draw);
    const visibility = () => {
      cancelAnimationFrame(frame);
      if (!document.hidden) frame = requestAnimationFrame(draw);
    };
    document.addEventListener('visibilitychange', visibility);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', visibility);
      resize.disconnect();
    };
  }, []);
  const reset = (bodies: Body[]) => {
    try {
      validateBodies(bodies);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Invalid system.');
      return;
    }
    setRevision((v) => v + 1);
    undoStates.current.push(structuredClone(snapshot.bodies));
    if (undoStates.current.length > 50) undoStates.current.shift();
    setSamples([]);
    setPlaying(false);
    history.current.clear();
    busy.current = false;
    worker.current?.postMessage({ type: 'reset', bodies });
    setSnapshot(initialSnapshot(bodies));
    if (!bodies.some((b) => b.id === selected)) setSelected(bodies[0].id);
  };
  const edit = (key: 'mass' | 'radius' | 'p' | 'v', value: number, index = 0) => {
    if (!Number.isFinite(value)) return;
    reset(
      snapshot.bodies.map((b) =>
        b.id !== selected
          ? b
          : {
              ...b,
              [key]:
                key === 'p' || key === 'v'
                  ? b[key].map((v, i) => (i === index ? value : v))
                  : value,
            },
      ),
    );
  };
  const body = snapshot.bodies.find((b) => b.id === selected) ?? snapshot.bodies[0];
  const exportJSON = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify({ version: 1, bodies: snapshot.bodies }, null, 2)], {
        type: 'application/json',
      }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'arnav-space-simulation-universe.json';
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="lab-page gravity-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">GRAVITY SANDBOX / 002</div>
          <h1>A universe of your making.</h1>
          <p>Add a world. Change its mass. See what gravity has in mind.</p>
        </div>
        <span className="fidelity">
          <span />
          Numerical physics simulation
        </span>
      </div>
      <div className="gravity-layout">
        <section className="panel gravity-canvas-panel">
          <div className="canvas-top">
            <select
              aria-label="Gravity scenario"
              value={scenario}
              onChange={(e) => {
                setScenario(e.target.value);
                reset(preset(e.target.value));
              }}
            >
              <option value="solar">Sun & Earth</option>
              <option value="binary">Binary stars</option>
              <option value="three">Three-body figure eight</option>
              <option value="collision">Planetary collision</option>
            </select>
            <span>XY PLANE · AU</span>
          </div>
          <canvas
            ref={canvas}
            className="gravity-canvas"
            aria-label="N-body simulation. Click a body to select it."
            onPointerDown={(e) => {
              const r = e.currentTarget.getBoundingClientRect(),
                x = (e.clientX - r.left - r.width / 2) / zoom,
                y = -(e.clientY - r.top - r.height / 2) / zoom;
              const nearest = [...snapshot.bodies].sort(
                (a, b) => Math.hypot(a.p[0] - x, a.p[1] - y) - Math.hypot(b.p[0] - x, b.p[1] - y),
              )[0];
              if (nearest && Math.hypot(nearest.p[0] - x, nearest.p[1] - y) < 20 / zoom) {
                setPlaying(false);
                setSelected(nearest.id);
                drag.current = { id: nearest.id, before: structuredClone(snapshot.bodies) };
                e.currentTarget.setPointerCapture(e.pointerId);
              }
            }}
            onPointerMove={(e) => {
              if (!drag.current) return;
              const r = e.currentTarget.getBoundingClientRect(),
                x = (e.clientX - r.left - r.width / 2) / zoom,
                y = -(e.clientY - r.top - r.height / 2) / zoom;
              setSnapshot((s) => ({
                ...s,
                bodies: s.bodies.map((b) =>
                  b.id === drag.current!.id ? { ...b, p: [x, y, b.p[2]] } : b,
                ),
              }));
            }}
            onPointerUp={() => {
              if (drag.current) {
                const before = drag.current.before;
                drag.current = null;
                reset(snapshot.bodies);
                undoStates.current[undoStates.current.length - 1] = before;
              }
            }}
            onPointerCancel={() => {
              if (drag.current) {
                setSnapshot(initialSnapshot(drag.current.before));
                drag.current = null;
              }
            }}
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect(),
                x = (e.clientX - r.left - r.width / 2) / zoom,
                y = -(e.clientY - r.top - r.height / 2) / zoom;
              const nearest = [...snapshot.bodies].sort(
                (a, b) => Math.hypot(a.p[0] - x, a.p[1] - y) - Math.hypot(b.p[0] - x, b.p[1] - y),
              )[0];
              if (nearest) setSelected(nearest.id);
            }}
          />
          <div className="canvas-bottom">
            <div className="play-group">
              <button
                className="primary icon-button"
                onClick={() => setPlaying(!playing)}
                aria-label={playing ? 'Pause gravity' : 'Run gravity'}
              >
                {playing ? <Pause size={18} /> : <Play size={18} />}
              </button>
              <button
                className="icon-button"
                aria-label="Reset gravity"
                onClick={() => reset(preset(scenario))}
              >
                <RotateCcw size={16} />
              </button>
              <span className="mono">{snapshot.time.toFixed(3)} yr</span>
            </div>
            <Range
              label="View scale"
              value={zoom}
              min={30}
              max={250}
              unit="px/AU"
              onChange={setZoom}
            />
          </div>
        </section>
        <aside className="panel body-editor">
          <div className="section-label">
            SYSTEM BODIES <span>{snapshot.bodies.length} / 64</span>
          </div>
          <div className="body-chips">
            {snapshot.bodies.map((b) => (
              <button
                key={b.id}
                className={selected === b.id ? 'active' : ''}
                onClick={() => setSelected(b.id)}
              >
                <i style={{ background: b.color }} />
                {b.name}
              </button>
            ))}
          </div>
          <button
            className="add-body"
            disabled={snapshot.bodies.length >= 64}
            onClick={() => {
              const id = crypto.randomUUID();
              reset([
                ...snapshot.bodies,
                {
                  id,
                  name: `Planet ${snapshot.bodies.length}`,
                  mass: 3e-6,
                  radius: 0.00004,
                  color: '#bdadf3',
                  p: [1.6, 0, 0],
                  v: [0, Math.sqrt(G / 1.6), 0],
                },
              ]);
              setSelected(id);
            }}
          >
            <Plus size={15} /> Add a planet
          </button>
          {body && (
            <>
              <hr />
              <div className="body-title">
                <h3>{body.name}</h3>
                <div>
                  <button
                    className="icon-button"
                    aria-label="Duplicate body"
                    disabled={snapshot.bodies.length >= 64}
                    onClick={() => {
                      const id = crypto.randomUUID();
                      reset([
                        ...snapshot.bodies,
                        {
                          ...structuredClone(body),
                          id,
                          name: `${body.name.slice(0, 50)} copy`,
                          p: [body.p[0] + 0.15, body.p[1] + 0.15, body.p[2]],
                        },
                      ]);
                      setSelected(id);
                    }}
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label="Remove body"
                    disabled={snapshot.bodies.length === 1}
                    onClick={() => reset(snapshot.bodies.filter((b) => b.id !== body.id))}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <label className="field">
                Body name
                <input
                  aria-label="Body name"
                  maxLength={60}
                  value={body.name}
                  onChange={(e) =>
                    reset(
                      snapshot.bodies.map((b) =>
                        b.id === body.id ? { ...b, name: e.target.value } : b,
                      ),
                    )
                  }
                />
              </label>
              <label className="field">
                Mass (solar masses)
                <input
                  aria-label="Body mass"
                  type="number"
                  min="0.000000001"
                  max="100"
                  step="any"
                  value={body.mass}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (v > 0 && v <= 100) edit('mass', v);
                  }}
                />
              </label>
              <label className="field">
                Collision radius (AU)
                <input
                  aria-label="Body radius"
                  type="number"
                  min="0.0000001"
                  max="10"
                  step="any"
                  value={body.radius}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (v > 0 && v <= 10) edit('radius', v);
                  }}
                />
              </label>
              <div className="numeric-grid">
                {(['p', 'v'] as const).flatMap((k) =>
                  [0, 1, 2].map((i) => (
                    <label key={`${k}${i}`} className="field">
                      {k === 'p' ? 'Position' : 'Velocity'} {'XYZ'[i]} ({k === 'p' ? 'AU' : 'AU/yr'}
                      )
                      <input
                        type="number"
                        step="0.1"
                        value={body[k][i]}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          if (Math.abs(v) < 1e5) edit(k, v, i);
                        }}
                      />
                    </label>
                  )),
                )}
              </div>
            </>
          )}
        </aside>
      </div>
      <div className="panel gravity-diagnostics">
        <Metric label="Total energy¹" value={snapshot.energy.toExponential(4)} />
        <Metric label="Relative energy drift" value={(snapshot.drift * 100).toFixed(5)} unit="%" />
        <Metric label="Angular momentum²" value={snapshot.angularMomentum.toExponential(4)} />
        <Metric label="Solver" value="Velocity Verlet" />
      </div>
      <div className="gravity-settings panel">
        <Range
          label="Integration step"
          value={dt}
          min={0.00001}
          max={0.002}
          step={0.00001}
          unit="yr"
          onChange={setDt}
        />
        <Range label="Steps per tick" value={speed} min={1} max={60} onChange={setSpeed} />
        <Toggle label="Merge on collision" checked={merge} onChange={() => setMerge(!merge)} />
        <Toggle
          label="Velocity vectors"
          checked={showVectors}
          onChange={() => setShowVectors(!showVectors)}
        />
      </div>
      <div className="save-actions">
        <button
          onClick={() => {
            try {
              localStorage.setItem(
                'arnav-space-simulation-universe',
                JSON.stringify(snapshot.bodies),
              );
              notify('Universe saved on this device.');
            } catch {
              notify('Device storage is unavailable. Export JSON instead.');
            }
          }}
        >
          <Save size={15} /> Save universe
        </button>
        <button
          onClick={() => {
            try {
              const data = localStorage.getItem('arnav-space-simulation-universe');
              if (!data) throw new Error('No saved universe yet.');
              reset(validateBodies(JSON.parse(data)));
              notify('Saved universe loaded.');
            } catch (e) {
              notify(e instanceof Error ? e.message : 'Could not load universe.');
            }
          }}
        >
          <FolderOpen size={15} /> Load saved
        </button>
        <button onClick={exportJSON}>
          <Download size={15} /> Export JSON
        </button>
        <button onClick={() => file.current?.click()}>
          <Upload size={15} /> Import JSON
        </button>
        <input
          ref={file}
          hidden
          type="file"
          accept=".json,application/json"
          onChange={async (e) => {
            try {
              const f = e.target.files?.[0];
              if (!f) return;
              if (f.size > 100000) throw new Error('Use a file smaller than 100 KB.');
              const data = JSON.parse(await f.text());
              reset(validateBodies(data.bodies));
              notify('Universe imported.');
            } catch (error) {
              notify(error instanceof Error ? error.message : 'Invalid simulation file.');
            }
            e.target.value = '';
          }}
        />
      </div>
      <GravityWorkbench
        revision={revision}
        autoSlow={autoSlow}
        setAutoSlow={setAutoSlow}
        snapshot={snapshot}
        samples={samples}
        selected={selected}
        reset={reset}
        rewind={(index) => {
          setPlaying(false);
          history.current.clear();
          worker.current?.postMessage({ type: 'rewind', index });
        }}
        undo={() => {
          const previous = undoStates.current.pop();
          if (previous) {
            reset(previous);
            undoStates.current.pop();
            notify('Previous body state restored.');
          } else notify('No earlier edits to restore.');
        }}
        adaptive={adaptive}
        setAdaptive={setAdaptive}
        notify={notify}
        start={() => setPlaying(true)}
      />
      <div className="callout">
        <Info size={16} />
        <p>
          Newtonian point-mass gravity, no softening. Bodies have exaggerated display sizes;
          collision radii use AU. Collisions merge mass and momentum, dissipating kinetic energy.
          Remnant spin is discarded; orbital angular momentum can change during merging. Edits pause
          and restart diagnostics. Time uses normalized orbital years, G = 4π². ¹ M☉·AU²/yr². ²
          M☉·AU²/yr. Close encounters may require a smaller timestep.
        </p>
      </div>
    </div>
  );
}
