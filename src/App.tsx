import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import {
  Orbit,
  Telescope,
  Atom,
  Rocket,
  ArrowLeftRight,
  Search,
  Settings2,
  Maximize,
  Minimize,
  ArrowUpRight,
  ChevronRight,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Heart,
  X,
  SlidersHorizontal,
  Layers3,
  CircleHelp,
  Globe2,
  Focus,
  Compass,
  Check,
  ArrowRight,
  FlaskConical,
  Database,
} from 'lucide-react';
import { planets, AU_KM, DAY_MS, MIN_DATE, MAX_DATE } from './data/planets';
import { elementsAt } from './simulation/orbital';
import { Modal, Metric, Toggle } from './components/UI';
import DockPanel from './components/DockPanel';
import ExplorerTools from './components/ExplorerTools';
import { ephemerisPosition } from './simulation/ephemeris';
import { savedExperiments } from './utils/experiments';
import { shareConfiguration } from './utils/export';
import type { SceneSettings } from './scenes/SolarScene';
const SolarScene = lazy(() => import('./scenes/SolarScene'));
const GravityLab = lazy(() => import('./pages/GravityLab'));
const MissionPlanner = lazy(() => import('./pages/MissionPlanner'));
const Compare = lazy(() => import('./pages/Compare'));
const ScienceLabs = lazy(() => import('./pages/ScienceLabs'));
const CatalogExplorer = lazy(() => import('./pages/CatalogExplorer'));
type Page = 'explore' | 'gravity' | 'missions' | 'compare' | 'labs' | 'catalog';
const navigation = [
  { id: 'explore' as const, label: 'Solar System', icon: Telescope, caption: 'Explore' },
  { id: 'gravity' as const, label: 'Gravity Sandbox', icon: Atom, caption: 'Experiment' },
  { id: 'missions' as const, label: 'Mission Planner', icon: Rocket, caption: 'Discover' },
  { id: 'compare' as const, label: 'Compare Worlds', icon: ArrowLeftRight, caption: 'Perspective' },
  { id: 'labs' as const, label: 'Science Labs', icon: FlaskConical, caption: 'Investigate' },
  { id: 'catalog' as const, label: 'Data Explorer', icon: Database, caption: 'Observe' },
];
function stored<T>(key: string, fallback: T): T {
  try {
    const value =
      localStorage.getItem(key) ??
      localStorage.getItem(key.replace('arnav-space-simulation', 'orbitarium'));
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}
function initialPage(): Page {
  const p = location.hash.slice(1).split('/')[0];
  return navigation.some((n) => n.id === p) ? (p as Page) : 'explore';
}
const defaultSettings: SceneSettings = {
  orbits: true,
  labels: true,
  trueScale: false,
  quality: 'high',
  reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
};
const speeds = [
  { label: 'Real time', value: 1 / 86400 },
  { label: '1 day / sec', value: 1 },
  { label: '10 days / sec', value: 10 },
  { label: '1 month / sec', value: 30 },
  { label: '1 year / sec', value: 365.25 },
];
export default function App() {
  const [page, setPage] = useState<Page>(initialPage);
  const [routeHash, setRouteHash] = useState(() => location.hash);
  const [selected, setSelected] = useState(() =>
    planets.some((p) => p.id === location.hash.split('/')[1])
      ? location.hash.split('/')[1]
      : 'earth',
  );
  const [date, setDate] = useState(() => Date.now()),
    [playing, setPlaying] = useState(false),
    [speed, setSpeed] = useState(1),
    [reverse, setReverse] = useState(false);
  const [settings, setSettings] = useState<SceneSettings>(() => ({
    ...defaultSettings,
    ...stored('arnav-space-simulation-settings', {}),
  }));
  const [cameraMode, setCameraMode] = useState('follow'),
    [cameraKey, setCameraKey] = useState(0);
  const [modal, setModal] = useState<'search' | 'settings' | 'credits' | 'favorites' | null>(null),
    [query, setQuery] = useState(''),
    [favorites, setFavorites] = useState<string[]>(() =>
      stored('arnav-space-simulation-favorites', []),
    ),
    [toast, setToast] = useState(''),
    [tour, setTour] = useState(false),
    [fullscreen, setFullscreen] = useState(false),
    [tab, setTab] = useState('overview');
  const notify = useCallback((text: string) => setToast(text), []);
  useEffect(() => {
    const focus = () => setCameraMode('follow');
    addEventListener('ass:focus-moon', focus);
    return () => removeEventListener('ass:focus-moon', focus);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  const navigate = useCallback((next: Page) => {
    setPage(next);
    setModal(null);
    location.hash = next;
  }, []);
  const selectPlanet = useCallback((id: string) => {
    setSelected(id);
    setPage('explore');
    setCameraMode('follow');
    setCameraKey((k) => k + 1);
    setModal(null);
    location.hash = `explore/${id}`;
  }, []);
  useEffect(() => {
    const onHash = () => {
      setRouteHash(location.hash);
      setPage(initialPage());
      const id = location.hash.split('/')[1];
      if (planets.some((p) => p.id === id)) setSelected(id);
    };
    addEventListener('hashchange', onHash);
    return () => removeEventListener('hashchange', onHash);
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem('arnav-space-simulation-settings', JSON.stringify(settings));
    } catch {
      /* Session-only settings remain usable. */
    }
  }, [settings]);
  useEffect(() => {
    try {
      localStorage.setItem('arnav-space-simulation-favorites', JSON.stringify(favorites));
    } catch {
      /* Favorites remain in memory. */
    }
  }, [favorites]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setQuery('');
        setModal((m) => (m === 'search' ? null : 'search'));
      }
      if (
        e.code === 'Space' &&
        page === 'explore' &&
        !modal &&
        !['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes((e.target as HTMLElement).tagName)
      ) {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [page, modal]);
  useEffect(() => {
    if (!playing || page !== 'explore') return;
    let previous = performance.now();
    const timer = setInterval(() => {
      const now = performance.now(),
        elapsed = (now - previous) / 1000;
      previous = now;
      setDate((d) => {
        const next = d + elapsed * speeds[speed].value * DAY_MS * (reverse ? -1 : 1);
        if (next < MIN_DATE || next > MAX_DATE) {
          setPlaying(false);
          return Math.max(MIN_DATE, Math.min(MAX_DATE, next));
        }
        return next;
      });
    }, 50);
    return () => clearInterval(timer);
  }, [playing, page, speed, reverse]);
  useEffect(() => {
    const change = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', change);
    return () => document.removeEventListener('fullscreenchange', change);
  }, []);
  const planet = planets.find((p) => p.id === selected)!;
  const position = ephemerisPosition(planet.id, date);
  const distance = Math.hypot(...position);
  const before = ephemerisPosition(planet.id, date - 30000),
    after = ephemerisPosition(planet.id, date + 30000);
  const velocity = Math.hypot(...after.map((v, i) => ((v - before[i]) * AU_KM) / 60));
  const patch = (patch: Partial<SceneSettings>) =>
    setSettings((s) => ({
      ...s,
      ...patch,
      bodyScale:
        patch.trueScale === false && s.bodyScale === 'physical'
          ? 'educational'
          : (patch.bodyScale ?? s.bodyScale),
      trueScale: patch.bodyScale === 'physical' ? true : (patch.trueScale ?? s.trueScale),
    }));
  const match = (name: string) => {
    const q = query.toLowerCase().replace(/[^a-z0-9]/g, '');
    let index = 0;
    for (const c of name.toLowerCase().replace(/[^a-z0-9]/g, '')) if (c === q[index]) index++;
    return index === q.length;
  };
  const formatDate = (timestamp: number) =>
    new Date(timestamp).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
  return (
    <div className={`app ${settings.reducedMotion ? 'reduced-motion' : ''}`}>
      <aside className="sidebar">
        <a className="wordmark" href="#explore" onClick={() => navigate('explore')}>
          <Orbit size={29} strokeWidth={1.35} />
          <span>
            Arnav<span className="brand-subtitle">SPACE SIMULATION</span>
          </span>
        </a>
        <div className="sidebar-section-label">YOUR OBSERVATORY</div>
        <nav aria-label="Main navigation">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${page === id ? 'active' : ''}`}
              onClick={() => navigate(id)}
            >
              <Icon size={18} strokeWidth={1.5} />
              <span>{label}</span>
              {page === id && <span className="nav-active-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-divider" />
        <div className="sidebar-section-label objects-title">
          OUR SOLAR SYSTEM <span>08</span>
        </div>
        <div className="object-list">
          {planets.map((p, i) => (
            <button
              key={p.id}
              onClick={() => {
                selectPlanet(p.id);
                setTour(false);
              }}
              className={`object-item ${selected === p.id && page === 'explore' ? 'selected' : ''}`}
            >
              <span className="object-number">0{i + 1}</span>
              <span
                className="mini-planet"
                style={{
                  backgroundImage: `url(/textures/${p.id === 'earth' ? 'earth_daymap' : p.id === 'venus' ? 'venus_atmosphere' : p.id}.jpg)`,
                }}
              />
              <span>{p.name}</span>
              {favorites.includes(p.id) && <Heart size={10} fill="currentColor" />}
              {p.id === 'earth' && <small>HOME</small>}
            </button>
          ))}
        </div>
        <button
          className="journey-card"
          onClick={() => {
            setTour(true);
            selectPlanet('mercury');
            setPlaying(false);
          }}
        >
          <div className="journey-icon">
            <Compass size={20} />
            <ArrowUpRight size={15} />
          </div>
          <strong>A new perspective</strong>
          <span>Take a tour of eight worlds.</span>
          <div className="journey-link">
            Begin your journey <ArrowRight size={13} />
          </div>
        </button>
        <div className="sidebar-bottom">
          <span>
            <i /> BROWSER OBSERVATORY
          </span>
          <button onClick={() => setModal('credits')}>
            <CircleHelp size={14} /> About & data credits
          </button>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <div className="breadcrumb">
            <span>{navigation.find((n) => n.id === page)!.caption}</span>
            <ChevronRight size={13} />
            <strong>{navigation.find((n) => n.id === page)!.label}</strong>
          </div>
          <div className="topbar-actions">
            <button
              className="search-trigger"
              onClick={() => {
                setQuery('');
                setModal('search');
              }}
            >
              <Search size={15} />
              <span>Find a world...</span>
              <kbd>⌘ K</kbd>
            </button>
            <button
              className="icon-button"
              aria-label="Favorites"
              onClick={() => setModal('favorites')}
            >
              <Heart size={17} />
            </button>
            <button
              className="icon-button"
              aria-label="Settings"
              onClick={() => setModal('settings')}
            >
              <Settings2 size={17} />
            </button>
            <span className="toolbar-divider" />
            <button
              className="icon-button fullscreen-button"
              aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              onClick={async () => {
                try {
                  if (document.fullscreenElement) await document.exitFullscreen();
                  else await document.documentElement.requestFullscreen();
                } catch {
                  notify('Fullscreen is unavailable in this browser.');
                }
              }}
            >
              {fullscreen ? <Minimize size={17} /> : <Maximize size={17} />}
            </button>
          </div>
        </header>
        <nav className="mobile-navigation" aria-label="Mobile navigation">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              aria-label={label}
              key={id}
              className={page === id ? 'active' : ''}
              onClick={() => navigate(id)}
            >
              <Icon size={18} />
              <span>{label.split(' ')[0]}</span>
            </button>
          ))}
        </nav>
        <Suspense
          fallback={
            <div className="loading">
              <Orbit size={25} /> Opening your observatory...
            </div>
          }
        >
          {page === 'explore' ? (
            <div className="explorer">
              <SolarScene
                date={date}
                selected={selected}
                settings={settings}
                cameraMode={cameraMode}
                cameraKey={cameraKey}
                onSelect={(id) => {
                  selectPlanet(id);
                  setTour(false);
                }}
              />
              <div className="hero-copy">
                <div className="eyebrow">
                  <span /> A FRONT-ROW SEAT TO INFINITY
                </div>
                <h1>
                  Our cosmic
                  <br />
                  <span>neighborhood.</span>
                </h1>
                <p>
                  Eight extraordinary worlds.
                  <br />
                  One remarkable place to call home.
                </p>
                <button
                  onClick={() => {
                    setCameraMode('overview');
                    setCameraKey((k) => k + 1);
                  }}
                  className="hero-action"
                >
                  Explore the whole system <ArrowUpRight size={15} />
                </button>
              </div>
              <div className="scene-status">
                <span className="fidelity">
                  <span />
                  {playing ? 'Time accelerated' : 'Time paused'}
                </span>
                <span className="scene-coordinate">
                  {settings.frame === 'body'
                    ? 'BODY CENTERED'
                    : settings.frame === 'barycentric'
                      ? 'APPROX. BARYCENTRIC'
                      : 'HELIOCENTRIC'}{' '}
                  · J2000
                </span>
              </div>
              <DockPanel>
                <div className="inspector-top">
                  <span>PLANETARY PROFILE</span>
                  <button
                    className={`icon-button ${favorites.includes(selected) ? 'favorited' : ''}`}
                    aria-label={favorites.includes(selected) ? 'Remove favorite' : 'Add favorite'}
                    onClick={() =>
                      setFavorites((f) =>
                        f.includes(selected) ? f.filter((x) => x !== selected) : [...f, selected],
                      )
                    }
                  >
                    <Heart
                      size={17}
                      fill={favorites.includes(selected) ? 'currentColor' : 'none'}
                    />
                  </button>
                </div>
                <div className="planet-type">
                  <i style={{ background: planet.color }} />
                  {planet.kind}
                  <span>0{planets.indexOf(planet) + 1}</span>
                </div>
                <h2>
                  {planet.name}
                  <span>.</span>
                </h2>
                <p className="planet-description">{planet.description}</p>
                <div className="inspector-tabs">
                  <button
                    className={tab === 'overview' ? 'active' : ''}
                    onClick={() => setTab('overview')}
                  >
                    Overview
                  </button>
                  <button
                    className={tab === 'details' ? 'active' : ''}
                    onClick={() => setTab('details')}
                  >
                    In detail
                  </button>
                </div>
                {tab === 'overview' ? (
                  <>
                    <div className="inspector-metrics">
                      <Metric
                        label="Equatorial radius"
                        value={planet.radius.toLocaleString()}
                        unit="km"
                      />
                      <Metric
                        label="Orbital period"
                        value={planet.period.toLocaleString()}
                        unit="days"
                      />
                      <Metric label="Surface gravity" value={planet.gravity} unit="m/s²" />
                      <Metric label="Mean temperature" value={planet.temperature} unit="°C" />
                    </div>
                    <div className="distance-readout">
                      <div>
                        <span>DISTANCE FROM SUN</span>
                        <strong>
                          {distance.toFixed(3)} <small>AU</small>
                        </strong>
                      </div>
                      <svg width="76" height="40" viewBox="0 0 76 40" aria-hidden="true">
                        <ellipse
                          cx="37"
                          cy="20"
                          rx="33"
                          ry="12"
                          fill="none"
                          stroke="#3b4f69"
                          transform="rotate(-20 37 20)"
                        />
                        <circle cx="32" cy="22" r="4" fill="#e9cb92" />
                        <circle cx="63" cy="9" r="3" fill={planet.color} />
                      </svg>
                    </div>
                    <div className="velocity-readout">
                      <span>Orbital speed</span>
                      <strong>{velocity.toFixed(2)} km/s</strong>
                    </div>
                  </>
                ) : (
                  <div className="detail-list">
                    {[
                      ['Mass', `${planet.mass.toExponential(3)} kg`],
                      ['Rotation', `${planet.rotation} hours`],
                      ['Axial tilt', `${planet.tilt}°`],
                      ['Eccentricity', elementsAt(planet, date)[1].toFixed(5)],
                      ['Escape speed', `${planet.escape} km/s`],
                      ['Atmosphere', planet.atmosphere],
                      ['Major moons', planet.moons],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <span>{k}</span>
                        <strong>{v}</strong>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  className="inspector-action"
                  onClick={() => {
                    setCameraMode('follow');
                    setCameraKey((k) => k + 1);
                  }}
                >
                  <Focus size={15} /> Focus on {planet.name}
                  <ArrowUpRight size={14} />
                </button>
                <span className="source-note">NASA / NSSDC · Astronomy Engine ephemeris</span>
              </DockPanel>
              <ExplorerTools
                date={date}
                selected={selected}
                settings={settings}
                patch={patch}
                notify={notify}
                restore={(workspace) => {
                  setSelected(workspace.selected);
                  setDate(workspace.date);
                  setSettings(workspace.settings);
                  setPlaying(false);
                  setCameraMode('follow');
                  setCameraKey((k) => k + 1);
                  setTimeout(() => {
                    if (workspace.camera)
                      dispatchEvent(
                        new CustomEvent('ass:restore-camera', { detail: workspace.camera }),
                      );
                  }, 400);
                  notify('Workspace restored.');
                }}
              />
              {tour && (
                <div className="tour-card panel">
                  <progress
                    aria-label="Journey progress"
                    max={8}
                    value={planets.indexOf(planet) + 1}
                  />
                  <button className="text-button" onClick={() => selectPlanet('mercury')}>
                    Restart journey ↺
                  </button>
                  <div>
                    <span>THE EIGHT WORLDS · {planets.indexOf(planet) + 1} / 8</span>
                    <button
                      className="icon-button"
                      aria-label="End tour"
                      onClick={() => setTour(false)}
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <strong>
                    {planet.name}: {planet.kind.toLowerCase()}
                  </strong>
                  <p>
                    {planet.id === 'earth'
                      ? 'Our Moon follows its calculated geometric orbit. Display sizes and distances may be exaggerated.'
                      : `A year here lasts ${planet.period.toLocaleString()} Earth days. Try orbiting the camera to see another side.`}
                  </p>
                  <button
                    onClick={() => {
                      if (selected === 'neptune') {
                        setTour(false);
                        selectPlanet('earth');
                      } else selectPlanet(planets[planets.indexOf(planet) + 1].id);
                    }}
                  >
                    {selected === 'neptune' ? 'Return home' : 'Next world'}
                    <ArrowRight size={14} />
                  </button>
                </div>
              )}
              <div className="view-controls">
                <div className="view-button-group">
                  <button
                    className={cameraMode === 'overview' ? 'active' : ''}
                    onClick={() => {
                      setCameraMode('overview');
                      setCameraKey((k) => k + 1);
                    }}
                  >
                    <Globe2 size={14} />
                    <span>System</span>
                  </button>
                  <button
                    className={cameraMode === 'follow' ? 'active' : ''}
                    onClick={() => {
                      setCameraMode('follow');
                      setCameraKey((k) => k + 1);
                    }}
                  >
                    <Focus size={14} />
                    <span>Focus</span>
                  </button>
                  <button
                    className={cameraMode === 'top' ? 'active' : ''}
                    onClick={() => {
                      setCameraMode('top');
                      setCameraKey((k) => k + 1);
                    }}
                  >
                    <Layers3 size={14} />
                    <span>Top</span>
                  </button>
                </div>
                <div className="scene-toggles">
                  <button
                    className={settings.orbits ? 'active' : ''}
                    aria-label="Orbits"
                    aria-pressed={settings.orbits}
                    onClick={() => patch({ orbits: !settings.orbits })}
                  >
                    <Orbit size={14} /> Orbits
                  </button>
                  <button
                    className={settings.labels ? 'active' : ''}
                    aria-label="Labels"
                    aria-pressed={settings.labels}
                    onClick={() => patch({ labels: !settings.labels })}
                  >
                    Aa <span>Labels</span>
                  </button>
                </div>
              </div>
              <div className="timeline panel">
                <div className="timeline-date">
                  <span>SIMULATION DATE · UTC</span>
                  <label>
                    <input
                      aria-label="Simulation date"
                      type="date"
                      min="1800-01-01"
                      max="2050-01-01"
                      value={new Date(date).toISOString().slice(0, 10)}
                      onChange={(e) => {
                        const d = Date.parse(e.target.value + 'T12:00:00Z');
                        if (Number.isFinite(d)) {
                          setDate(Math.max(MIN_DATE, Math.min(MAX_DATE, d)));
                          setPlaying(false);
                        }
                      }}
                    />
                  </label>
                </div>
                <div className="time-playback">
                  <button
                    className="icon-button"
                    aria-label="Step backward one day"
                    onClick={() => {
                      setDate((d) => Math.max(MIN_DATE, d - DAY_MS));
                      setPlaying(false);
                    }}
                  >
                    <SkipBack size={15} />
                  </button>
                  <button
                    className="play-button"
                    aria-label={playing ? 'Pause time' : 'Play time'}
                    onClick={() => setPlaying(!playing)}
                  >
                    {playing ? (
                      <Pause size={17} fill="currentColor" />
                    ) : (
                      <Play size={17} fill="currentColor" />
                    )}
                  </button>
                  <button
                    className="icon-button"
                    aria-label="Step forward one day"
                    onClick={() => {
                      setDate((d) => Math.min(MAX_DATE, d + DAY_MS));
                      setPlaying(false);
                    }}
                  >
                    <SkipForward size={15} />
                  </button>
                </div>
                <div className="time-speed">
                  <button
                    className={`icon-button ${reverse ? 'active' : ''}`}
                    aria-label="Reverse time"
                    aria-pressed={reverse}
                    onClick={() => setReverse(!reverse)}
                  >
                    <RotateCcw size={14} />
                  </button>
                  <select
                    aria-label="Time speed"
                    value={speed}
                    onChange={(e) => setSpeed(Number(e.target.value))}
                  >
                    {speeds.map((s, i) => (
                      <option value={i} key={s.label}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  className="now-button"
                  onClick={() => {
                    setDate(Date.now());
                    setPlaying(false);
                  }}
                >
                  Now <RotateCcw size={12} />
                </button>
              </div>
              <div className="scene-footer">
                <span>
                  <i />{' '}
                  {settings.bodyScale === 'physical'
                    ? 'Physical radii · proportional distances'
                    : settings.trueScale
                      ? 'Proportional distances · exaggerated body sizes'
                      : 'Compressed distances · exaggerated body sizes'}
                </span>
                <button onClick={() => setModal('credits')}>
                  Model & sources <ArrowUpRight size={12} />
                </button>
                <span className="interaction-hint">
                  DRAG TO ORBIT <b>·</b> SCROLL TO ZOOM
                </span>
              </div>
            </div>
          ) : page === 'gravity' ? (
            <GravityLab key={routeHash} notify={notify} />
          ) : page === 'missions' ? (
            <MissionPlanner />
          ) : page === 'labs' ? (
            <ScienceLabs />
          ) : page === 'catalog' ? (
            <CatalogExplorer />
          ) : (
            <Compare />
          )}
        </Suspense>
      </main>
      {modal === 'search' && (
        <Modal title="Find your next discovery" onClose={() => setModal(null)}>
          <div className="command-input">
            <Search size={20} />
            <input
              autoFocus
              placeholder="Search worlds and experiments..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="search-results">
            {savedExperiments()
              .filter((v) => match(v.name))
              .map((v) => (
                <button
                  key={v.id}
                  onClick={() => {
                    try {
                      location.hash = `gravity/shared/${shareConfiguration({ version: 2, bodies: v.bodies })}`;
                      setModal(null);
                    } catch (error) {
                      notify(
                        error instanceof Error
                          ? error.message
                          : 'Export JSON to open this large experiment.',
                      );
                    }
                  }}
                >
                  <Atom size={17} />
                  <span>
                    {v.name}
                    <small>Saved experiment · {v.bodies.length} bodies</small>
                  </span>
                  <ArrowUpRight size={14} />
                </button>
              ))}
            {[
              ['Rocket ascent', 'rocket'],
              ['Black holes and time dilation', 'blackhole'],
              ['Eclipses and lunar phases', 'eclipse'],
              ['Planet designer and equilibrium temperature', 'designer'],
              ['Kepler equal-area laws', 'kepler'],
              ['Compare experiment sensitivity', 'sensitivity'],
              ['Ephemeris accuracy and sources', 'validation'],
            ]
              .filter(([name]) => match(name))
              .map(([name, id]) => (
                <button
                  key={id}
                  onClick={() => {
                    navigate('labs');
                    location.hash = `labs/${id}`;
                  }}
                >
                  <FlaskConical size={17} />
                  <span>{name}</span>
                  <ArrowUpRight size={14} />
                </button>
              ))}
            {stored<{ name: string; selected: string; date: number; settings: SceneSettings }[]>(
              'ass-workspaces',
              [],
            )
              .filter((w) => match(w.name))
              .map((w, i) => (
                <button
                  key={`workspace-${i}`}
                  onClick={() => {
                    setDate(w.date);
                    setSettings(w.settings);
                    selectPlanet(w.selected);
                  }}
                >
                  <Compass size={17} />
                  <span>
                    {w.name}
                    <small>Saved workspace</small>
                  </span>
                  <ArrowUpRight size={14} />
                </button>
              ))}
            {navigation
              .filter((n) => match(n.label))
              .map((n) => (
                <button key={n.id} onClick={() => navigate(n.id)}>
                  <n.icon size={18} />
                  <span>{n.label}</span>
                  <ArrowUpRight size={14} />
                </button>
              ))}
            {planets
              .filter((p) => match(p.name))
              .map((p) => (
                <button key={p.id} onClick={() => selectPlanet(p.id)}>
                  <span className="color-dot" style={{ background: p.color }} />
                  <span>
                    {p.name}
                    <small>{p.kind}</small>
                  </span>
                  <ArrowUpRight size={14} />
                </button>
              ))}
            {!navigation.some((n) => match(n.label)) && !planets.some((p) => match(p.name)) && (
              <p className="empty-state">No match. Try a planet name or “gravity”.</p>
            )}
          </div>
          <div className="modal-footer">Press Escape to close · Tab to navigate</div>
        </Modal>
      )}
      {modal === 'settings' && (
        <Modal title="Your observatory, your way" onClose={() => setModal(null)}>
          <div className="settings-body">
            <div className="section-label">
              <SlidersHorizontal size={15} /> SCENE SETTINGS
            </div>
            <label className="field">
              Graphics quality
              <select
                value={settings.quality}
                onChange={(e) => patch({ quality: e.target.value as 'high' | 'low' })}
              >
                <option value="high">High · detailed spheres & starfield</option>
                <option value="low">Performance · fewer stars & pixels</option>
              </select>
            </label>
            <Toggle
              label="Show orbital paths"
              checked={settings.orbits}
              onChange={() => patch({ orbits: !settings.orbits })}
            />
            <Toggle
              label="Show planet labels"
              checked={settings.labels}
              onChange={() => patch({ labels: !settings.labels })}
            />
            <Toggle
              label="Proportional orbital distances"
              checked={settings.trueScale}
              onChange={() => {
                patch({ trueScale: !settings.trueScale });
                setCameraMode('overview');
                setCameraKey((k) => k + 1);
              }}
            />
            <p className="footnote">
              In proportional mode, 1 AU = 10 scene units. Physical body radii are available in
              Observatory instruments. Switch to Focus to inspect small worlds.
            </p>
            <Toggle
              label="Reduce interface & camera motion"
              checked={settings.reducedMotion}
              onChange={() => patch({ reducedMotion: !settings.reducedMotion })}
            />
            <button
              className="text-button"
              onClick={() => {
                setSettings(defaultSettings);
                notify('Default settings restored.');
              }}
            >
              Restore defaults <RotateCcw size={14} />
            </button>
          </div>
        </Modal>
      )}
      {modal === 'favorites' && (
        <Modal title="Your favorite worlds" onClose={() => setModal(null)}>
          <div className="search-results">
            {favorites.length ? (
              favorites.map((id) => {
                const p = planets.find((p) => p.id === id);
                return (
                  p && (
                    <button key={id} onClick={() => selectPlanet(id)}>
                      <Heart size={16} />
                      <span>{p.name}</span>
                      <ChevronRight size={15} />
                    </button>
                  )
                );
              })
            ) : (
              <p className="empty-state">
                A whole universe to fall for.
                <br />
                Use the heart in a planet’s profile to save it here.
              </p>
            )}
          </div>
        </Modal>
      )}
      {modal === 'credits' && (
        <Modal title="Built for curiosity. Grounded in science." onClose={() => setModal(null)}>
          <div className="credits-body">
            <div className="credits-mark">
              <Orbit size={36} />
              <div>
                Arnav Space Simulation<small>The Universe Is Yours to Explore.</small>
              </div>
            </div>
            <h3>A personal, browser-based observatory</h3>
            <p>
              Explore eight planets, experiment with Newtonian gravity, compare worlds, and
              calculate idealized interplanetary transfers. No account or paid API is required.
            </p>
            <h3>Models & limitations</h3>
            <p>
              Planet and moon positions use{' '}
              <a href="https://github.com/cosinekitty/astronomy" target="_blank" rel="noreferrer">
                Astronomy Engine
              </a>{' '}
              geometric ephemerides in J2000 ecliptic axes. The Moon and Galilean moons follow
              calculated orbits. Independent JPL reference residuals are available in Science Labs →
              Model validation. Orbit path ellipses and apsis/node overlays use JPL approximate
              elements.
            </p>
            <p>
              Educational scale exaggerates radii and compresses distances. Physical mode uses
              proportional distances and physical radii with logarithmic depth. Planet poles and
              rotation follow the IAU model. NASA Earth's Greenwich-centered map georeference is
              verified; other planet map longitude seams have not been independently calibrated.
              Atmosphere and lighting are visual approximations, not radiative transfer
              calculations.
            </p>
            <p>
              The sandbox uses Newtonian velocity Verlet, with optional adaptive encounter steps.
              Merging conserves mass and linear momentum; discarded remnant spin means orbital
              angular momentum need not be conserved across a collision. Model energy changes are
              reported separately from integration drift. Mission, rocket, eclipse and black-hole
              labs disclose their assumptions alongside their controls.
            </p>
            <h3>Data & imagery</h3>
            <p>
              Physical values:{' '}
              <a
                href="https://nssdc.gsfc.nasa.gov/planetary/factsheet/"
                target="_blank"
                rel="noreferrer"
              >
                NASA/NSSDC Planetary Fact Sheet
              </a>
              . Maps:{' '}
              <a href="https://www.solarsystemscope.com/textures/" target="_blank" rel="noreferrer">
                Solar System Scope / INOVE
              </a>
              , based on NASA imagery, under{' '}
              <a
                href="https://creativecommons.org/licenses/by/4.0/"
                target="_blank"
                rel="noreferrer"
              >
                CC BY 4.0
              </a>
              . Colors are enhanced and some unmapped terrain is reconstructed. Sources checked 20
              October 2026.
            </p>
            <p>
              Independent educational project. NASA and JPL do not endorse Arnav Space Simulation.
              Source code is MIT licensed. NASA Blue Marble and elevation imagery retain
              source-specific credit and reuse terms. The GEBCO_08 elevation visualization is
              provided for credited educational/noncommercial use. HYG star data is CC BY-SA 4.0;
              Solar System Scope maps are CC BY 4.0. Catalog epochs and parameter references appear
              in Data Explorer.
            </p>
            <a
              className="credits-github"
              href="https://github.com/Arnav-Dugad/arnav-space-simulation"
              target="_blank"
              rel="noreferrer"
            >
              Explore the source code <ArrowUpRight size={15} />
            </a>
            <span className="version">DISCOVERY RELEASE · v0.2.0</span>
          </div>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
          <button aria-label="Dismiss notification" onClick={() => setToast('')}>
            <X size={14} />
          </button>
        </div>
      )}
      <div className="sr-only" aria-live="polite">
        {page === 'explore'
          ? `${planet.name} selected. ${formatDate(date)}.`
          : `${navigation.find((n) => n.id === page)!.label} open.`}
      </div>
    </div>
  );
}
