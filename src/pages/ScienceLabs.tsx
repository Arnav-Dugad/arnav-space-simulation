import { useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Download, FlaskConical } from 'lucide-react';
import { Metric, Range, Toggle } from '../components/UI';
import Chart from '../components/Chart';
import NumberField from '../components/NumberField';
import {
  blackHole,
  planetProperties,
  rocketInitial,
  rocketStep,
  type RocketConfig,
  type RocketState,
} from '../simulation/advanced';
import {
  lunarOffset,
  ephemerisPosition,
  lunarPhase,
  upcomingEclipses,
} from '../simulation/ephemeris';
import { ephemerisValidationRows } from '../simulation/ephemerisValidation';
import { solveKepler } from '../simulation/orbital';
import { preset, step } from '../simulation/nbody';
import { csv, downloadFile } from '../utils/export';
import { AU_KM } from '../data/planets';
const labs = [
  { id: 'rocket', name: 'Rocket ascent', caption: 'Thrust. Gravity. Flight.' },
  { id: 'blackhole', name: 'Black holes', caption: 'At the edge of spacetime.' },
  { id: 'eclipse', name: 'Eclipses', caption: 'When worlds align.' },
  { id: 'designer', name: 'Planet designer', caption: 'Imagine another home.' },
  { id: 'kepler', name: 'Kepler’s laws', caption: 'The geometry of motion.' },
  {
    id: 'sensitivity',
    name: 'Experiment comparison',
    caption: 'Small changes. Different futures.',
  },
  { id: 'validation', name: 'Model validation', caption: 'Evidence behind the view.' },
];
export default function ScienceLabs() {
  const [lab, setLab] = useState(() => location.hash.split('/')[1] || 'rocket');
  useEffect(() => {
    const change = () => setLab(location.hash.split('/')[1] || 'rocket');
    addEventListener('hashchange', change);
    return () => removeEventListener('hashchange', change);
  }, []);
  const active = labs.find((l) => l.id === lab) ?? labs[0];
  return (
    <div className="lab-page science-labs">
      <div className="page-heading">
        <div>
          <div className="eyebrow">THE EXPERIMENT COLLECTION</div>
          <h1>{active.caption}</h1>
          <p>Working models, visible assumptions, and room to discover.</p>
        </div>
        <span className="fidelity">
          <span />
          Interactive scientific laboratories
        </span>
      </div>
      <nav className="lab-tabs" aria-label="Science experiments">
        {labs.map((l) => (
          <button
            key={l.id}
            className={active.id === l.id ? 'active' : ''}
            onClick={() => {
              setLab(l.id);
              location.hash = `labs/${l.id}`;
            }}
          >
            <FlaskConical size={14} />
            {l.name}
          </button>
        ))}
      </nav>
      {active.id === 'rocket' ? (
        <RocketLab />
      ) : active.id === 'blackhole' ? (
        <BlackHoleLab />
      ) : active.id === 'eclipse' ? (
        <EclipseLab />
      ) : active.id === 'designer' ? (
        <PlanetDesigner />
      ) : active.id === 'kepler' ? (
        <KeplerLab />
      ) : active.id === 'sensitivity' ? (
        <SensitivityLab />
      ) : (
        <ValidationLab />
      )}
    </div>
  );
}
function RocketLab() {
  const [config, setConfig] = useState<RocketConfig>({
      dryMass: 10000,
      fuel: 90000,
      thrust: 1800,
      isp: 320,
      cd: 0.4,
      area: 8,
      pitch: 0,
      throttle: 1,
      stages: 1,
    }),
    [flight, setFlight] = useState<RocketState>(() => rocketInitial(config)),
    [running, setRunning] = useState(false),
    [states, setStates] = useState<RocketState[]>([]),
    [replay, setReplay] = useState<number | null>(null),
    [countdown, setCountdown] = useState<number | null>(null);
  const flightRef = useRef(flight);
  useEffect(() => {
    flightRef.current = flight;
  }, [flight]);
  useEffect(() => {
    if (countdown === null) return;
    const timer = setTimeout(() => {
      if (countdown === 0) {
        setRunning(true);
        setCountdown(null);
      } else setCountdown(countdown - 1);
    }, 650);
    return () => clearTimeout(timer);
  }, [countdown]);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      let next = flightRef.current;
      for (let i = 0; i < 10; i++) next = rocketStep(next, config, 0.1);
      if (next.altitude < -0.1 || next.t > 1500) setRunning(false);
      flightRef.current = next;
      setFlight(next);
      setStates((old) => [...old.slice(-1499), next]);
    }, 33);
    return () => clearInterval(timer);
  }, [running, config]);
  const shown = replay === null ? flight : (states[Math.min(replay, states.length - 1)] ?? flight);
  const maxAlt = Math.max(10000, ...states.map((s) => s.altitude)),
    xmax = Math.max(2000, ...states.map((s) => Math.abs(s.x))),
    path = states
      .map(
        (s, i) =>
          `${i ? 'L' : 'M'} ${70 + (s.x / xmax) * 410} ${360 - (Math.max(0, s.altitude) / maxAlt) * 290}`,
      )
      .join(' ');
  const patch = (p: Partial<RocketConfig>) => setConfig((c) => ({ ...c, ...p }));
  return (
    <>
      <div className="experiment-layout">
        <section className="panel controls-panel">
          <div className="section-label">VEHICLE & GUIDANCE</div>
          <NumberField
            label="Dry mass"
            value={config.dryMass}
            min={100}
            max={1e7}
            unit="kg"
            onChange={(v) => patch({ dryMass: v })}
          />
          <NumberField
            label="Total propellant"
            value={config.fuel}
            min={0}
            max={1e8}
            unit="kg"
            onChange={(v) => patch({ fuel: v })}
          />
          <NumberField
            label="Engine thrust"
            value={config.thrust}
            min={0}
            max={50000}
            unit="kN"
            onChange={(v) => patch({ thrust: v })}
          />
          <Range
            label="Specific impulse"
            value={config.isp}
            min={100}
            max={500}
            unit="s"
            onChange={(v) => patch({ isp: v })}
          />
          <Range
            label="Pitch from vertical"
            value={config.pitch}
            min={0}
            max={90}
            unit="°"
            onChange={(v) => patch({ pitch: v })}
          />
          <Range
            label="Throttle"
            value={config.throttle}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => patch({ throttle: v })}
          />
          <Range
            label="Stages"
            value={config.stages}
            min={1}
            max={3}
            onChange={(v) => {
              patch({ stages: v });
              setRunning(false);
              setStates([]);
              setFlight(rocketInitial({ ...config, stages: v }));
            }}
          />
          <div className="save-actions">
            <button
              onClick={() => {
                setReplay(null);
                if (flight.t === 0) {
                  setFlight(rocketInitial(config));
                  setStates([]);
                  setCountdown(3);
                } else setRunning(!running);
              }}
            >
              {running ? <Pause size={15} /> : <Play size={15} />}
              {running ? 'Pause' : 'Launch / resume'}
            </button>
            <button
              onClick={() => {
                setRunning(false);
                setCountdown(null);
                setStates([]);
                setReplay(null);
                setFlight(rocketInitial(config));
              }}
            >
              <RotateCcw size={15} />
              Reset flight
            </button>
          </div>
        </section>
        <section className="panel experiment-stage">
          <div className="section-label">
            FLIGHT PATH <span>2D CENTRAL GRAVITY · EXPONENTIAL ATMOSPHERE</span>
          </div>
          <svg viewBox="0 0 580 420" aria-label="Computed rocket trajectory">
            <defs>
              <linearGradient id="sky" x2="0" y2="1">
                <stop stopColor="#080c16" />
                <stop offset="1" stopColor="#192e48" />
              </linearGradient>
            </defs>
            <rect x="15" y="40" width="550" height="330" rx="12" fill="url(#sky)" />
            <path d="M15 370 H565" stroke="#69846b" />
            <path d={path} fill="none" stroke="#9fc8fc" strokeWidth="2" />
            <g
              transform={`translate(${70 + (shown.x / xmax) * 410} ${360 - (Math.max(0, shown.altitude) / maxAlt) * 290}) rotate(${config.pitch})`}
            >
              <path d="M0 -15 L6 8 L-6 8 Z" fill="#dce9fa" />
              {running && shown.fuel > 0 && config.throttle > 0 && (
                <path d="M-4 8 L0 26 L4 8" fill="#edb976" />
              )}
            </g>
            <text x="35" y="395">
              GROUND · {shown.stage} / {config.stages} STAGES
            </text>
            {countdown !== null && (
              <text x="290" y="170" textAnchor="middle" className="countdown">
                {countdown === 0 ? 'IGNITION' : countdown}
              </text>
            )}
          </svg>
          <div className="stage-metrics">
            <Metric label="Altitude" value={(shown.altitude / 1000).toFixed(2)} unit="km" />
            <Metric label="Velocity" value={(shown.speed / 1000).toFixed(3)} unit="km/s" />
            <Metric label="Remaining stage fuel" value={shown.fuel.toFixed(0)} unit="kg" />
            <Metric
              label="Max dynamic pressure"
              value={(shown.maxQ / 1000).toFixed(1)}
              unit="kPa"
            />
          </div>
          <p className="footnote">
            {shown.altitude < 0
              ? 'Flight ended at ground contact. Try a higher thrust-to-weight ratio or less pitch.'
              : shown.fuel <= 0
                ? 'Engine cutoff. The trajectory continues ballistically.'
                : `T+${shown.t.toFixed(1)} s · acceleration ${shown.acceleration.toFixed(2)} m/s²`}
          </p>
        </section>
      </div>
      <section className="panel chart-panel">
        <Chart label="Altitude (km)" values={states.map((s) => s.altitude / 1000)} />
        <Chart
          label="Dynamic pressure (kPa)"
          values={states.map((s) => s.dynamicPressure / 1000)}
          color="#e3b285"
        />
        {states.length > 1 && (
          <Range
            label="Flight replay"
            value={replay ?? states.length - 1}
            min={0}
            max={states.length - 1}
            onChange={(v) => {
              setRunning(false);
              setReplay(v);
            }}
          />
        )}
        <button
          className="text-button"
          onClick={() =>
            downloadFile(
              'arnav-space-simulation-flight.csv',
              csv([
                ['time_s', 'altitude_m', 'speed_m_s', 'fuel_kg', 'dynamic_pressure_Pa', 'stage'],
                ...states.map((s) => [
                  s.t,
                  s.altitude,
                  s.speed,
                  s.fuel,
                  s.dynamicPressure,
                  s.stage,
                ]),
              ]),
              'text/csv',
            )
          }
        >
          <Download size={14} />
          Export flight CSV
        </button>
      </section>
      <p className="footnote">
        Simplified 2D flight: spherical Earth, non-rotating atmosphere, fixed Cd={config.cd}, area=
        {config.area} m², 8.5 km density scale height, 0.1 s kinematic integration steps. Fuel is
        split equally between stages; staging jettisons an illustrative 18% of initial dry mass.
        Configuration changes should be followed by Reset. Not a launch performance predictor.
      </p>
    </>
  );
}
function BlackHoleLab() {
  const [mass, setMass] = useState(10),
    [radius, setRadius] = useState(5),
    [impact, setImpact] = useState(20),
    [angle, setAngle] = useState(20),
    [performance, setPerformance] = useState(false);
  const b = blackHole(mass, radius, impact);
  return (
    <>
      <div className="experiment-layout">
        <section className="panel controls-panel">
          <div className="section-label">SCHWARZSCHILD GEOMETRY</div>
          <NumberField
            label="Black hole mass"
            value={mass}
            min={0.1}
            max={1e11}
            unit="solar masses"
            onChange={setMass}
          />
          <Range
            label="Observer radius"
            value={radius}
            min={1.01}
            max={30}
            step={0.01}
            unit="Schwarzschild radii"
            onChange={setRadius}
          />
          <Range
            label="Light impact parameter"
            value={impact}
            min={10}
            max={100}
            unit="Schwarzschild radii"
            onChange={setImpact}
          />
          <Range
            label="Disk inclination"
            value={angle}
            min={0}
            max={80}
            unit="°"
            onChange={setAngle}
          />
          <Toggle
            label="Performance view"
            checked={performance}
            onChange={() => setPerformance(!performance)}
          />
          <p className="footnote">
            Disk and photon curves are educational illustrations. Deflection uses the weak-field
            formula 4GM/(bc²), restricted to b ≥ 10 rₛ; no relativistic ray tracer is claimed.
          </p>
        </section>
        <section
          className={`panel black-hole-stage ${performance ? 'performance' : ''}`}
          style={{ '--disk-angle': `${angle}deg` } as React.CSSProperties}
        >
          <div className="black-hole-stars" />
          <div className="accretion-disk" />
          <div className="photon-ring" />
          <div className="event-horizon" />
          <svg
            viewBox="0 0 600 420"
            className="photon-overlay"
            aria-label="Illustrative photon path bending"
          >
            <path
              d={`M0 105 Q ${220} ${105} 300 ${105 + 200 / impact} T600 ${105 + 400 / impact}`}
              fill="none"
              stroke="#b3d3ff"
              strokeDasharray="4 7"
              opacity=".6"
            />
          </svg>
          <span className="stage-caption">EDUCATIONAL DISK / WEAK-FIELD LIGHT DEFLECTION</span>
        </section>
      </div>
      <div className="panel science-readouts">
        <Metric
          label="Event horizon radius"
          value={b.radiusKm.toLocaleString(undefined, { maximumFractionDigits: 3 })}
          unit="km"
        />
        <Metric label="Photon sphere radius" value={b.photonSphereKm.toPrecision(5)} unit="km" />
        <Metric label="Non-spinning ISCO radius" value={b.iscoKm.toPrecision(5)} unit="km" />
        <Metric label="Observer clock / distant clock" value={b.dilation.toFixed(5)} />
        <Metric
          label="Weak-field deflection"
          value={((b.deflectionRad * 180) / Math.PI).toFixed(3)}
          unit="°"
        />
      </div>
      <p className="footnote">
        A static observer's proper time is √(1 − rₛ/r) times Schwarzschild coordinate time. This
        excludes orbital velocity, spin, and the acceleration needed to hover. Disk brightness is
        artistic, not simulated plasma physics.
      </p>
    </>
  );
}
function EclipseLab() {
  const [date, setDate] = useState(() => Date.now());
  const events = useMemo(() => upcomingEclipses(date, 6), [date]);
  const moon = lunarOffset(date).map((v) => v * AU_KM),
    earth = ephemerisPosition('earth', date),
    earthMag = Math.hypot(...earth),
    axis = earth.map((v) => v / earthMag),
    along = moon.reduce((s, v, k) => s + v * axis[k], 0),
    offset = Math.sqrt(Math.max(0, moon.reduce((s, v) => s + v * v, 0) - along * along)),
    umbra = 6371 - (along * (696340 - 6371)) / (earthMag * AU_KM),
    intersects = along > 0 && offset < umbra + 1737.4,
    phase = lunarPhase(date);
  return (
    <>
      <div className="panel eclipse-geometry">
        <div className="section-label">GEOMETRY AT SELECTED INSTANT</div>
        <label className="field">
          UTC date and time
          <input
            aria-label="Eclipse date"
            type="datetime-local"
            value={new Date(date).toISOString().slice(0, 16)}
            onChange={(e) => {
              const value = Date.parse(e.target.value + 'Z');
              if (Number.isFinite(value)) setDate(value);
            }}
          />
        </label>
        <svg viewBox="0 0 850 230" aria-label="Earth umbra and Moon shadow intersection schematic">
          <defs>
            <linearGradient id="umbra">
              <stop stopColor="#5674a433" />
              <stop offset="1" stopColor="#5674a400" />
            </linearGradient>
          </defs>
          <circle cx="65" cy="115" r="48" fill="#edce91" />
          <path d="M320 78 L800 101 L800 129 L320 152 Z" fill="url(#umbra)" />
          <path d="M320 78 L800 101 M320 152 L800 129" stroke="#536a8d" strokeDasharray="5 5" />
          <circle cx="320" cy="115" r="37" fill="#659ddc" />
          <circle
            cx="640"
            cy={115 + Math.min(80, offset / 4000) * (moon[2] >= 0 ? 1 : -1)}
            r="13"
            fill={intersects ? '#b56e58' : '#c7cbd0'}
          />
          <text x="65" y="205" textAnchor="middle">
            Sun
          </text>
          <text x="320" y="205" textAnchor="middle">
            Earth
          </text>
          <text x="640" y="205" textAnchor="middle">
            Moon
          </text>
        </svg>
        <div className="stage-metrics">
          <Metric
            label="Moon illumination"
            value={(phase.illuminatedFraction * 100).toFixed(1)}
            unit="%"
          />
          <Metric label="Distance from Earth shadow axis" value={offset.toFixed(0)} unit="km" />
          <Metric
            label="Umbra radius at Moon's axial distance"
            value={Math.max(0, umbra).toFixed(0)}
            unit="km"
          />
          <Metric label="Earth umbra intersection" value={intersects ? 'Yes' : 'No'} />
        </div>
      </div>
      <div className="panel table-panel">
        <div className="section-label">UPCOMING GLOBAL ECLIPSES · ASTRONOMY ENGINE</div>
        <table>
          <thead>
            <tr>
              <th>TYPE</th>
              <th>PEAK UTC</th>
              <th>KIND</th>
              <th>EXPLORE</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event, i) => (
              <tr key={i}>
                <td>{event.type}</td>
                <td>{new Date(event.peak).toISOString().replace('T', ' ').slice(0, 16)}</td>
                <td>{event.kind}</td>
                <td>
                  <button onClick={() => setDate(event.peak)}>Set instant →</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="footnote">
        Diagram distances and radii are independently exaggerated. Shadow detection uses physical
        Earth–Moon–Sun geometry with spherical bodies. The global solar eclipse list does not
        predict visibility from your location. No decorative alignment is presented as an eclipse
        prediction.
      </p>
    </>
  );
}
function PlanetDesigner() {
  const [mass, setMass] = useState(1),
    [radius, setRadius] = useState(1),
    [distance, setDistance] = useState(1),
    [albedo, setAlbedo] = useState(0.3),
    [water, setWater] = useState(0.7),
    [clouds, setClouds] = useState(0.4),
    [rings, setRings] = useState(false);
  const p = planetProperties(mass, radius, distance, albedo);
  return (
    <>
      <div className="experiment-layout">
        <section className="panel controls-panel">
          <div className="section-label">HYPOTHETICAL WORLD</div>
          <Range
            label="Planet mass"
            value={mass}
            min={0.1}
            max={20}
            step={0.1}
            unit="Earth masses"
            onChange={setMass}
          />
          <Range
            label="Planet radius"
            value={radius}
            min={0.2}
            max={4}
            step={0.05}
            unit="Earth radii"
            onChange={setRadius}
          />
          <Range
            label="Orbital distance"
            value={distance}
            min={0.1}
            max={5}
            step={0.05}
            unit="AU"
            onChange={setDistance}
          />
          <Range
            label="Bond albedo"
            value={albedo}
            min={0}
            max={0.9}
            step={0.01}
            onChange={setAlbedo}
          />
          <Range
            label="Visual water coverage"
            value={water}
            min={0}
            max={1}
            step={0.01}
            onChange={setWater}
          />
          <Range
            label="Visual cloud coverage"
            value={clouds}
            min={0}
            max={1}
            step={0.01}
            onChange={setClouds}
          />
          <Toggle
            label="Illustrative ring system"
            checked={rings}
            onChange={() => setRings(!rings)}
          />
          <button
            className="text-button"
            onClick={() =>
              downloadFile(
                'arnav-space-simulation-world.json',
                JSON.stringify(
                  {
                    model: 'Hypothetical spherical planet v1',
                    massEarth: mass,
                    radiusEarth: radius,
                    distanceAU: distance,
                    bondAlbedo: albedo,
                    visual: { water, clouds, rings },
                    derived: p,
                  },
                  null,
                  2,
                ),
              )
            }
          >
            Export this world →
          </button>
        </section>
        <section className="panel designer-stage">
          <div
            className="designed-world"
            style={{
              width: `${180 + radius * 30}px`,
              height: `${180 + radius * 30}px`,
              backgroundColor: `hsl(${water * 170 + 20} 40% 35%)`,
              backgroundImage: `linear-gradient(${20 + water * 120}deg,transparent ${water * 65}%,#b58b63aa),url(/textures/earth_daymap.jpg)`,
              filter: `saturate(${0.4 + water})`,
            }}
          >
            <div className="designed-clouds" style={{ opacity: clouds }} />
            {rings && <div className="designed-rings" />}
          </div>
          <span className="stage-caption">ARTISTIC SURFACE · DERIVED BULK PHYSICS</span>
        </section>
      </div>
      <div className="panel science-readouts">
        <Metric label="Surface gravity" value={p.gravity.toFixed(2)} unit="m/s²" />
        <Metric label="Mean density" value={p.density.toFixed(0)} unit="kg/m³" />
        <Metric label="Escape speed" value={p.escape.toFixed(2)} unit="km/s" />
        <Metric label="Equilibrium temperature" value={p.temperature.toFixed(1)} unit="K" />
      </div>
      <p className="footnote">
        Uniform spherical bulk model, solar luminosity, global heat redistribution, no greenhouse
        effect. Visual water/cloud/ring settings do not alter the climate calculation. Equilibrium
        temperature is not a prediction of habitability.
      </p>
    </>
  );
}
function KeplerLab() {
  const [e, setE] = useState(0.5),
    [phase, setPhase] = useState(0),
    [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => setPhase((v) => (v + 1) % 100), 50);
    return () => clearInterval(timer);
  }, [playing]);
  const pos = (fraction: number) => {
    const E = solveKepler(fraction * Math.PI * 2, e);
    return [300 + 180 * (Math.cos(E) - e), 190 - 110 * Math.sqrt(1 - e * e) * Math.sin(E)];
  };
  const p = pos(phase / 100),
    sectors = Array.from({ length: 8 }, (_, i) => {
      const points = Array.from({ length: 17 }, (_, k) => pos((i + k / 16) / 8));
      return `M300 190 ${points.map(([x, y]) => `L${x} ${y}`).join(' ')} Z`;
    });
  return (
    <>
      <div className="panel kepler-stage">
        <div className="section-label">EQUAL TIMES · EQUAL SWEPT AREAS</div>
        <svg viewBox="0 0 640 380" aria-label="Kepler equal-area orbital demonstration">
          {sectors.map((d, i) => (
            <path
              key={i}
              d={d}
              fill={i % 2 ? '#739fdb22' : '#9f87d322'}
              stroke="#536f96"
              strokeWidth=".5"
            />
          ))}
          <circle cx="300" cy="190" r="9" fill="#f1d09a" />
          <circle cx={p[0]} cy={p[1]} r="7" fill="#a8cafa" />
          <text x="300" y="345" textAnchor="middle">
            Eight equal time intervals. The orbiting body sweeps equal physical areas.
          </text>
        </svg>
        <Range
          label="Orbital eccentricity"
          value={e}
          min={0}
          max={0.85}
          step={0.01}
          onChange={setE}
        />
        <Range
          label="Mean anomaly progress"
          value={phase}
          min={0}
          max={100}
          unit="% of period"
          onChange={setPhase}
        />
        <button className="solid-button" onClick={() => setPlaying(!playing)}>
          {playing ? 'Pause orbit' : 'Animate orbit'}
        </button>
        <div className="stage-metrics">
          <Metric
            label="Area per eighth orbit (a=1 AU)"
            value={((Math.PI * Math.sqrt(1 - e * e)) / 8).toFixed(5)}
            unit="AU²"
          />
          <Metric
            label="Periapsis / apoapsis"
            value={`${(1 - e).toFixed(2)} / ${(1 + e).toFixed(2)}`}
            unit="AU"
          />
          <Metric label="Period (1 solar mass)" value="1.000" unit="yr" />
        </div>
      </div>
      <p className="footnote">
        Kepler equation solved for eccentric anomaly; equal mean-anomaly increments correspond to
        equal elapsed times. The SVG compresses the vertical scale for presentation.
      </p>
    </>
  );
}
function SensitivityLab() {
  const [delta, setDelta] = useState(0.001),
    [duration, setDuration] = useState(2);
  const data = useMemo(() => {
    const a = preset('three'),
      b = preset('three');
    b[0].p[0] += delta;
    const rows = [];
    for (let i = 0; i < 1600; i++) {
      step(a, duration / 1600, false);
      step(b, duration / 1600, false);
      if (i % 8 === 0)
        rows.push({
          time: ((i + 1) * duration) / 1600,
          a: a.map((v) => [...v.p]),
          b: b.map((v) => [...v.p]),
          divergence: Math.sqrt(
            a.reduce((s, v, k) => s + v.p.reduce((sum, x, j) => sum + (x - b[k].p[j]) ** 2, 0), 0) /
              a.length,
          ),
        });
    }
    return rows;
  }, [delta, duration]);
  return (
    <>
      <section className="panel controls-panel">
        <div className="section-label">PAIRED THREE-BODY EXPERIMENT</div>
        <Range
          label="Initial X perturbation"
          value={delta}
          min={0.0001}
          max={0.05}
          step={0.0001}
          unit="AU"
          onChange={setDelta}
        />
        <Range
          label="Experiment duration"
          value={duration}
          min={0.2}
          max={4}
          step={0.1}
          unit="yr"
          onChange={setDuration}
        />
      </section>
      <div className="analytics-grid">
        {(['a', 'b'] as const).map((key, index) => (
          <section className="panel comparison-orbit" key={key}>
            <div className="section-label">
              {index ? 'PERTURBED INITIAL STATE' : 'REFERENCE INITIAL STATE'}
            </div>
            <svg
              viewBox="0 0 440 350"
              aria-label={`${index ? 'Perturbed' : 'Reference'} integrated three-body trajectories`}
            >
              {[0, 1, 2].map((body, k) => (
                <polyline
                  key={body}
                  points={data
                    .map((v) => `${220 + v[key][body][0] * 110},${175 - v[key][body][1] * 110}`)
                    .join(' ')}
                  fill="none"
                  stroke={['#adc9f2', '#dfbe92', '#c2a5ea'][k]}
                  strokeWidth="1"
                />
              ))}
            </svg>
          </section>
        ))}
      </div>
      <section className="panel chart-panel">
        <Chart label="RMS trajectory separation (AU)" values={data.map((v) => v.divergence)} />
        <button
          className="text-button"
          onClick={() =>
            downloadFile(
              'arnav-space-simulation-comparison.csv',
              csv([['time_yr', 'RMS_divergence_AU'], ...data.map((v) => [v.time, v.divergence])]),
              'text/csv',
            )
          }
        >
          Export paired experiment →
        </button>
      </section>
      <p className="footnote">
        Both branches use the same fixed-step Newtonian solver. Separation includes physical
        sensitivity and numerical error; it is not a measured Lyapunov exponent. Extreme encounters
        need a smaller timestep.
      </p>
    </>
  );
}
function ValidationLab() {
  const rows = ephemerisValidationRows();
  return (
    <section className="panel table-panel">
      <div className="section-label">INDEPENDENT NASA/JPL HORIZONS REFERENCE SAMPLES</div>
      <p className="footnote">
        Measured position residuals against saved geometric J2000 reference vectors. These are
        sampled errors, not a bound across all dates. Planetary-center versus system-barycenter
        conventions contribute to outer-planet residuals.
      </p>
      <table>
        <thead>
          <tr>
            <th>BODY</th>
            <th>EPOCH</th>
            <th>ENGINE ERROR km</th>
            <th>ANGULAR ERROR ″</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td>{r.bodyId}</td>
              <td>{new Date(r.date).toISOString().slice(0, 10)}</td>
              <td>{r.engine.errorKm.toFixed(1)}</td>
              <td>{r.engine.angularArcseconds.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        className="text-button"
        onClick={() => downloadFile('ephemeris-validation.json', JSON.stringify(rows, null, 2))}
      >
        Download measured residuals →
      </button>
    </section>
  );
}
