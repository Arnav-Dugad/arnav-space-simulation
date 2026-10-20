import { validateBodies, type Body } from '../simulation/nbody';
export interface SavedExperiment {
  id: string;
  name: string;
  savedAt: string;
  bodies: Body[];
}
const key = 'ass-experiments-v1';
export function savedExperiments(): SavedExperiment[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? '[]');
    if (!Array.isArray(value)) return [];
    return value.slice(0, 20).flatMap((v) => {
      try {
        if (typeof v.id !== 'string' || typeof v.name !== 'string' || typeof v.savedAt !== 'string')
          return [];
        return [
          {
            id: v.id,
            name: v.name.slice(0, 60),
            savedAt: v.savedAt,
            bodies: validateBodies(v.bodies),
          },
        ];
      } catch {
        return [];
      }
    });
  } catch {
    return [];
  }
}
export function saveExperiment(name: string, bodies: Body[]): SavedExperiment[] {
  const clean = name.trim().slice(0, 60);
  if (!clean) throw new Error('Give this experiment a name.');
  const values = [
    {
      id: crypto.randomUUID(),
      name: clean,
      savedAt: new Date().toISOString(),
      bodies: validateBodies(bodies),
    },
    ...savedExperiments(),
  ].slice(0, 20);
  localStorage.setItem(key, JSON.stringify(values));
  return values;
}
export function removeExperiment(id: string): SavedExperiment[] {
  const values = savedExperiments().filter((v) => v.id !== id);
  localStorage.setItem(key, JSON.stringify(values));
  return values;
}
