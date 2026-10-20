import { useEffect, useState } from 'react';
import {
  Camera,
  Save,
  Download,
  FolderOpen,
  Activity,
  Ruler,
  SlidersHorizontal,
} from 'lucide-react';
import { planets, AU_KM } from '../data/planets';
import { ephemerisPosition, lunarPhase } from '../simulation/ephemeris';
import type { SceneSettings } from '../scenes/SolarScene';
import { Metric, Toggle } from './UI';
import NumberField from './NumberField';
import { csv, downloadFile } from '../utils/export';
interface Workspace {
  name: string;
  selected: string;
  date: number;
  settings: SceneSettings;
  camera?: { position: number[]; target: number[] };
}
interface Performance {
  fps: number;
  calls: number;
  triangles: number;
  textures: number;
  geometries: number;
  frameMs: number;
}
export default function ExplorerTools({
  date,
  selected,
  settings,
  patch,
  restore,
  notify,
}: {
  date: number;
  selected: string;
  settings: SceneSettings;
  patch: (s: Partial<SceneSettings>) => void;
  restore: (w: Workspace) => void;
  notify: (t: string) => void;
}) {
  const [open, setOpen] = useState(false),
    [advanced, setAdvanced] = useState(false),
    [other, setOther] = useState('mars'),
    [units, setUnits] = useState('AU'),
    [showPerformance, setShowPerformance] = useState(false),
    [perf, setPerf] = useState<Performance | null>(null),
    [workspaceName, setWorkspaceName] = useState('My observatory'),
    [workspaces, setWorkspaces] = useState<Workspace[]>(() => {
      try {
        return JSON.parse(localStorage.getItem('ass-workspaces') ?? '[]');
      } catch {
        return [];
      }
    }),
    [pack, setPack] = useState(''),
    [exportScale, setExportScale] = useState(2),
    [withLabels, setWithLabels] = useState(true),
    [value, setValue] = useState(1);
  useEffect(() => {
    const listener = (event: Event) => setPerf((event as CustomEvent<Performance>).detail);
    addEventListener('ass:performance', listener);
    return () => removeEventListener('ass:performance', listener);
  }, []);
  const first = ephemerisPosition(selected, date),
    second = ephemerisPosition(other, date),
    difference = first.map((v, k) => v - second[k]),
    distance = Math.hypot(...difference),
    dt = 3600000,
    velocity = (id: string) =>
      ephemerisPosition(id, date + dt).map(
        (v, k) => ((v - ephemerisPosition(id, date - dt)[k]) * AU_KM) / 7200,
      ),
    v1 = velocity(selected),
    v2 = velocity(other),
    relative = Math.hypot(...v1.map((v, k) => v - v2[k])),
    phase = lunarPhase(date);
  const save = () => {
    const cameraJson = localStorage.getItem('ass-camera-current');
    const w: Workspace = {
      name: workspaceName.slice(0, 60) || 'Workspace',
      date,
      selected,
      settings,
      camera: cameraJson ? JSON.parse(cameraJson) : undefined,
    };
    const next = [w, ...workspaces.filter((s) => s.name !== w.name)].slice(0, 12);
    try {
      localStorage.setItem('ass-workspaces', JSON.stringify(next));
      setWorkspaces(next);
      notify('Workspace saved with camera, epoch, selected world, and display settings.');
    } catch {
      notify('Device storage is unavailable. Export your workspace instead.');
    }
  };
  return (
    <div className={`explorer-tools ${open ? 'open' : ''}`}>
      <button className="tools-trigger" onClick={() => setOpen(!open)}>
        <SlidersHorizontal size={14} />
        {open ? 'Close instruments' : 'Observatory instruments'}
      </button>
      {open && (
        <section className="panel tools-panel">
          <div className="section-label">YOUR SCIENTIFIC WORKSPACE</div>
          {selected === 'jupiter' && (
            <details open>
              <summary>Galilean moon cameras</summary>
              <div className="save-actions">
                {[
                  ['system', 'Moon system'],
                  ['io', 'Io'],
                  ['europa', 'Europa'],
                  ['ganymede', 'Ganymede'],
                  ['callisto', 'Callisto'],
                  ['jupiter', 'Return to Jupiter'],
                ].map(([id, name]) => (
                  <button
                    key={id}
                    onClick={() => {
                      dispatchEvent(new CustomEvent('ass:focus-moon', { detail: id }));
                      setOpen(false);
                    }}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </details>
          )}
          <Toggle
            label="Advanced instruments"
            checked={advanced}
            onChange={() => setAdvanced(!advanced)}
          />
          <div className="tools-grid">
            <label className="field">
              Reference frame
              <select
                aria-label="Reference frame"
                value={settings.frame ?? 'heliocentric'}
                onChange={(e) => patch({ frame: e.target.value as SceneSettings['frame'] })}
              >
                <option value="heliocentric">Sun centered</option>
                <option value="barycentric">Approximate system barycenter</option>
                <option value="body">Selected body centered</option>
              </select>
            </label>
            <label className="field">
              Body scale
              <select
                aria-label="Body scale"
                value={settings.bodyScale ?? 'educational'}
                onChange={(e) =>
                  patch({
                    bodyScale: e.target.value as SceneSettings['bodyScale'],
                    trueScale: e.target.value === 'physical' ? true : settings.trueScale,
                  })
                }
              >
                <option value="educational">Educational sizes</option>
                <option value="physical">Physical sizes & distances</option>
              </select>
            </label>
            <label className="field">
              Surface presentation
              <select
                value={settings.surfaceLayer ?? 'natural'}
                onChange={(e) =>
                  patch({ surfaceLayer: e.target.value as SceneSettings['surfaceLayer'] })
                }
              >
                <option value="natural">Source map colors</option>
                <option value="enhanced">Enhanced contrast</option>
                <option value="grayscale">Grayscale surface</option>
                {selected === 'earth' && (
                  <>
                    <option value="nightmap">Earth night-light source map</option>
                    <option value="clouds">Cloud source map</option>
                    <option value="relief">NASA elevation visualization</option>
                  </>
                )}
              </select>
            </label>
          </div>
          <Toggle
            label="Earth night lights"
            checked={settings.nightLights !== false}
            onChange={() => patch({ nightLights: settings.nightLights === false })}
          />
          <Toggle
            label="Scientific vector & plane overlays"
            checked={!!settings.overlays}
            onChange={() => patch({ overlays: !settings.overlays })}
          />
          {settings.overlays && (
            <p className="footnote">
              Mint arrow: rendered velocity direction. Gold spheres: perihelion / aphelion. Mint
              diamonds: ascending / descending nodes of the JPL ellipse; omitted for the
              near-coplanar Earth. Grid: J2000 ecliptic plane. Marker sizes are illustrative.
            </p>
          )}
          <div className="scale-legend">
            <span className="scale-line" />
            <span>
              {settings.trueScale
                ? '1 AU = 10 scene units'
                : `Local radial scale at ${selected}: ${(12 / (1 + Math.hypot(...first))).toFixed(2)} scene units / AU`}
            </span>
          </div>
          {settings.surfaceLayer === 'relief' && (
            <p className="footnote">
              NASA Earth Observatory / GEBCO_08 elevation visualization, 0–6400 m source range. Flat
              image overlay; no terrain displacement or survey-grade height measurement. Credited
              educational use.
            </p>
          )}
          <details>
            <summary>Models, epoch & measurement provenance</summary>
            <p className="footnote">
              Epoch: {new Date(date).toISOString()}. Positions, Moon and Jovian moons: Astronomy
              Engine geometric ephemerides. Planet shapes: NASA/NSSDC rounded radii. Trajectory
              ellipses, apsides and nodes: JPL approximate elements. Velocity: centered finite
              differences over ±1 hour. Earth pole, Greenwich and spin: IAU orientation with
              verified NASA map georeferencing. Numerical model errors are sampled in Science Labs →
              Model validation; no per-observation uncertainty is invented. Star directions: HYG
              J2000 catalog; proper motion omitted.
            </p>
          </details>
          <p className="footnote">
            {settings.bodyScale === 'physical'
              ? 'Physical radii and proportional distances. Planet-centered origins and logarithmic depth preserve close-up precision.'
              : 'Body radii are exaggerated. Compressed mode changes radial distances nonlinearly.'}
          </p>
          <details open={advanced}>
            <summary>
              <Ruler size={13} /> Measure between worlds
            </summary>
            <div className="tools-grid">
              <label className="field">
                Second object
                <select value={other} onChange={(e) => setOther(e.target.value)}>
                  {planets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Distance units
                <select value={units} onChange={(e) => setUnits(e.target.value)}>
                  <option>AU</option>
                  <option>km</option>
                  <option>light-years</option>
                </select>
              </label>
            </div>
            <div className="stage-metrics">
              <Metric
                label="Physical separation"
                value={(units === 'km'
                  ? distance * AU_KM
                  : units === 'light-years'
                    ? distance / 63241.077
                    : distance
                ).toPrecision(6)}
                unit={units}
              />
              <Metric label="Relative speed" value={relative.toFixed(3)} unit="km/s" />
              <Metric
                label="One-way light time"
                value={((distance * AU_KM) / 299792.458 / 60).toFixed(3)}
                unit="min"
              />
              <Metric
                label="Moon illuminated fraction"
                value={(phase.illuminatedFraction * 100).toFixed(2)}
                unit="%"
              />
            </div>
            <button
              className="text-button"
              onClick={() =>
                downloadFile(
                  'arnav-space-simulation-state-vectors.csv',
                  csv([
                    ['body', 'epoch_UTC', 'x_AU', 'y_AU', 'z_AU', 'vx_km_s', 'vy_km_s', 'vz_km_s'],
                    ...planets.map((p) => [
                      p.name,
                      new Date(date).toISOString(),
                      ...ephemerisPosition(p.id, date),
                      ...velocity(p.id),
                    ]),
                  ]),
                  'text/csv',
                )
              }
            >
              Export epoch state vectors CSV →
            </button>
          </details>
          <details>
            <summary>
              <Save size={13} /> Saved workspaces
            </summary>
            <label className="field">
              Workspace name
              <input value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} />
            </label>
            <button className="solid-button" onClick={save}>
              Save this workspace
            </button>
            {workspaces.map((w, i) => (
              <button className="workspace-entry" key={i} onClick={() => restore(w)}>
                <FolderOpen size={13} />
                {w.name}
                <small>{new Date(w.date).toISOString().slice(0, 10)}</small>
              </button>
            ))}
            <button
              className="text-button"
              onClick={() =>
                downloadFile(
                  'arnav-space-simulation-workspaces.json',
                  JSON.stringify({ version: 2, workspaces }, null, 2),
                )
              }
            >
              Export workspaces →
            </button>
          </details>
          <details>
            <summary>
              <Camera size={13} /> Capture studio
            </summary>
            <label className="field">
              Output resolution
              <select value={exportScale} onChange={(e) => setExportScale(Number(e.target.value))}>
                <option value="1">Screen resolution</option>
                <option value="2">2× resolution</option>
                <option value="3">3× resolution</option>
              </select>
            </label>
            <Toggle
              label="Include timestamp, model & credits"
              checked={withLabels}
              onChange={() => setWithLabels(!withLabels)}
            />
            <button
              className="solid-button"
              onClick={() =>
                dispatchEvent(
                  new CustomEvent('ass:capture', {
                    detail: { scale: exportScale, labels: withLabels },
                  }),
                )
              }
            >
              Download scene PNG
            </button>
          </details>
          <details>
            <summary>
              <Download size={13} /> Offline exploration pack
            </summary>
            <p className="footnote">
              Save the current release's code, maps, and catalogs on this device. Catalog epochs
              remain visible offline.
            </p>
            <button
              className="solid-button"
              onClick={async () => {
                if (!import.meta.env.PROD || !('serviceWorker' in navigator)) {
                  setPack('Offline packs are available on the deployed site.');
                  return;
                }
                try {
                  const registration = await Promise.race([
                    navigator.serviceWorker.ready,
                    new Promise<never>((_, reject) =>
                      setTimeout(() => reject(new Error('Offline worker unavailable')), 8000),
                    ),
                  ]);
                  const channel = new MessageChannel();
                  channel.port1.onmessage = (e) =>
                    setPack(
                      e.data.error
                        ? e.data.error
                        : e.data.done
                          ? 'Offline exploration pack saved.'
                          : `Saving ${e.data.completed} / ${e.data.total} assets…`,
                    );
                  registration.active?.postMessage({ type: 'CACHE_PACK' }, [channel.port2]);
                  setPack('Preparing offline pack…');
                } catch {
                  setPack('Offline storage is unavailable in this browser.');
                }
              }}
            >
              Download offline pack
            </button>
            <p role="status" className="footnote">
              {pack}
            </p>
          </details>
          {advanced && (
            <details>
              <summary>Scientific notation & unit converter</summary>
              <NumberField label="Astronomical units" value={value} onChange={setValue} />
              <p className="footnote">
                {(value * AU_KM).toExponential(8)} km · {(value / 63241.077).toExponential(8)}{' '}
                light-years. Number fields accept scientific notation; Enter commits, arrows adjust
                by 1%.
              </p>
            </details>
          )}
          <Toggle
            label="Performance diagnostics"
            checked={showPerformance}
            onChange={() => setShowPerformance(!showPerformance)}
          />
          {showPerformance && perf && (
            <div className="performance-readout">
              <Activity size={14} />
              <span>
                {perf.fps.toFixed(0)} FPS · {perf.frameMs.toFixed(1)} ms · {perf.calls} draws ·{' '}
                {perf.triangles.toLocaleString()} triangles · {perf.textures} textures
              </span>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
