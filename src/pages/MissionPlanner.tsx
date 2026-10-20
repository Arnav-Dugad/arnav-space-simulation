import { useState } from 'react';
import { ArrowRight, ArrowUpRight, Rocket, Info } from 'lucide-react';
import { AU_KM, planets } from '../data/planets';
import { hohmann, propellant, solveKepler } from '../simulation/orbital';
import { Metric, Range } from '../components/UI';
export default function MissionPlanner() {
  const [departure, setDeparture] = useState('earth'),
    [destination, setDestination] = useState('mars');
  const [mass, setMass] = useState(1000),
    [isp, setIsp] = useState(450),
    [progress, setProgress] = useState(0);
  const origin = planets.find((p) => p.id === departure)!,
    target = planets.find((p) => p.id === destination)!;
  const transfer = hohmann(origin.elements[0] * AU_KM, target.elements[0] * AU_KM);
  const fuel = propellant(mass, transfer.total, isp);
  const outer = target.elements[0] >= origin.elements[0];
  const r1 = outer ? 92 : 180,
    r2 = outer ? 180 : 92,
    a = (r1 + r2) / 2,
    c = (r2 - r1) / 2;
  const mean = (progress / 100) * Math.PI;
  const eccentricity =
    Math.abs(target.elements[0] - origin.elements[0]) / (target.elements[0] + origin.elements[0]);
  const t = outer
    ? solveKepler(mean, eccentricity)
    : Math.PI - solveKepler(Math.PI - mean, eccentricity);
  const craftX = 260 + c + a * Math.cos(Math.PI + t),
    craftY = 230 - Math.sqrt(r1 * r2) * Math.sin(Math.PI + t);
  return (
    <div className="lab-page mission-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">MISSION DESIGN / 003</div>
          <h1>Go a little further.</h1>
          <p>Plot a journey between worlds. Let physics show you the way.</p>
        </div>
        <span className="fidelity">
          <span />
          Simplified physical model
        </span>
      </div>
      <div className="mission-layout">
        <section className="panel mission-controls">
          <div className="section-label">
            <Rocket size={16} /> FLIGHT PLAN
          </div>
          <h2>Your next destination</h2>
          <label className="field">
            Departure
            <select
              aria-label="Departure"
              value={departure}
              onChange={(e) => {
                setDeparture(e.target.value);
                if (e.target.value === destination) setDestination(departure);
                setProgress(0);
              }}
            >
              {planets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <div className="route-divider">
            <ArrowRight size={17} />
            <span>Heliocentric Hohmann transfer</span>
          </div>
          <label className="field">
            Arrival
            <select
              aria-label="Arrival"
              value={destination}
              onChange={(e) => {
                setDestination(e.target.value);
                setProgress(0);
              }}
            >
              {planets
                .filter((p) => p.id !== departure)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </label>
          <hr />
          <Range
            label="Dry spacecraft mass"
            value={mass}
            min={100}
            max={10000}
            step={100}
            unit="kg"
            onChange={setMass}
          />
          <Range
            label="Specific impulse"
            value={isp}
            min={250}
            max={3000}
            step={10}
            unit="s"
            onChange={setIsp}
          />
          <div className="callout">
            <Info size={16} />
            <p>
              Instantaneous burns, circular coplanar orbits. Launch, atmospheric effects, planetary
              capture, and actual launch windows are excluded.
            </p>
          </div>
        </section>
        <section className="panel trajectory-panel">
          <div className="section-label">
            TRANSFER TRAJECTORY <span>SCHEMATIC · DISTANCES COMPRESSED</span>
          </div>
          <svg
            className="trajectory"
            viewBox="0 0 580 470"
            role="img"
            aria-label={`Hohmann transfer from ${origin.name} to ${target.name}`}
          >
            <defs>
              <radialGradient id="sunGlow">
                <stop stopColor="#f9d393" />
                <stop offset="1" stopColor="#f9d393" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="260" cy="230" r="37" fill="url(#sunGlow)" />
            <circle cx="260" cy="230" r="9" fill="#f8d69c" />
            <circle cx="260" cy="230" r={r1} className="diagram-orbit" />
            <circle cx="260" cy="230" r={r2} className="diagram-orbit" />
            <path
              d={`M ${260 - r1} 230 A ${a} ${Math.sqrt(r1 * r2)} 0 0 0 ${260 + r2} 230`}
              fill="none"
              stroke="#a5c9f5"
              strokeWidth="2"
              strokeDasharray="5 6"
            />
            <circle cx={260 - r1} cy="230" r="7" fill={origin.color} />
            <circle cx={260 + r2} cy="230" r="9" fill={target.color} />
            <text x={260 - r1} y="263" textAnchor="middle">
              {origin.name}
            </text>
            <text x={260 + r2} y="263" textAnchor="middle">
              {target.name}
            </text>
            <g transform={`translate(${craftX} ${craftY})`}>
              <circle r="12" fill="#a5c9f5" opacity=".13" />
              <circle r="4" fill="#e5f0ff" />
            </g>
            <text x="260" y="440" textAnchor="middle" className="diagram-small">
              Two-body transfer ellipse · Sun at one focus
            </text>
          </svg>
          <div className="trajectory-scrub">
            <Range
              label="Explore transfer"
              value={progress}
              min={0}
              max={100}
              unit="%"
              onChange={setProgress}
            />
            <span>
              Day {((transfer.days * progress) / 100).toFixed(1)} of {transfer.days.toFixed(1)}
            </span>
          </div>
        </section>
      </div>
      <div className="mission-metrics panel">
        <Metric label="Departure Δv" value={transfer.departure.toFixed(2)} unit="km/s" />
        <Metric label="Arrival Δv" value={transfer.arrival.toFixed(2)} unit="km/s" />
        <Metric label="Transfer time" value={transfer.days.toFixed(0)} unit="days" />
        <Metric
          label="Required propellant"
          value={fuel > 1e9 ? fuel.toExponential(2) : Math.round(fuel).toLocaleString()}
          unit="kg"
        />
        <Metric label="Target phase angle" value={transfer.phase.toFixed(1)} unit="°" />
      </div>
      <p className="footnote">
        <ArrowUpRight size={13} /> Propellant follows the ideal Tsiolkovsky equation for both
        heliocentric burns. Phase angle is measured prograde from departure to destination. This is
        an educational estimate, not a mission-grade design.
      </p>
    </div>
  );
}
