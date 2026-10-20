import reference from '../../public/data/ephemeris-reference.json';
import { AU_KM, planets } from '../data/planets';
import { orbitPosition, type Vec3 } from './orbital';
import { ephemerisPosition, lunarOffset } from './ephemeris';

function residual(calculated: Vec3, expected: number[]) {
  const errorKm = Math.hypot(...calculated.map((v, i) => v - expected[i])) * AU_KM;
  const dot = calculated.reduce((s, v, i) => s + v * expected[i], 0);
  // atan2 avoids catastrophic cancellation for the small engine residuals.
  const cross = [
    calculated[1] * expected[2] - calculated[2] * expected[1],
    calculated[2] * expected[0] - calculated[0] * expected[2],
    calculated[0] * expected[1] - calculated[1] * expected[0],
  ];
  const angularArcseconds = ((Math.atan2(Math.hypot(...cross), dot) * 180) / Math.PI) * 3600;
  return { errorKm, angularArcseconds };
}

/** Measured residuals for the exact saved JPL queries, not a claimed uncertainty. */
export function ephemerisValidationRows() {
  return reference.targets.flatMap((target) =>
    target.samples.map((sample) => {
      const date = Date.parse(sample.date);
      const planet = planets.find((p) => p.id === target.id);
      const calculated =
        target.id === 'moon' ? lunarOffset(date) : ephemerisPosition(target.id, date);
      return {
        bodyId: target.id,
        date: sample.date,
        targetId: target.targetId,
        reference: sample.positionAU,
        model: calculated,
        engine: residual(calculated, sample.positionAU),
        educational: planet ? residual(orbitPosition(planet, date), sample.positionAU) : null,
      };
    }),
  );
}

export const ephemerisReferenceMetadata = {
  source: reference.source,
  retrievedAt: reference.retrievedAt,
  frame: reference.frame,
  timeScale: reference.timeScale,
  notes: reference.notes,
  sampleCount: reference.targets.reduce((sum, target) => sum + target.samples.length, 0),
};
