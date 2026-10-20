import { useEffect, useMemo, useState } from 'react';
import { Satellite, Search, RefreshCw, Download, Database, Info } from 'lucide-react';
import { json2satrec, propagate, eciToGeodetic, gstime } from 'satellite.js';
import { Metric, Range } from '../components/UI';
import { downloadFile, csv } from '../utils/export';
type Row = Record<string, unknown>;
interface Catalog {
  metadata: {
    title: string;
    source: string;
    sourceUrl: string;
    documentationUrl: string;
    retrievedAt: string;
    epoch: string | null;
    attribution: string;
    license: string;
    notes: string[];
    recordCount: number;
  };
  records: Row[];
}
const collections = [
  {
    id: 'stations',
    title: 'Satellites',
    description: 'Orbit predictions. Ground tracks. A world in motion.',
  },
  { id: 'exoplanets', title: 'Exoplanets', description: 'Other stars. Other possibilities.' },
  {
    id: 'approaches',
    title: 'Asteroid approaches',
    description: 'Our changing neighborhood, measured.',
  },
  { id: 'bright-stars', title: 'Bright stars', description: 'Real stars behind the night sky.' },
];
const number = (value: unknown, digits = 3) =>
  value === null || value === undefined
    ? 'Unknown'
    : Number(value).toLocaleString(undefined, { maximumFractionDigits: digits });
function referenceLink(value: unknown) {
  if (typeof value !== 'string') return null;
  const match = value.match(/href\s*=\s*["']?([^\s"'>]+)/i);
  try {
    const url = new URL(match?.[1] ?? '', 'https://exoplanetarchive.ipac.caltech.edu');
    return url.protocol === 'https:' &&
      ['exoplanetarchive.ipac.caltech.edu', 'ui.adsabs.harvard.edu', 'doi.org'].includes(
        url.hostname,
      )
      ? url.href
      : null;
  } catch {
    return null;
  }
}
export default function CatalogExplorer() {
  const [collection, setCollection] = useState('stations'),
    [data, setData] = useState<Catalog | null>(null),
    [error, setError] = useState(''),
    [query, setQuery] = useState(''),
    [selected, setSelected] = useState(0),
    [maxRadius, setMaxRadius] = useState(30),
    [method, setMethod] = useState('all'),
    [reload, setReload] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    setData(null);
    setError('');
    setSelected(0);
    fetch(`/data/${collection}.json`, { signal: abort.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`Catalog unavailable (${r.status}).`);
        return r.json();
      })
      .then((value: Catalog) => {
        if (!Array.isArray(value.records) || !value.metadata?.retrievedAt)
          throw new Error('Catalog schema could not be verified.');
        setData(value);
      })
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e.message);
      });
    return () => abort.abort();
  }, [collection, reload]);
  const records = (data?.records ?? []).filter(
    (r) =>
      Object.values(r).some((v) =>
        String(v ?? '')
          .toLowerCase()
          .includes(query.toLowerCase()),
      ) &&
      (collection !== 'exoplanets' ||
        ((r.pl_rade === null || Number(r.pl_rade) <= maxRadius) &&
          (method === 'all' || r.discoverymethod === method))),
  );
  const r = records[selected] ?? records[0];
  const active = collections.find((c) => c.id === collection)!;
  return (
    <div className="lab-page catalog-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">THE OBSERVATION ARCHIVE</div>
          <h1>{active.title}.</h1>
          <p>{active.description}</p>
        </div>
        <span className="fidelity">
          <span />
          Attributed catalog snapshots
        </span>
      </div>
      <nav className="lab-tabs" aria-label="Data collections">
        {collections.map((c) => (
          <button
            key={c.id}
            className={c.id === collection ? 'active' : ''}
            onClick={() => {
              setCollection(c.id);
              setQuery('');
            }}
          >
            <Database size={14} />
            {c.title}
          </button>
        ))}
      </nav>
      <div className="catalog-search">
        <Search size={17} />
        <input
          aria-label="Search catalog"
          placeholder="Find a name, host, method, or constellation..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(0);
          }}
        />
        <span>{records.length} objects</span>
      </div>
      {error && (
        <div role="alert" className="callout">
          {error}
          <button onClick={() => setReload((v) => v + 1)}>Retry</button>
        </div>
      )}
      {!data && !error && <div className="loading">Loading attributed data…</div>}
      {data && (
        <>
          <div className="catalog-provenance panel">
            <div className="section-label">
              <Info size={14} /> DATA PROVENANCE
            </div>
            <p>{data.metadata.source}</p>
            <div className="provenance-grid">
              <span>
                Retrieved{' '}
                <strong>
                  {new Date(data.metadata.retrievedAt).toLocaleString('en-GB', { timeZone: 'UTC' })}{' '}
                  UTC
                </strong>
              </span>
              <span>
                Epoch <strong>{data.metadata.epoch ?? 'Per parameter / catalog reference'}</strong>
              </span>
              <span>
                Reuse <strong>{data.metadata.license}</strong>
              </span>
            </div>
            <details>
              <summary>Sources, uncertainty & limitations</summary>
              <p>{data.metadata.attribution}</p>
              {data.metadata.notes.map((n, i) => (
                <p key={i}>{n}</p>
              ))}
              <a href={data.metadata.documentationUrl} target="_blank" rel="noreferrer">
                Provider documentation ↗
              </a>
            </details>
          </div>
          {collection === 'exoplanets' && (
            <div className="catalog-filters panel">
              <Range
                label="Maximum measured / estimated radius"
                value={maxRadius}
                min={1}
                max={30}
                unit="Earth radii"
                onChange={setMaxRadius}
              />
              <label className="field">
                Discovery method
                <select value={method} onChange={(e) => setMethod(e.target.value)}>
                  <option value="all">All methods</option>
                  {[...new Set(data.records.map((r) => String(r.discoverymethod)))].map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </label>
            </div>
          )}
          <div className="catalog-layout">
            <div className="panel catalog-list">
              {records.map((row, i) => (
                <button
                  key={i}
                  className={r === row ? 'active' : ''}
                  onClick={() => setSelected(i)}
                >
                  <span>
                    {String(row.OBJECT_NAME ?? row.pl_name ?? row.fullname ?? row.name ?? row.des)}
                  </span>
                  <small>
                    {String(row.EPOCH ?? row.hostname ?? row.cd ?? row.constellation ?? '')}
                  </small>
                </button>
              ))}
              {!records.length && <p className="empty-state">No matching catalog objects.</p>}
            </div>
            <section className="panel catalog-detail">
              {r &&
                (collection === 'stations' ? (
                  <SatelliteDetail row={r} />
                ) : collection === 'exoplanets' ? (
                  <ExoplanetDetail row={r} />
                ) : collection === 'approaches' ? (
                  <>
                    <div className="section-label">
                      PREDICTED EARTH CLOSE APPROACH · NOT AN IMPACT FORECAST
                    </div>
                    <h2>{String(r.fullname ?? r.des)}</h2>
                    <div className="science-readouts">
                      <Metric label="Approach date (TDB)" value={String(r.cd)} />
                      <Metric
                        label="Nominal distance"
                        value={number(Number(r.dist) * 149597870.7, 0)}
                        unit="km"
                      />
                      <Metric
                        label="3σ distance bounds"
                        value={`${number(Number(r.dist_min) * 149597870.7, 0)} — ${number(Number(r.dist_max) * 149597870.7, 0)}`}
                        unit="km"
                      />
                      <Metric label="Relative speed" value={number(r.v_rel)} unit="km/s" />
                      <Metric label="Diameter" value={number(r.diameter)} unit="km" />
                      <Metric
                        label="3σ time uncertainty"
                        value={String(r.t_sigma_f ?? 'Unknown')}
                      />
                      <Metric label="Orbit solution ID" value={String(r.orbit_id)} />
                    </div>
                    <p className="footnote">
                      Calendar dates are TDB, not UTC. The range shows a statistical 3σ interval,
                      not absolute limits. An unknown diameter is left unknown. Predictions may
                      change with new observations.
                    </p>
                  </>
                ) : (
                  <StarDetail row={r} records={data.records} />
                ))}
            </section>
          </div>
          <div className="save-actions">
            <button
              onClick={() =>
                downloadFile(
                  `arnav-space-simulation-${collection}.json`,
                  JSON.stringify(
                    {
                      ...data,
                      metadata: {
                        ...data.metadata,
                        recordCount: records.length,
                        originalRecordCount: data.metadata.recordCount,
                      },
                      records,
                    },
                    null,
                    2,
                  ),
                )
              }
            >
              <Download size={14} />
              Export filtered data + provenance
            </button>
            <button onClick={() => setReload((v) => v + 1)}>
              <RefreshCw size={14} />
              Reload bundled snapshot
            </button>
          </div>
          <p className="footnote">
            The snapshot is bundled for dependable and offline use. Reloading does not imply
            fetching newer observations from the provider. Dataset refreshes are explicit release
            operations.
          </p>
        </>
      )}
    </div>
  );
}
function SatelliteDetail({ row }: { row: Row }) {
  const [offset, setOffset] = useState(0),
    [now, setNow] = useState(() => Date.now()),
    [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => setOffset((v) => (v >= 180 ? -180 : v + 1)), 1000);
    return () => clearInterval(timer);
  }, [playing]);
  const epoch = Date.parse(String(row.EPOCH).replace(/Z$/, '') + 'Z'),
    date = now + offset * 60000;
  const prediction = useMemo(() => {
    try {
      const sat = json2satrec(row as unknown as Parameters<typeof json2satrec>[0]);
      const state = propagate(sat, new Date(date));
      if (!state || !state.position) throw new Error('SGP4 propagation unavailable for this date.');
      const geo = eciToGeodetic(state.position, gstime(new Date(date)));
      const track = Array.from({ length: 181 }, (_, i) => {
        const t = new Date(date + (i - 90) * 60000),
          pv = propagate(sat, t);
        if (!pv?.position) return null;
        const g = eciToGeodetic(pv.position, gstime(t));
        return { lon: (g.longitude * 180) / Math.PI, lat: (g.latitude * 180) / Math.PI };
      }).filter((v): v is { lon: number; lat: number } => v !== null);
      return {
        altitude: geo.height,
        lon: (geo.longitude * 180) / Math.PI,
        lat: (geo.latitude * 180) / Math.PI,
        speed: Math.hypot(state.velocity.x, state.velocity.y, state.velocity.z),
        track,
        error: '',
      };
    } catch (e) {
      return {
        altitude: 0,
        lon: 0,
        lat: 0,
        speed: 0,
        track: [],
        error: e instanceof Error ? e.message : 'Propagation failed.',
      };
    }
  }, [row, date]);
  const path = prediction.track
    .map((p, i) => {
      const jump = i === 0 || Math.abs(p.lon - prediction.track[i - 1].lon) > 180;
      return `${jump ? 'M' : 'L'} ${((p.lon + 180) / 360) * 600} ${((90 - p.lat) / 180) * 300}`;
    })
    .join(' ');
  return (
    <>
      <div className="section-label">
        <Satellite size={15} /> SGP4 PROPAGATION · NOT LIVE TELEMETRY
      </div>
      <h2>{String(row.OBJECT_NAME)}</h2>
      <svg
        className="ground-track"
        viewBox="0 0 600 300"
        aria-label="Predicted satellite ground track"
      >
        <defs>
          <pattern id="mapgrid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M50 0 H0 V50" stroke="#7696c044" fill="none" />
          </pattern>
        </defs>
        <image href="/textures/earth_daymap.jpg" width="600" height="300" opacity=".35" />
        <rect width="600" height="300" fill="url(#mapgrid)" />
        <path d={path} fill="none" stroke="#b6d5ff" strokeWidth="2" />
        {!prediction.error && (
          <circle
            cx={((prediction.lon + 180) / 360) * 600}
            cy={((90 - prediction.lat) / 180) * 300}
            r="5"
            fill="#fff"
          />
        )}
      </svg>
      {prediction.error && <p role="alert">{prediction.error}</p>}
      <div className="stage-metrics">
        <Metric
          label="Altitude"
          value={prediction.error ? 'Unavailable' : prediction.altitude.toFixed(1)}
          unit="km"
        />
        <Metric
          label="Speed"
          value={prediction.error ? 'Unavailable' : prediction.speed.toFixed(3)}
          unit="km/s"
        />
        <Metric label="Inclination" value={number(row.INCLINATION)} unit="°" />
        <Metric label="Period" value={(1440 / Number(row.MEAN_MOTION)).toFixed(2)} unit="min" />
      </div>
      <Range
        label="Prediction time offset"
        value={offset}
        min={-180}
        max={180}
        unit="minutes"
        onChange={setOffset}
      />
      <div className="save-actions">
        <button onClick={() => setPlaying(!playing)}>
          {playing ? 'Pause prediction' : 'Animate prediction'}
        </button>
        <button
          onClick={() => {
            setNow(Date.now());
            setOffset(0);
          }}
        >
          Return to now
        </button>
        <button
          onClick={() =>
            downloadFile(
              'satellite-ground-track.csv',
              csv([
                ['longitude_deg', 'latitude_deg'],
                ...prediction.track.map((p) => [p.lon, p.lat]),
              ]),
              'text/csv',
            )
          }
        >
          Export ground track
        </button>
      </div>
      <p className="footnote">
        Element epoch: {String(row.EPOCH)} UTC. Prediction: {new Date(date).toISOString()}. Element
        age: {((date - epoch) / 86400000).toFixed(2)} days.{' '}
        {Math.abs(date - epoch) > 7 * 86400000
          ? 'These elements are stale; substantial prediction error is possible.'
          : ''}{' '}
        Mean elements and SGP4 produce predictions, not spacecraft telemetry.
      </p>
    </>
  );
}
function ExoplanetDetail({ row: r }: { row: Row }) {
  const field = (key: string, unit: string) => {
    const v = r[key];
    if (v === null) return 'Unknown';
    const up = r[key + 'err1'],
      down = r[key + 'err2'],
      lim = Number(r[key + 'lim'] ?? 0);
    return `${lim === 1 ? '< ' : lim === -1 ? '> ' : ''}${number(v, 5)} ${unit}${up !== null && up !== undefined ? ` (+${number(up, 5)} / ${number(down, 5)})` : ' · uncertainty unavailable'}`;
  };
  return (
    <>
      <div className="section-label">CATALOG PARAMETERS · APPEARANCE UNKNOWN</div>
      <h2>{String(r.pl_name)}</h2>
      <div
        className="exoplanet-art"
        aria-label="Clearly labelled artistic exoplanet illustration"
      />
      <p className="art-label">ARTISTIC ILLUSTRATION · NOT AN OBSERVED SURFACE</p>
      <div className="science-readouts">
        <Metric label="Host star" value={String(r.hostname)} />
        <Metric label="Radius" value={field('pl_rade', 'R⊕')} />
        <Metric
          label={`Mass (${String(r.pl_bmassprov ?? 'unspecified')})`}
          value={field('pl_bmasse', 'M⊕')}
        />
        <Metric label="Orbital period" value={field('pl_orbper', 'days')} />
        <Metric label="Equilibrium temperature" value={field('pl_eqt', 'K')} />
        <Metric
          label="Discovery method / year"
          value={`${String(r.discoverymethod)} / ${String(r.disc_year)}`}
        />
      </div>
      <div className="source-links">
        {['pl_rade', 'pl_bmasse', 'pl_orbper'].map((k) => {
          const link = referenceLink(r[k + '_reflink']);
          return (
            link && (
              <a key={k} href={link} target="_blank" rel="noreferrer">
                {k === 'pl_rade' ? 'Radius' : k === 'pl_bmasse' ? 'Mass' : 'Period'} reference ↗
              </a>
            )
          );
        })}
      </div>
      <p className="footnote">
        Composite parameters may come from different publications. Calculated radii are not
        necessarily measurements. Minimum mass, upper/lower limits, and unavailable uncertainties
        are explicitly identified.
      </p>
    </>
  );
}
function StarDetail({ row: r, records }: { row: Row; records: Row[] }) {
  return (
    <>
      <div className="section-label">CATALOG SKY · EQUATORIAL J2000</div>
      <h2>{String(r.name)}</h2>
      <svg
        viewBox="0 0 600 300"
        className="catalog-sky"
        aria-label="Real bright-star directions in an equirectangular sky map"
      >
        {records.map((s, i) => (
          <circle
            key={i}
            cx={((360 - Number(s.raDeg)) / 360) * 600}
            cy={((90 - Number(s.decDeg)) / 180) * 300}
            r={Math.max(0.5, 2.8 - Number(s.mag) * 0.45)}
            fill={s.id === r.id ? '#edce91' : '#b8cef0'}
            opacity={s.id === r.id ? 1 : 0.65}
          />
        ))}
        <circle
          cx={((360 - Number(r.raDeg)) / 360) * 600}
          cy={((90 - Number(r.decDeg)) / 180) * 300}
          r="8"
          fill="none"
          stroke="#e9c489"
        />
      </svg>
      <div className="stage-metrics">
        <Metric label="Right ascension" value={number(r.raDeg)} unit="°" />
        <Metric label="Declination" value={number(r.decDeg)} unit="°" />
        <Metric label="Apparent V magnitude" value={number(r.mag)} />
        <Metric label="Constellation" value={String(r.constellation)} />
      </div>
      <p className="footnote">
        RA increases toward the left. Catalog directions are J2000; proper motion and present-date
        precession are not applied. Brightness is the catalog magnitude, not live photometry. HYG
        data: David Nash / Astronexus, CC BY-SA 4.0.
      </p>
    </>
  );
}
