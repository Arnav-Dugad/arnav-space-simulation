import { useEffect, useState } from 'react';
import { Metric, Range } from './UI';
import NumberField from './NumberField';
import Chart from './Chart';
import { AU_KM, MAX_DATE, MU_SUN, type Planet } from '../data/planets';
import { ephemerisPosition } from '../simulation/ephemeris';
import { hohmann, propellant } from '../simulation/orbital';
import { csv, downloadFile } from '../utils/export';
const wrap = (degrees: number) => ((((degrees + 180) % 360) + 360) % 360) - 180;
function phaseResidual(origin: Planet, target: Planet, date: number, phase: number) {
  const a = ephemerisPosition(origin.id, date),
    b = ephemerisPosition(target.id, date);
  return wrap(((Math.atan2(b[1], b[0]) - Math.atan2(a[1], a[0])) * 180) / Math.PI - phase);
}
function parkingBurn(planet: Planet, alt: number, vinf: number) {
  const mu = 6.6743e-20 * planet.mass,
    r = planet.radius + alt;
  return Math.sqrt(vinf * vinf + (2 * mu) / r) - Math.sqrt(mu / r);
}
function bielliptic(r1: number, r2: number, rb: number) {
  const a = (r1 + rb) / 2,
    b = (r2 + rb) / 2,
    mu = MU_SUN;
  return {
    total:
      Math.abs(Math.sqrt(mu * (2 / r1 - 1 / a)) - Math.sqrt(mu / r1)) +
      Math.abs(Math.sqrt(mu * (2 / rb - 1 / b)) - Math.sqrt(mu * (2 / rb - 1 / a))) +
      Math.abs(Math.sqrt(mu / r2) - Math.sqrt(mu * (2 / r2 - 1 / b))),
    days: (Math.PI * (Math.sqrt(a ** 3 / mu) + Math.sqrt(b ** 3 / mu))) / 86400,
  };
}
export default function MissionExtensions({
  origin,
  target,
  mass,
  isp,
}: {
  origin: Planet;
  target: Planet;
  mass: number;
  isp: number;
}) {
  const [parking, setParking] = useState(300),
    [arrival, setArrival] = useState(300),
    [date, setDate] = useState(() => new Date().toISOString().slice(0, 10)),
    [windowDate, setWindowDate] = useState<number | null>(null),
    [windowMessage, setWindowMessage] = useState(''),
    [burnFraction, setBurnFraction] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  useEffect(() => {
    setWindowDate(null);
    setWindowMessage('');
    setChoice(null);
  }, [origin.id, target.id]);
  const transfer = hohmann(origin.elements[0] * AU_KM, target.elements[0] * AU_KM),
    departureBurn = parkingBurn(origin, parking, transfer.departure),
    arrivalBurn = parkingBurn(target, arrival, transfer.arrival),
    full = departureBurn + arrivalBurn;
  const designs = [
    { name: 'Hohmann', ...transfer },
    ...[1.5, 2, 5].map((factor) => ({
      name: `Bi-elliptic (${factor}× outer radius)`,
      ...bielliptic(
        origin.elements[0] * AU_KM,
        target.elements[0] * AU_KM,
        Math.max(origin.elements[0], target.elements[0]) * factor * AU_KM,
      ),
    })),
  ];
  const search = () => {
    const start = Date.parse(date + 'T00:00:00Z');
    let previous = phaseResidual(origin, target, start, transfer.phase),
      found: number | null = null;
    const end = Math.min(MAX_DATE, start + 3652 * 86400000);
    for (let time = start + 86400000; time < end; time += 86400000) {
      const next = phaseResidual(origin, target, time, transfer.phase);
      if (previous * next <= 0 && Math.abs(previous - next) < 180) {
        let lo = time - 86400000,
          hi = time,
          sign = previous;
        for (let i = 0; i < 32; i++) {
          const mid = (lo + hi) / 2,
            value = phaseResidual(origin, target, mid, transfer.phase);
          if (sign * value <= 0) hi = mid;
          else {
            lo = mid;
            sign = value;
          }
        }
        found = (lo + hi) / 2;
        break;
      }
      previous = next;
    }
    setWindowDate(found);
    setWindowMessage(
      found
        ? `Next crossing of ideal departure phase: ${new Date(found).toISOString().slice(0, 16).replace('T', ' ')} UTC`
        : 'No ideal phase crossing found in the next ten years within the model date range.',
    );
  };
  return (
    <div className="mission-extensions">
      <section className="panel controls-panel">
        <div className="section-label">PATCHED-CONIC DEPARTURE & CAPTURE ESTIMATES</div>
        <div className="numeric-grid">
          <NumberField
            label="Departure parking altitude"
            value={parking}
            min={100}
            max={1e6}
            unit="km"
            onChange={setParking}
          />
          <NumberField
            label="Arrival parking altitude"
            value={arrival}
            min={100}
            max={1e6}
            unit="km"
            onChange={setArrival}
          />
        </div>
        <div className="science-readouts">
          <Metric
            label="Departure hyperbolic excess speed"
            value={transfer.departure.toFixed(3)}
            unit="km/s"
          />
          <Metric
            label="Departure parking orbit burn"
            value={departureBurn.toFixed(3)}
            unit="km/s"
          />
          <Metric label="Arrival capture burn" value={arrivalBurn.toFixed(3)} unit="km/s" />
          <Metric
            label="Parking-to-parking propellant"
            value={propellant(mass, full, isp).toExponential(4)}
            unit="kg"
          />
        </div>
        <p className="footnote">
          Circular heliocentric transfer patched to local two-body hyperbolas. Parking altitudes use
          equatorial reference radii. No surface launch, atmospheric entry, inclination change,
          finite burn, or planetary perturbation is included. Giant planets have no solid landing
          surface.
        </p>
        <Range
          label="Departure impulse preview"
          value={burnFraction}
          min={0}
          max={100}
          unit="% applied"
          onChange={setBurnFraction}
        />
        <Chart
          values={Array.from({ length: 51 }, (_, i) =>
            Math.sqrt(
              (Math.sqrt((6.6743e-20 * origin.mass) / (origin.radius + parking)) +
                (departureBurn * i) / 50) **
                2,
            ),
          )}
          label="Parking tangential speed across impulse (km/s)"
        />
        <p className="footnote">
          Preview speed:{' '}
          {(
            Math.sqrt((6.6743e-20 * origin.mass) / (origin.radius + parking)) +
            (departureBurn * burnFraction) / 100
          ).toFixed(3)}{' '}
          km/s. Impulse is an instantaneous idealization, not a finite-thrust burn.
        </p>
      </section>
      <section className="panel controls-panel">
        <div className="section-label">DEPARTURE GEOMETRY SEARCH</div>
        <label className="field">
          Search from UTC date
          <input
            aria-label="Mission departure date"
            type="date"
            min="1800-01-01"
            max="2049-12-30"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setWindowDate(null);
              setWindowMessage('');
            }}
          />
        </label>
        <button className="solid-button" onClick={search}>
          Find next ideal phase crossing
        </button>
        <p className="footnote" role="status">
          {windowMessage ||
            'Find when ephemeris longitudes next meet the ideal circular Hohmann phase geometry.'}
        </p>
        {windowDate && (
          <Metric
            label="Days until phase crossing"
            value={((windowDate - Date.parse(date + 'T00:00:00Z')) / 86400000).toFixed(2)}
            unit="days"
          />
        )}
        <p className="footnote">
          Uses actual calculated longitudes with a one-day bracket and numerical refinement. This is
          a phase-geometry opportunity, not a Lambert solution, launch approval, or mission-grade
          window.
        </p>
      </section>
      <section className="panel table-panel">
        <div className="section-label">TRANSFER TRADE STUDY · HELIOCENTRIC BURNS ONLY</div>
        <table>
          <thead>
            <tr>
              <th>STRATEGY</th>
              <th>TIME days</th>
              <th>Δv km/s</th>
              <th>IDEAL PROPELLANT kg</th>
            </tr>
          </thead>
          <tbody>
            {designs.map((d) => (
              <tr key={d.name}>
                <td>{d.name}</td>
                <td>{d.days.toFixed(1)}</td>
                <td>{d.total.toFixed(3)}</td>
                <td>{propellant(mass, d.total, isp).toExponential(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="transfer-challenge">
          <h3>Challenge: choose the lowest Δv in this comparison</h3>
          <div className="save-actions">
            {designs.map((d, i) => (
              <button key={d.name} onClick={() => setChoice(i)}>
                {d.name}
              </button>
            ))}
          </div>
          {choice !== null && (
            <p role="status" className="footnote">
              {designs[choice].total <= Math.min(...designs.map((d) => d.total)) + 1e-8
                ? 'Correct. This option has the lowest Δv among the displayed strategies. Compare the flight times before choosing a mission design.'
                : 'Another displayed strategy uses less Δv. Compare the total impulses, then try again.'}{' '}
              This is a comparison within the calculated set, not a proof of global optimality.
            </p>
          )}
        </div>
        <button
          className="text-button"
          onClick={() =>
            downloadFile(
              'arnav-space-simulation-transfer-trades.csv',
              csv([
                ['strategy', 'time_days', 'delta_v_km_s', 'propellant_kg'],
                ...designs.map((d) => [d.name, d.days, d.total, propellant(mass, d.total, isp)]),
              ]),
              'text/csv',
            )
          }
        >
          Export transfer comparison →
        </button>
      </section>
    </div>
  );
}
