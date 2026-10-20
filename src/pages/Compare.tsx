import { useState } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { planets } from '../data/planets';
export default function Compare() {
  const [ids, setIds] = useState(['earth', 'mars']);
  const [mode, setMode] = useState('radius');
  const selected = ids.map((id) => planets.find((p) => p.id === id)!);
  const max = Math.max(...selected.map((p) => p.radius));
  const rows = [
    ['Equatorial radius', 'radius', 'km'],
    ['Mass', 'mass', 'kg'],
    ['Surface gravity', 'gravity', 'm/s²'],
    ['Escape velocity', 'escape', 'km/s'],
    ['Orbital period', 'period', 'days'],
    ['Rotation period', 'rotation', 'hours'],
    ['Mean temperature', 'temperature', '°C'],
  ] as const;
  return (
    <div className="lab-page compare-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">COSMIC PERSPECTIVE / 004</div>
          <h1>Worlds, side by side.</h1>
          <p>Familiar neighbors. Remarkably different places.</p>
        </div>
        <span className="fidelity">
          <span />
          NASA reference data
        </span>
      </div>
      <div className="compare-top">
        <div className="segmented">
          <button className={mode === 'radius' ? 'active' : ''} onClick={() => setMode('radius')}>
            True radius ratio
          </button>
          <button className={mode === 'equal' ? 'active' : ''} onClick={() => setMode('equal')}>
            Equal visual size
          </button>
        </div>
        <button className="text-button" onClick={() => setIds([...ids].reverse())}>
          <ArrowLeftRight size={15} /> Swap worlds
        </button>
      </div>
      <div className="comparison-visual panel">
        {selected.map((p, i) => (
          <div className="compare-world" key={i}>
            <label className="sr-only" htmlFor={`compare-${i}`}>
              Planet {i + 1}
            </label>
            <select
              id={`compare-${i}`}
              value={p.id}
              onChange={(e) => setIds(ids.map((id, j) => (i === j ? e.target.value : id)))}
            >
              {planets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <div className="planet-stage">
              <div
                className="photo-planet"
                role="img"
                aria-label={`${p.name} surface map illustration`}
                style={{
                  width: mode === 'radius' ? `${(p.radius / max) * 230}px` : '220px',
                  height: mode === 'radius' ? `${(p.radius / max) * 230}px` : '220px',
                  backgroundImage: `url(/textures/${p.id === 'earth' ? 'earth_daymap' : p.id === 'venus' ? 'venus_atmosphere' : p.id}.jpg)`,
                }}
              />
            </div>
            <h2>{p.name}</h2>
            <p>{p.kind}</p>
          </div>
        ))}
      </div>
      <p className="comparison-caption">
        {mode === 'radius'
          ? `${selected[0].name} has ${(selected[0].radius / selected[1].radius).toFixed(2)}× the equatorial radius of ${selected[1].name}. Planet disks use the same linear scale.`
          : 'Equal-size surface illustrations. Sizes are exaggerated independently.'}{' '}
        Ring systems are omitted.
      </p>
      <div className="panel compare-table">
        <table>
          <thead>
            <tr>
              <th>PROPERTY</th>
              {selected.map((p, i) => (
                <th key={i}>{p.name.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, key, unit]) => (
              <tr key={key}>
                <td>{label}</td>
                {selected.map((p, i) => (
                  <td key={i}>
                    {key === 'mass' ? p[key].toExponential(3) : p[key].toLocaleString()}{' '}
                    <small>{unit}</small>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="footnote">
        Reference values are rounded; giant-planet gravity and temperature refer to atmospheric
        reference levels. Negative rotation periods indicate retrograde rotation.
      </p>
    </div>
  );
}
