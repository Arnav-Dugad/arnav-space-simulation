/**
 * Astronomy Engine 2.1.19 adapter. Dates are UTC milliseconds (never pass these
 * numbers straight to the library, whose numeric dates mean J2000 days).
 * All physical vectors here use right-handed J2000 mean-ecliptic axes.
 * Position units: AU; velocity units: AU/day; orientation vectors: dimensionless.
 * Source/model notes: https://github.com/cosinekitty/astronomy
 */
import {
  Body,
  GeoMoon,
  HelioVector,
  JupiterMoons,
  RotationAxis,
  RotateVector,
  Rotation_EQJ_ECL,
  Vector,
  SearchGlobalSolarEclipse,
  SearchLunarEclipse,
  NextGlobalSolarEclipse,
  NextLunarEclipse,
  MoonPhase,
  Illumination,
  SiderealTime,
  Rotation_EQD_EQJ,
} from 'astronomy-engine';
import type { Vec3 } from './orbital';

const bodies: Record<string, Body> = {
  sun: Body.Sun,
  mercury: Body.Mercury,
  venus: Body.Venus,
  earth: Body.Earth,
  moon: Body.Moon,
  mars: Body.Mars,
  jupiter: Body.Jupiter,
  saturn: Body.Saturn,
  uranus: Body.Uranus,
  neptune: Body.Neptune,
  pluto: Body.Pluto,
};
const eqjToEcliptic = Rotation_EQJ_ECL();
const radians = Math.PI / 180;

function utc(date: number): Date {
  if (!Number.isFinite(date) || !Number.isFinite(new Date(date).getTime()))
    throw new Error('A finite UTC timestamp in milliseconds is required.');
  return new Date(date);
}
function body(id: string): Body {
  const result = bodies[id.toLowerCase()];
  if (!result) throw new Error(`Unsupported ephemeris body: ${id}`);
  return result;
}
function ecliptic(vector: Vector): Vec3 {
  const value = RotateVector(eqjToEcliptic, vector);
  return [value.x, value.y, value.z];
}

/** Geometric Moon-center offset from Earth center, AU. Add to Earth position. */
export function lunarOffset(date: number): Vec3 {
  return ecliptic(GeoMoon(utc(date)));
}

/** Geometric heliocentric position, AU; no apparent-position/light-time shift. */
export function ephemerisPosition(bodyId: string, date: number): Vec3 {
  return ecliptic(HelioVector(body(bodyId), utc(date)));
}

export const galileanMoonIds = ['io', 'europa', 'ganymede', 'callisto'] as const;
export type GalileanMoonId = (typeof galileanMoonIds)[number];
/** Offsets from Jupiter center, AU. Perturbed L1 moon theory, not circular paths. */
export function jupiterMoonPositions(date: number): Record<GalileanMoonId, Vec3> {
  const moons = JupiterMoons(utc(date));
  return Object.fromEntries(
    galileanMoonIds.map((id) => {
      const state = moons[id];
      return [id, ecliptic(new Vector(state.x, state.y, state.z, state.t))];
    }),
  ) as Record<GalileanMoonId, Vec3>;
}

/**
 * IAU WGCCRE 2015 orientation. raHours/decDegrees refer to EQJ; all returned
 * basis vectors use ECL. north is the IAU north pole, not angular momentum
 * for retrograde Venus/Uranus. spinDegrees is prime-meridian W, modulo 360.
 * primeMeridian and east are the body-fixed +X/+Y directions; use the full
 * basis for a calibrated texture instead of aligning only the north pole.
 * Earth uses apparent sidereal time and EQD->EQJ precession/nutation for its
 * Greenwich basis: its engine spin field must not be combined with pole RA
 * through the generic IAU formula. Maps need verified longitude/UV offsets.
 */
export function axisOrientation(bodyId: string, date: number) {
  const axis = RotationAxis(body(bodyId), utc(date));
  const alpha = axis.ra * 15 * radians;
  const delta = axis.dec * radians;
  const spinDegrees = ((axis.spin % 360) + 360) % 360;
  const w = spinDegrees * radians;
  const node = [-Math.sin(alpha), Math.cos(alpha), 0];
  const tangent = [
    -Math.cos(alpha) * Math.sin(delta),
    -Math.sin(alpha) * Math.sin(delta),
    Math.cos(delta),
  ];
  const basis = (a: number, b: number) =>
    ecliptic(
      new Vector(
        node[0] * a + tangent[0] * b,
        node[1] * a + tangent[1] * b,
        node[2] * a + tangent[2] * b,
        axis.north.t,
      ),
    );
  const earthAngle =
    bodyId.toLowerCase() === 'earth' ? SiderealTime(utc(date)) * 15 * radians : null;
  const earthBasis = (a: number, b: number) =>
    ecliptic(RotateVector(Rotation_EQD_EQJ(utc(date)), new Vector(a, b, 0, axis.north.t)));
  return {
    north: ecliptic(axis.north),
    primeMeridian:
      earthAngle === null
        ? basis(Math.cos(w), Math.sin(w))
        : earthBasis(Math.cos(earthAngle), Math.sin(earthAngle)),
    east:
      earthAngle === null
        ? basis(-Math.sin(w), Math.cos(w))
        : earthBasis(-Math.sin(earthAngle), Math.cos(earthAngle)),
    spinDegrees,
    raHours: axis.ra,
    decDegrees: axis.dec,
    frame: 'J2000 mean ecliptic' as const,
  };
}

/** Geocentric phase longitude: new=0, first quarter=90, full=180 degrees. */
export function lunarPhase(date: number) {
  const time = utc(date);
  return {
    phaseDegrees: MoonPhase(time),
    illuminatedFraction: Illumination(Body.Moon, time).phase_fraction,
  };
}

export interface EclipseEvent {
  type: 'solar' | 'lunar';
  kind: string;
  peak: number;
  obscuration: number | null;
  latitude: number | null;
  longitude: number | null;
  /** Lunar eclipse half-durations, minutes. Solar visibility needs an observer. */
  halfDurationMinutes: { penumbral: number; partial: number; total: number } | null;
}
/** Geometry-based global events; solar results do not imply local visibility. */
export function upcomingEclipses(date: number, count = 6): EclipseEvent[] {
  if (!Number.isInteger(count) || count < 1 || count > 24)
    throw new Error('Request between 1 and 24 eclipse events.');
  let solar = SearchGlobalSolarEclipse(utc(date));
  let lunar = SearchLunarEclipse(utc(date));
  const result: EclipseEvent[] = [];
  for (let i = 0; i < count; i++) {
    if (solar.peak.date.getTime() <= lunar.peak.date.getTime()) {
      result.push({
        type: 'solar',
        kind: solar.kind,
        peak: solar.peak.date.getTime(),
        obscuration: solar.obscuration ?? null,
        latitude: solar.latitude ?? null,
        longitude: solar.longitude ?? null,
        halfDurationMinutes: null,
      });
      solar = NextGlobalSolarEclipse(solar.peak);
    } else {
      result.push({
        type: 'lunar',
        kind: lunar.kind,
        peak: lunar.peak.date.getTime(),
        obscuration: lunar.obscuration,
        latitude: null,
        longitude: null,
        halfDurationMinutes: {
          penumbral: lunar.sd_penum,
          partial: lunar.sd_partial,
          total: lunar.sd_total,
        },
      });
      lunar = NextLunarEclipse(lunar.peak);
    }
  }
  return result;
}

export const ephemerisProvenance = {
  model: 'Astronomy Engine 2.1.19',
  source: 'https://github.com/cosinekitty/astronomy',
  orientationSource:
    'https://astropedia.astrogeology.usgs.gov/download/Docs/WGCCRE/WGCCRE2015reprint.pdf',
  notes:
    'Approximate analytical ephemerides for education; upstream targets about one arcminute angular accuracy. This is not an uncertainty estimate for each displayed value. Satellite L1 and IAU rotation models have separate limitations. Compare sparse JPL reference samples in the data lab.',
} as const;
