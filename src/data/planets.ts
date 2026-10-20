// NASA/NSSDC Planetary Fact Sheet, retrieved 2026-10-20. Radius is equatorial.
// JPL Table 1 elements/rates: a (AU), e, I, L, longitude of perihelion, ascending node (degrees).
export type Elements = [number, number, number, number, number, number];
export interface Planet {
  id: string;
  name: string;
  kind: string;
  color: string;
  radius: number;
  mass: number;
  gravity: number;
  escape: number;
  rotation: number;
  tilt: number;
  temperature: number;
  period: number;
  atmosphere: string;
  moons: string;
  description: string;
  size: number;
  elements: Elements;
  rates: Elements;
}
export const planets: Planet[] = [
  {
    id: 'mercury',
    name: 'Mercury',
    kind: 'Terrestrial planet',
    color: '#b8aaa0',
    radius: 2439.5,
    mass: 0.33e24,
    gravity: 3.7,
    escape: 4.3,
    rotation: 1407.6,
    tilt: 0.034,
    temperature: 167,
    period: 88,
    atmosphere: 'Extremely thin exosphere',
    moons: 'None',
    description:
      'A world of extremes. Its ancient, cratered surface preserves a record of the earliest Solar System.',
    size: 0.3,
    elements: [0.38709927, 0.20563593, 7.00497902, 252.2503235, 77.45779628, 48.33076593],
    rates: [0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081],
  },
  {
    id: 'venus',
    name: 'Venus',
    kind: 'Terrestrial planet',
    color: '#e8c79e',
    radius: 6052,
    mass: 4.87e24,
    gravity: 8.9,
    escape: 10.4,
    rotation: -5832.5,
    tilt: 177.4,
    temperature: 464,
    period: 224.7,
    atmosphere: 'Carbon dioxide, nitrogen',
    moons: 'None',
    description:
      'Wrapped in thick clouds, Venus has a crushing atmosphere and a surface hot enough to melt lead.',
    size: 0.58,
    elements: [0.72333566, 0.00677672, 3.39467605, 181.9790995, 131.60246718, 76.67984255],
    rates: [0.0000039, -0.00004107, -0.0007889, 58517.81538729, 0.00268329, -0.27769418],
  },
  {
    id: 'earth',
    name: 'Earth',
    kind: 'Terrestrial planet',
    color: '#81b8ef',
    radius: 6378,
    mass: 5.97e24,
    gravity: 9.8,
    escape: 11.2,
    rotation: 23.9,
    tilt: 23.4,
    temperature: 15,
    period: 365.2,
    atmosphere: 'Nitrogen, oxygen',
    moons: 'The Moon',
    description:
      'Our pale blue home. An ocean world with a protective atmosphere, a dynamic surface, and the only life we know.',
    size: 0.66,
    elements: [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0],
    rates: [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0],
  },
  {
    id: 'mars',
    name: 'Mars',
    kind: 'Terrestrial planet',
    color: '#e7a184',
    radius: 3396,
    mass: 0.642e24,
    gravity: 3.7,
    escape: 5.0,
    rotation: 24.6,
    tilt: 25.2,
    temperature: -65,
    period: 687,
    atmosphere: 'Carbon dioxide, argon, nitrogen',
    moons: 'Phobos, Deimos',
    description:
      'A rusty desert world with giant volcanoes, polar ice, and the traces of ancient rivers.',
    size: 0.43,
    elements: [1.52371034, 0.0933941, 1.84969142, -4.55343205, -23.94362959, 49.55953891],
    rates: [0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343],
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    kind: 'Gas giant',
    color: '#ddbea1',
    radius: 71492,
    mass: 1898e24,
    gravity: 23.1,
    escape: 59.5,
    rotation: 9.9,
    tilt: 3.1,
    temperature: -110,
    period: 4331,
    atmosphere: 'Hydrogen, helium',
    moons: 'Io, Europa, Ganymede, Callisto, and others',
    description:
      'The giant of our planetary family. Bands of clouds circle a world with powerful storms and a vast magnetic field.',
    size: 1.32,
    elements: [5.202887, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909],
    rates: [-0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106],
  },
  {
    id: 'saturn',
    name: 'Saturn',
    kind: 'Gas giant',
    color: '#e3d0a6',
    radius: 60268,
    mass: 568e24,
    gravity: 9.0,
    escape: 35.5,
    rotation: 10.7,
    tilt: 26.7,
    temperature: -140,
    period: 10747,
    atmosphere: 'Hydrogen, helium',
    moons: 'Titan, Enceladus, Mimas, and others',
    description:
      'An intricate ring system made mostly of ice surrounds this low-density giant. Its moons hide remarkable worlds.',
    size: 1.1,
    elements: [9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448],
    rates: [-0.0012506, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794],
  },
  {
    id: 'uranus',
    name: 'Uranus',
    kind: 'Ice giant',
    color: '#a8dddf',
    radius: 25559,
    mass: 86.8e24,
    gravity: 8.7,
    escape: 21.3,
    rotation: -17.2,
    tilt: 97.8,
    temperature: -195,
    period: 30589,
    atmosphere: 'Hydrogen, helium, methane',
    moons: 'Titania, Oberon, Ariel, Umbriel, and others',
    description:
      'A quiet blue-green world tipped onto its side, giving it some of the most extreme seasons in our Solar System.',
    size: 0.85,
    elements: [19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.9542763, 74.01692503],
    rates: [-0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281, 0.04240589],
  },
  {
    id: 'neptune',
    name: 'Neptune',
    kind: 'Ice giant',
    color: '#7198eb',
    radius: 24764,
    mass: 102e24,
    gravity: 11.0,
    escape: 23.5,
    rotation: 16.1,
    tilt: 28.3,
    temperature: -200,
    period: 59800,
    atmosphere: 'Hydrogen, helium, methane',
    moons: 'Triton, Nereid, and others',
    description:
      'Dark, cold, and swept by supersonic winds. Neptune is the most distant of our eight planets.',
    size: 0.82,
    elements: [30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574],
    rates: [0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464, -0.00508664],
  },
];
export const AU_KM = 149597870.7;
export const DAY_MS = 86400000;
export const MU_SUN = 1.32712440018e11; // km³/s², IAU 2015 nominal solar mass parameter
export const MIN_DATE = Date.UTC(1800, 0, 1);
export const MAX_DATE = Date.UTC(2050, 0, 1);
