import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { planets, AU_KM, type Planet } from '../data/planets';
import { elementsAt, orbitPosition, renderPosition } from '../simulation/orbital';
import {
  ephemerisPosition,
  lunarOffset,
  jupiterMoonPositions,
  axisOrientation,
} from '../simulation/ephemeris';
import { downloadFile } from '../utils/export';
export interface SceneSettings {
  orbits: boolean;
  labels: boolean;
  trueScale: boolean;
  quality: 'high' | 'low';
  reducedMotion: boolean;
  frame?: 'heliocentric' | 'barycentric' | 'body';
  bodyScale?: 'educational' | 'physical';
  overlays?: boolean;
  nightLights?: boolean;
  surfaceLayer?: 'natural' | 'enhanced' | 'grayscale' | 'nightmap' | 'clouds' | 'relief';
}
interface Props {
  date: number;
  selected: string | null;
  cameraMode: string;
  cameraKey: number;
  settings: SceneSettings;
  onSelect: (id: string) => void;
}
const vector = (v: number[]) => new THREE.Vector3(v[0], v[2], -v[1]);
export default function SceneEngine(props: Props) {
  const host = useRef<HTMLDivElement>(null),
    live = useRef(props);
  const [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  useEffect(() => {
    live.current = props;
  });
  useEffect(() => {
    const container = host.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: props.settings.quality === 'high',
        alpha: true,
        powerPreference: 'high-performance',
        logarithmicDepthBuffer: true,
      });
    } catch {
      setError('WebGL is unavailable. Planetary data and the scientific labs remain accessible.');
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, props.settings.quality === 'high' ? 2 : 1));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.shadowMap.enabled = props.settings.quality === 'high';
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.domElement.setAttribute(
      'aria-label',
      'Interactive 3D Solar System. Drag to orbit, scroll to zoom. Select planets using the object list.',
    );
    container.appendChild(renderer.domElement);
    const scene = new THREE.Scene(),
      camera = new THREE.PerspectiveCamera(43, 1, 1e-8, 5000),
      controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.065;
    controls.maxDistance = 1200;
    scene.add(new THREE.AmbientLight('#b7cae9', 0.16));
    const sunlight = new THREE.PointLight('#fff1df', 3.5, 0, 0);
    sunlight.castShadow = props.settings.quality === 'high';
    sunlight.shadow.mapSize.set(2048, 2048);
    sunlight.shadow.camera.near = 0.001;
    sunlight.shadow.camera.far = 1200;
    sunlight.shadow.bias = -0.00003;
    scene.add(sunlight);
    let active = true;
    const loader = new THREE.TextureLoader(),
      textures = new Set<THREE.Texture>();
    function texture(name: string) {
      const t = loader.load('/textures/' + name, undefined, undefined, () => {
        if (active) setNotice('A surface map is unavailable. Showing a simplified material.');
      });
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      textures.add(t);
      return t;
    }
    const sphere = new THREE.SphereGeometry(1, props.settings.quality === 'high' ? 64 : 32, 32);
    const closeSphere = new THREE.SphereGeometry(1, 128, 64);
    const sun = new THREE.Mesh(
      sphere,
      new THREE.MeshBasicMaterial({ map: texture('sun.jpg'), color: '#fff0d0' }),
    );
    scene.add(sun);
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = 128;
    glowCanvas.height = 128;
    const cx = glowCanvas.getContext('2d')!,
      gradient = cx.createRadialGradient(64, 64, 4, 64, 64, 64);
    gradient.addColorStop(0, '#ffd28c88');
    gradient.addColorStop(0.3, '#ffb65b22');
    gradient.addColorStop(1, '#ffb65b00');
    cx.fillStyle = gradient;
    cx.fillRect(0, 0, 128, 128);
    const glowTexture = new THREE.CanvasTexture(glowCanvas);
    textures.add(glowTexture);
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    scene.add(glow);
    const sky = new THREE.Group();
    scene.add(sky);
    fetch('/data/bright-stars.json')
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(
        (data: {
          records: { raDeg: number; decDeg: number; mag: number; colorIndex: number | null }[];
        }) => {
          if (!active) return;
          const positions: number[] = [],
            colors: number[] = [],
            tilt = (23.43928 * Math.PI) / 180;
          for (const s of data.records) {
            const a = (s.raDeg * Math.PI) / 180,
              d = (s.decDeg * Math.PI) / 180,
              x = Math.cos(d) * Math.cos(a),
              y = Math.cos(d) * Math.sin(a),
              z = Math.sin(d);
            positions.push(
              x * 1200,
              (z * Math.cos(tilt) - y * Math.sin(tilt)) * 1200,
              -(y * Math.cos(tilt) + z * Math.sin(tilt)) * 1200,
            );
            const color = new THREE.Color(
              s.colorIndex !== null && s.colorIndex > 1
                ? '#ffd0a1'
                : s.colorIndex !== null && s.colorIndex < 0
                  ? '#b8d6ff'
                  : '#e6e8ef',
            );
            const bright = Math.max(0.2, Math.min(1.8, 1.2 - s.mag * 0.16));
            colors.push(color.r * bright, color.g * bright, color.b * bright);
          }
          const geometry = new THREE.BufferGeometry();
          geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
          geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
          sky.add(
            new THREE.Points(
              geometry,
              new THREE.PointsMaterial({
                vertexColors: true,
                size: 2.2,
                sizeAttenuation: false,
                transparent: true,
                opacity: 0.85,
                depthWrite: false,
              }),
            ),
          );
        },
      )
      .catch(() => {
        if (active)
          setNotice('The bright-star catalog could not load. Planet simulations remain available.');
      });
    const meshes = new Map<string, THREE.Group>(),
      surfaces = new Map<string, THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>>(),
      lines = new Map<string, THREE.LineLoop>(),
      labels = new Map<string, HTMLButtonElement>();
    const labelLayer = document.createElement('div');
    labelLayer.className = 'scene-labels';
    container.appendChild(labelLayer);
    const nightUniforms = {
      uAssSun: { value: new THREE.Vector3() },
      uAssNight: { value: 1 },
      uAssObservation: { value: 0 },
    };
    let nightMap: THREE.Texture | null = null,
      cloudObservation: THREE.Texture | null = null,
      reliefMap: THREE.Texture | null = null;
    let earthBase: THREE.Texture | null = null,
      earthHigh: THREE.Texture | null = null,
      loadingHigh = false;
    planets.forEach((p) => {
      const group = new THREE.Group();
      meshes.set(p.id, group);
      scene.add(group);
      const material = new THREE.MeshStandardMaterial({
        map: texture(
          `${p.id === 'earth' ? 'earth_daymap' : p.id === 'venus' ? 'venus_atmosphere' : p.id}.jpg`,
        ),
        roughness: p.id === 'earth' ? 0.78 : 1,
      });
      const surface = new THREE.Mesh(sphere, material);
      surface.scale.setScalar(p.size);
      surface.castShadow = true;
      surface.receiveShadow = true;
      surface.userData.id = p.id;
      group.add(surface);
      surfaces.set(p.id, surface);
      if (p.id === 'earth') {
        earthBase = material.map;
        material.emissiveMap = texture('earth_nightmap.jpg');
        nightMap = material.emissiveMap;
        material.emissive.set('#ffd7a5');
        material.emissiveIntensity = 1.2;
        material.onBeforeCompile = (shader) => {
          Object.assign(shader.uniforms, nightUniforms);
          shader.vertexShader = shader.vertexShader
            .replace('#include <common>', '#include <common>\nvarying vec3 vAssNormal;')
            .replace(
              '#include <defaultnormal_vertex>',
              '#include <defaultnormal_vertex>\nvAssNormal=normalize(mat3(modelMatrix)*objectNormal);',
            );
          shader.fragmentShader = shader.fragmentShader
            .replace(
              '#include <common>',
              '#include <common>\nvarying vec3 vAssNormal;uniform vec3 uAssSun;uniform float uAssNight;uniform float uAssObservation;',
            )
            .replace(
              '#include <emissivemap_fragment>',
              '#include <emissivemap_fragment>\ntotalEmissiveRadiance*=mix(uAssNight*(1.-smoothstep(-.18,.1,dot(normalize(vAssNormal),normalize(uAssSun)))),1.,uAssObservation);',
            );
        };
        const cloudMap = texture('earth_clouds.jpg'),
          cloud = new THREE.Mesh(
            sphere,
            new THREE.MeshStandardMaterial({
              map: cloudMap,
              alphaMap: cloudMap,
              transparent: true,
              opacity: 0.45,
              depthWrite: false,
            }),
          );
        cloudObservation = cloudMap;
        cloud.scale.setScalar(p.size * 1.009);
        group.add(cloud);
        const atmosphere = new THREE.Mesh(
          sphere,
          new THREE.ShaderMaterial({
            uniforms: { uAssSun: nightUniforms.uAssSun },
            vertexShader:
              'varying vec3 n;varying vec3 v;void main(){vec4 wp=modelMatrix*vec4(position,1.);n=normalize(mat3(modelMatrix)*normal);v=normalize(cameraPosition-wp.xyz);gl_Position=projectionMatrix*viewMatrix*wp;}',
            fragmentShader:
              'varying vec3 n;varying vec3 v;uniform vec3 uAssSun;void main(){float mu=max(dot(normalize(n),normalize(v)),0.);float light=max(dot(normalize(n),normalize(uAssSun)),0.);float phase=.75*(1.+pow(dot(normalize(v),normalize(uAssSun)),2.));gl_FragColor=vec4(vec3(.16,.42,1.)*phase*(.2+.8*light),pow(1.-mu,3.5)*.45);}',
            transparent: true,
            depthWrite: false,
            depthTest: false,
            blending: THREE.AdditiveBlending,
          }),
        );
        atmosphere.scale.setScalar(p.size * 1.025);
        group.add(atmosphere);
      }
      if (p.id === 'saturn') {
        const geometry = new THREE.RingGeometry(p.size * 1.25, p.size * 2.3, 128),
          pos = geometry.attributes.position,
          uv = geometry.attributes.uv;
        for (let i = 0; i < pos.count; i++)
          uv.setXY(
            i,
            (Math.hypot(pos.getX(i), pos.getY(i)) - p.size * 1.25) / (p.size * 1.05),
            0.5,
          );
        const map = texture('saturn_ring.png'),
          ring = new THREE.Mesh(
            geometry,
            new THREE.MeshStandardMaterial({
              map,
              alphaMap: map,
              transparent: true,
              alphaTest: 0.12,
              side: THREE.DoubleSide,
              roughness: 1,
            }),
          );
        ring.rotation.x = -Math.PI / 2;
        ring.castShadow = true;
        ring.receiveShadow = true;
        ring.customDepthMaterial = new THREE.MeshDepthMaterial({
          depthPacking: THREE.RGBADepthPacking,
          map,
          alphaTest: 0.12,
        });
        ring.customDistanceMaterial = new THREE.MeshDistanceMaterial({
          map,
          alphaTest: 0.12,
          side: THREE.DoubleSide,
        });
        group.add(ring);
      }
      const line = new THREE.LineLoop(
        new THREE.BufferGeometry(),
        new THREE.LineBasicMaterial({ color: p.color, transparent: true, opacity: 0.16 }),
      );
      scene.add(line);
      lines.set(p.id, line);
      const label = document.createElement('button');
      label.className = 'planet-label';
      label.textContent = p.name;
      label.onclick = () => live.current.onSelect(p.id);
      labels.set(p.id, label);
      labelLayer.appendChild(label);
    });
    const moon = new THREE.Mesh(
      sphere,
      new THREE.MeshStandardMaterial({ map: texture('moon.jpg'), roughness: 1 }),
    );
    moon.castShadow = true;
    moon.receiveShadow = true;
    scene.add(moon);
    let moonFocus: string | null = null;
    const jovianMoons = Object.fromEntries(
      ['io', 'europa', 'ganymede', 'callisto'].map((id, i) => {
        const mesh = new THREE.Mesh(
          sphere,
          new THREE.MeshStandardMaterial({
            color: ['#cbb47e', '#d2c8b0', '#98968b', '#83796e'][i],
            roughness: 1,
          }),
        );
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
        const label = document.createElement('button');
        label.className = 'planet-label moon-label';
        label.textContent = id[0].toUpperCase() + id.slice(1);
        label.setAttribute('aria-label', id + ' moon information');
        label.onclick = () => {
          moonFocus = moonFocus === id ? null : id;
          setNotice(
            `${id[0].toUpperCase() + id.slice(1)} · radius ${[1821.6, 1560.8, 2634.1, 2410.3][i]} km · computed jovicentric orbit · illustrative solid-color surface. Click its label again to return to Jupiter.`,
          );
        };
        labelLayer.appendChild(label);
        labels.set(id, label);
        return [id, mesh];
      }),
    );
    const selector = new THREE.Mesh(
      new THREE.RingGeometry(1, 1.004, 96),
      new THREE.MeshBasicMaterial({
        color: '#a9d4ff',
        transparent: true,
        opacity: 0.23,
        side: THREE.DoubleSide,
      }),
    );
    const focusMoon = (event: Event) => {
      const id = (event as CustomEvent<string>).detail;
      if (id === 'system' || id === 'jupiter' || id in jovianMoons) {
        moonFocus = id === 'jupiter' ? null : id;
        setNotice(
          id === 'system'
            ? 'Galilean moon system · calculated orbits · educational separations are compressed.'
            : id === 'jupiter'
              ? 'Jupiter camera restored.'
              : `${id[0].toUpperCase() + id.slice(1)} · computed jovicentric orbit · radius ${[1821.6, 1560.8, 2634.1, 2410.3][['io', 'europa', 'ganymede', 'callisto'].indexOf(id)]} km · illustrative solid-color surface.`,
        );
      }
    };
    addEventListener('ass:focus-moon', focusMoon);
    scene.add(selector);
    const grid = new THREE.GridHelper(100, 40, '#31496b', '#17283e');
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.2;
    scene.add(grid);
    const arrow = new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(),
      1,
      '#9bd8c6',
    );
    scene.add(arrow);
    const apses = [0, Math.PI].map(() => {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(1, 10, 8),
        new THREE.MeshBasicMaterial({ color: '#e2bb8e' }),
      );
      scene.add(mesh);
      return mesh;
    });
    const nodes = [0, 1].map(() => {
      const mesh = new THREE.Mesh(
        new THREE.OctahedronGeometry(1, 0),
        new THREE.MeshBasicMaterial({ color: '#a1dacb' }),
      );
      scene.add(mesh);
      return mesh;
    });
    const ray = new THREE.Raycaster(),
      pointer = new THREE.Vector2();
    let downX = 0,
      downY = 0;
    const pointerDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };
    const pointerUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 5) return;
      const b = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((e.clientX - b.left) / b.width) * 2 - 1,
        (-(e.clientY - b.top) / b.height) * 2 + 1,
      );
      ray.setFromCamera(pointer, camera);
      const hit = ray.intersectObjects(
        [...surfaces.values()].filter((m) => m.parent?.visible),
        false,
      )[0];
      if (hit) live.current.onSelect(hit.object.userData.id);
    };
    renderer.domElement.addEventListener('pointerdown', pointerDown);
    renderer.domElement.addEventListener('pointerup', pointerUp);
    const resize = new ResizeObserver(() => {
      const w = container.clientWidth,
        h = container.clientHeight;
      if (w && h) {
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
    });
    resize.observe(container);
    let frame = 0,
      prev = performance.now(),
      performanceStart = prev,
      performanceFrames = 0,
      lastSave = 0,
      lastDate = -1,
      lastOrbitYear = -1,
      lastScale = false,
      lastCamera = '',
      flying = false,
      userInteracting = false;
    const origin = new THREE.Vector3(),
      targetPosition = new THREE.Vector3(),
      targetLook = new THREE.Vector3(),
      lastFollow = new THREE.Vector3();
    const positions = new Map<string, number[]>(),
      orientations = new Map<string, ReturnType<typeof axisOrientation>>();
    let moonOffset = [0, 0, 0],
      moonOrientation = axisOrientation('moon', live.current.date),
      moonPositions = jupiterMoonPositions(live.current.date);
    const radius = (p: Planet) =>
      live.current.settings.bodyScale === 'physical' ? (p.radius / AU_KM) * 10 : p.size;
    controls.addEventListener('start', () => {
      flying = false;
      userInteracting = true;
    });
    controls.addEventListener('end', () => (userInteracting = false));
    function orient(object: THREE.Object3D, o: ReturnType<typeof axisOrientation>) {
      object.quaternion.setFromRotationMatrix(
        new THREE.Matrix4().makeBasis(
          vector(o.primeMeridian),
          vector(o.north),
          vector(o.east).negate(),
        ),
      );
    }
    function capture(event: Event) {
      const detail = (event as CustomEvent<{ scale: number; labels: boolean }>).detail ?? {
          scale: 1,
          labels: true,
        },
        scale = Math.max(1, Math.min(3, detail.scale)),
        w = container.clientWidth,
        h = container.clientHeight,
        ratio = renderer.getPixelRatio();
      renderer.setPixelRatio(1);
      renderer.setSize(Math.round(w * scale), Math.round(h * scale), false);
      renderer.render(scene, camera);
      const out = document.createElement('canvas');
      out.width = renderer.domElement.width;
      out.height = renderer.domElement.height;
      const ctx = out.getContext('2d')!;
      ctx.filter = renderer.domElement.style.filter || 'none';
      ctx.drawImage(renderer.domElement, 0, 0);
      ctx.filter = 'none';
      if (detail.labels) {
        ctx.fillStyle = '#09121f';
        ctx.fillRect(0, out.height - 90 * scale, out.width, 90 * scale);
        ctx.fillStyle = '#c9ddf8';
        ctx.font = `${15 * scale}px sans-serif`;
        ctx.fillText(
          `Arnav Space Simulation · ${live.current.selected ?? 'Solar System'}`,
          22 * scale,
          out.height - 59 * scale,
        );
        ctx.font = `${9 * scale}px sans-serif`;
        ctx.fillText(
          `${new Date(live.current.date).toISOString()} · Geometric ephemeris · ${live.current.settings.bodyScale === 'physical' ? 'Physical radii' : 'Exaggerated radii'}`,
          22 * scale,
          out.height - 36 * scale,
        );
        ctx.fillText(
          'NASA Blue Marble / Solar System Scope CC BY 4.0 · HYG stars CC BY-SA 4.0 · Educational project',
          22 * scale,
          out.height - 18 * scale,
        );
      }
      out.toBlob((blob) => {
        if (blob) downloadFile('arnav-space-simulation-observation.png', blob, 'image/png');
      });
      renderer.setPixelRatio(ratio);
      renderer.setSize(w, h, false);
      renderer.render(scene, camera);
    }
    const restore = (event: Event) => {
      const saved = (event as CustomEvent<{ position: number[]; target: number[] }>).detail;
      if (saved && [...saved.position, ...saved.target].every(Number.isFinite)) {
        camera.position.fromArray(saved.position);
        controls.target.fromArray(saved.target);
        flying = false;
      }
    };
    addEventListener('ass:capture', capture);
    addEventListener('ass:restore-camera', restore);
    function render() {
      const { date, selected, cameraMode, cameraKey, settings } = live.current,
        now = performance.now(),
        elapsed = Math.min(0.1, (now - prev) / 1000);
      prev = now;
      const ease = settings.reducedMotion ? 1 : 1 - Math.exp(-5 * elapsed),
        physical = settings.bodyScale === 'physical';
      if (date !== lastDate) {
        planets.forEach((p) => {
          positions.set(p.id, ephemerisPosition(p.id, date));
          orientations.set(p.id, axisOrientation(p.id, date));
        });
        moonOffset = lunarOffset(date);
        moonOrientation = axisOrientation('moon', date);
        moonPositions = jupiterMoonPositions(date);
        lastDate = date;
      }
      const desired = new THREE.Vector3();
      if (settings.frame === 'body' && selected)
        desired.set(
          ...renderPosition(
            positions.get(selected)! as [number, number, number],
            settings.trueScale,
          ),
        );
      else if (settings.frame === 'barycentric') {
        let total = 1.98847e30;
        planets.forEach((p) => {
          desired.addScaledVector(
            new THREE.Vector3(
              ...renderPosition(
                positions.get(p.id)! as [number, number, number],
                settings.trueScale,
              ),
            ),
            p.mass,
          );
          total += p.mass;
        });
        desired.divideScalar(total);
      }
      origin.lerp(desired, ease);
      const year = new Date(date).getUTCFullYear();
      if (year !== lastOrbitYear || settings.trueScale !== lastScale) {
        planets.forEach((p) => {
          const line = lines.get(p.id)!;
          line.geometry.dispose();
          line.geometry = new THREE.BufferGeometry().setFromPoints(
            Array.from(
              { length: 257 },
              (_, i) =>
                new THREE.Vector3(
                  ...renderPosition(
                    orbitPosition(p, date, (i / 256) * Math.PI * 2),
                    settings.trueScale,
                  ),
                ),
            ),
          );
        });
        lastOrbitYear = year;
        lastScale = settings.trueScale;
      }
      planets.forEach((p) => {
        const g = meshes.get(p.id)!;
        g.position
          .set(
            ...renderPosition(positions.get(p.id)! as [number, number, number], settings.trueScale),
          )
          .sub(origin);
        g.scale.setScalar(radius(p) / p.size);
        orient(g, orientations.get(p.id)!);
        g.visible = cameraMode === 'overview' || p.id === selected;
        const line = lines.get(p.id)!;
        line.position.copy(origin).negate();
        line.visible = settings.orbits && (cameraMode === 'overview' || p.id === selected);
      });
      sun.position.copy(origin).negate();
      sun.scale.setScalar(physical ? (696340 / AU_KM) * 10 : 1.6);
      sun.visible = cameraMode === 'overview';
      glow.position.copy(sun.position);
      glow.scale.setScalar(physical ? 1 : 14);
      glow.visible = sun.visible;
      sunlight.position.copy(sun.position);
      const earth = meshes.get('earth')!.position;
      moon.position
        .copy(earth)
        .add(vector(moonOffset).multiplyScalar(physical ? 10 : 1.5 / 0.00257));
      moon.scale.setScalar(physical ? (1737.4 / AU_KM) * 10 : 0.11);
      moon.visible = selected === 'earth' && cameraMode !== 'overview';
      orient(moon, moonOrientation);
      nightUniforms.uAssSun.value.copy(sun.position).sub(earth).normalize();
      nightUniforms.uAssNight.value = settings.nightLights === false ? 0 : 1;
      Object.entries(jovianMoons).forEach(([id, mesh], i) => {
        mesh.visible = selected === 'jupiter' && cameraMode !== 'overview';
        const offset = vector(moonPositions[id as keyof typeof moonPositions]);
        const distance = offset.length();
        mesh.position
          .copy(meshes.get('jupiter')!.position)
          .add(
            offset.multiplyScalar(
              physical ? 10 : (2.4 + Math.log1p(distance / 0.0028) * 2.2) / distance,
            ),
          );
        mesh.scale.setScalar(
          physical
            ? ([1821.6, 1560.8, 2634.1, 2410.3][i] / AU_KM) * 10
            : [0.09, 0.08, 0.13, 0.12][i],
        );
      });
      const material = surfaces.get('earth')!.material,
        pixels =
          ((radius(planets[2]) / Math.max(1e-12, camera.position.distanceTo(earth))) *
            container.clientHeight) /
          Math.tan((camera.fov * Math.PI) / 360);
      if (
        settings.quality === 'high' &&
        selected === 'earth' &&
        pixels > 450 &&
        !earthHigh &&
        !loadingHigh
      ) {
        loadingHigh = true;
        loader.load(
          '/textures/earth_high.jpg',
          (t) => {
            if (!active) {
              t.dispose();
              return;
            }
            t.colorSpace = THREE.SRGBColorSpace;
            t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
            earthHigh = t;
            material.map = t;
            material.needsUpdate = true;
          },
          undefined,
          () => (loadingHigh = false),
        );
      }
      if (earthHigh && selected !== 'earth') {
        material.map = earthBase;
        earthHigh.dispose();
        earthHigh = null;
        loadingHigh = false;
      }
      if (settings.surfaceLayer === 'relief' && !reliefMap) reliefMap = texture('earth_relief.jpg');
      const observation =
        selected === 'earth' &&
        ['nightmap', 'clouds', 'relief'].includes(settings.surfaceLayer ?? '');
      const sourceMap =
        settings.surfaceLayer === 'nightmap'
          ? nightMap
          : settings.surfaceLayer === 'clouds'
            ? cloudObservation
            : reliefMap;
      const desiredMap = observation ? sourceMap : (earthHigh ?? earthBase);
      if (material.map !== desiredMap) {
        material.map = desiredMap;
        material.needsUpdate = true;
      }
      material.emissiveMap = observation ? sourceMap : nightMap;
      material.color.set(observation ? '#000000' : '#ffffff');
      material.emissive.set(observation ? '#ffffff' : '#ffd7a5');
      material.emissiveIntensity = observation ? 1 : 1.2;
      nightUniforms.uAssObservation.value = observation ? 1 : 0;
      planets.forEach((p) => {
        const g = meshes.get(p.id)!,
          pixels =
            ((radius(p) / Math.max(1e-12, camera.position.distanceTo(g.position))) *
              container.clientHeight *
              renderer.getPixelRatio()) /
            Math.tan((camera.fov * Math.PI) / 360);
        surfaces.get(p.id)!.geometry =
          settings.quality === 'high' && g.visible && pixels > 450 ? closeSphere : sphere;
      });
      renderer.domElement.style.filter =
        settings.surfaceLayer === 'grayscale'
          ? 'grayscale(1)'
          : settings.surfaceLayer === 'enhanced'
            ? 'contrast(1.15) saturate(1.2)'
            : 'none';
      const p = planets.find((p) => p.id === selected),
        selectedPosition = p ? meshes.get(p.id)!.position : null;
      if (selected !== 'jupiter') moonFocus = null;
      const focusedMoon = moonFocus ? jovianMoons[moonFocus] : null;
      const lookPosition = focusedMoon?.position ?? selectedPosition;
      const focusRadius = focusedMoon
        ? focusedMoon.scale.x
        : moonFocus === 'system'
          ? Math.max(
              ...Object.values(jovianMoons).map((m) =>
                m.position.distanceTo(meshes.get('jupiter')!.position),
              ),
            ) * 0.75
          : p
            ? radius(p)
            : 1;
      const key = [
        cameraKey,
        cameraMode,
        selected,
        settings.trueScale,
        settings.bodyScale,
        moonFocus,
      ].join('|');
      if (key !== lastCamera) {
        targetLook.copy(lookPosition ?? new THREE.Vector3());
        if (cameraMode === 'overview' || !p) {
          targetLook.copy(origin).negate();
          targetPosition
            .copy(targetLook)
            .add(
              new THREE.Vector3(
                settings.trueScale ? 40 : 12,
                settings.trueScale ? 320 : 62,
                settings.trueScale ? 420 : 76,
              ),
            );
        } else if (cameraMode === 'top')
          targetPosition
            .copy(targetLook)
            .add(new THREE.Vector3(0, focusRadius * 8, focusRadius * 0.001));
        else {
          const light = sun.position.clone().sub(targetLook).normalize(),
            tangent = new THREE.Vector3(light.z, 0, -light.x).normalize();
          targetPosition
            .copy(targetLook)
            .addScaledVector(light, focusRadius * 4.8)
            .addScaledVector(tangent, focusRadius * 3.7)
            .add(new THREE.Vector3(0, focusRadius * 1.8, 0));
        }
        lastFollow.copy(targetLook);
        flying = true;
        controls.minDistance = p ? focusRadius * 1.08 : 0.001;
        if (!lastCamera || settings.reducedMotion) {
          camera.position.copy(targetPosition);
          controls.target.copy(targetLook);
          flying = false;
        }
        lastCamera = key;
      }
      if (cameraMode !== 'overview' && lookPosition) {
        const shift = lookPosition.clone().sub(lastFollow);
        camera.position.add(shift);
        controls.target.add(shift);
        targetPosition.add(shift);
        targetLook.copy(lookPosition);
        lastFollow.copy(lookPosition);
      }
      if (flying && !userInteracting) {
        camera.position.lerp(targetPosition, ease);
        controls.target.lerp(targetLook, ease);
        if (camera.position.distanceTo(targetPosition) < (p ? radius(p) * 0.005 : 0.005))
          flying = false;
      }
      selector.visible = !!p && cameraMode !== 'overview';
      if (p && selectedPosition) {
        selector.position.copy(selectedPosition);
        selector.scale.setScalar(radius(p) * 1.18);
        selector.quaternion.copy(camera.quaternion);
      }
      grid.visible = !!settings.overlays && cameraMode === 'overview';
      grid.position.copy(origin).negate();
      arrow.visible = !!settings.overlays && !!p;
      if (p && selectedPosition) {
        arrow.position.copy(selectedPosition);
        const next = new THREE.Vector3(
          ...renderPosition(ephemerisPosition(p.id, date + 3600000), settings.trueScale),
        ).sub(origin);
        arrow.setDirection(next.sub(selectedPosition).normalize());
        arrow.setLength(radius(p) * 3, radius(p) * 0.3, radius(p) * 0.15);
        apses.forEach((m, i) => {
          m.visible = !!settings.overlays;
          m.position
            .set(...renderPosition(orbitPosition(p, date, i * Math.PI), settings.trueScale))
            .sub(origin);
          m.scale.setScalar(radius(p) * 0.08);
        });
        const [, eccentricity, inclination, , perihelion, ascendingNode] = elementsAt(p, date);
        nodes.forEach((m, i) => {
          const f = ((ascendingNode - perihelion) * Math.PI) / 180 + i * Math.PI;
          const E = Math.atan2(
            Math.sqrt(1 - eccentricity ** 2) * Math.sin(f),
            eccentricity + Math.cos(f),
          );
          m.visible = !!settings.overlays && Math.abs(inclination) > 1e-4;
          m.position
            .set(...renderPosition(orbitPosition(p, date, E), settings.trueScale))
            .sub(origin);
          m.scale.setScalar(radius(p) * 0.12);
        });
      } else [...apses, ...nodes].forEach((m) => (m.visible = false));
      controls.update();
      sky.position.copy(camera.position);
      function label(id: string, object: THREE.Object3D, visible: boolean) {
        const element = labels.get(id);
        if (!element) return;
        const projected = object.position.clone().project(camera);
        element.style.display =
          settings.labels &&
          visible &&
          projected.z < 1 &&
          Math.abs(projected.x) < 0.96 &&
          Math.abs(projected.y) < 0.92
            ? 'block'
            : 'none';
        element.style.left = `${(projected.x * 0.5 + 0.5) * container.clientWidth}px`;
        element.style.top = `${(-projected.y * 0.5 + 0.5) * container.clientHeight + 18}px`;
      }
      planets.forEach((p) => {
        const g = meshes.get(p.id)!;
        label(p.id, g, g.visible && camera.position.distanceTo(g.position) > radius(p) * 12);
      });
      Object.entries(jovianMoons).forEach(([id, mesh]) => label(id, mesh, mesh.visible));
      renderer.render(scene, camera);
      if (renderer.info.render.calls > 0) renderer.domElement.dataset.rendered = 'true';
      performanceFrames++;
      if (now - performanceStart > 1000) {
        dispatchEvent(
          new CustomEvent('ass:performance', {
            detail: {
              fps: (performanceFrames * 1000) / (now - performanceStart),
              frameMs: (now - performanceStart) / performanceFrames,
              calls: renderer.info.render.calls,
              triangles: renderer.info.render.triangles,
              textures: renderer.info.memory.textures,
              geometries: renderer.info.memory.geometries,
            },
          }),
        );
        performanceFrames = 0;
        performanceStart = now;
      }
      if (now - lastSave > 1000) {
        try {
          localStorage.setItem(
            'ass-camera-current',
            JSON.stringify({
              position: camera.position.toArray(),
              target: controls.target.toArray(),
            }),
          );
        } catch {
          /* Storage may be disabled. */
        }
        lastSave = now;
      }
      if (!document.hidden) frame = requestAnimationFrame(render);
    }
    frame = requestAnimationFrame(render);
    const visibility = () => {
      cancelAnimationFrame(frame);
      if (!document.hidden) {
        prev = performance.now();
        frame = requestAnimationFrame(render);
      }
    };
    document.addEventListener('visibilitychange', visibility);
    const lost = (event: Event) => {
      event.preventDefault();
      setError('The graphics context was interrupted. Reload or choose Performance quality.');
    };
    renderer.domElement.addEventListener('webglcontextlost', lost);
    return () => {
      active = false;
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', visibility);
      removeEventListener('ass:capture', capture);
      removeEventListener('ass:restore-camera', restore);
      removeEventListener('ass:focus-moon', focusMoon);
      resize.disconnect();
      controls.dispose();
      scene.traverse((object) => {
        const m = object as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        if (m.material)
          (Array.isArray(m.material) ? m.material : [m.material]).forEach((material) =>
            material.dispose(),
          );
        if (m.customDepthMaterial) m.customDepthMaterial.dispose();
        if (m.customDistanceMaterial) m.customDistanceMaterial.dispose();
      });
      textures.forEach((t) => t.dispose());
      earthHigh?.dispose();
      closeSphere.dispose();
      renderer.dispose();
      container.replaceChildren();
    };
  }, [props.settings.quality]);
  return (
    <div className="scene" ref={host}>
      {error && (
        <div className="scene-error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <button className="scene-notice" role="status" onClick={() => setNotice('')}>
          {notice} · Dismiss
        </button>
      )}
    </div>
  );
}
