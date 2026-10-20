import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { planets, type Planet } from '../data/planets';
import { orbitPosition, renderPosition } from '../simulation/orbital';
export interface SceneSettings {
  orbits: boolean;
  labels: boolean;
  trueScale: boolean;
  quality: 'high' | 'low';
  reducedMotion: boolean;
}
interface Props {
  date: number;
  selected: string | null;
  cameraMode: string;
  cameraKey: number;
  settings: SceneSettings;
  onSelect: (id: string) => void;
}
export default function SolarScene(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const live = useRef(props);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
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
      });
    } catch {
      setError(
        '3D rendering is unavailable on this device. All planetary data and the other labs are still available.',
      );
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, props.settings.quality === 'high' ? 2 : 1));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    renderer.domElement.setAttribute(
      'aria-label',
      'Interactive 3D Solar System. Drag to orbit, scroll to zoom. Select planets using the object list.',
    );
    container.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(43, 1, 0.005, 3000);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.065;
    controls.minDistance = 0.2;
    controls.maxDistance = 900;
    controls.enablePan = true;
    const ambient = new THREE.AmbientLight('#b8c8e5', 0.13);
    scene.add(ambient);
    const sunlight = new THREE.PointLight('#fff1dd', 3.5, 0, 0);
    scene.add(sunlight);
    const loader = new THREE.TextureLoader();
    const textures: THREE.Texture[] = [];
    function texture(name: string) {
      const t = loader.load(`/textures/${name}`, undefined, undefined, () =>
        setNotice('Some textures could not load. Showing simplified materials.'),
      );
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = renderer.capabilities.getMaxAnisotropy();
      textures.push(t);
      return t;
    }
    const sphere = new THREE.SphereGeometry(1, props.settings.quality === 'high' ? 64 : 32, 32);
    const sun = new THREE.Mesh(
      sphere,
      new THREE.MeshBasicMaterial({ map: texture('sun.jpg'), color: '#fff1d4' }),
    );
    sun.scale.setScalar(1.6);
    scene.add(sun);
    // A soft sprite glow; decorative light emission, not a model of the corona.
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = 128;
    glowCanvas.height = 128;
    const cx = glowCanvas.getContext('2d')!;
    const gradient = cx.createRadialGradient(64, 64, 8, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(255,208,129,0.5)');
    gradient.addColorStop(0.3, 'rgba(255,166,61,0.13)');
    gradient.addColorStop(1, 'rgba(255,166,61,0)');
    cx.fillStyle = gradient;
    cx.fillRect(0, 0, 128, 128);
    const glowTex = new THREE.CanvasTexture(glowCanvas);
    textures.push(glowTex);
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    glow.scale.set(14, 14, 1);
    scene.add(glow);
    const stars = new Float32Array(props.settings.quality === 'high' ? 12000 : 3600);
    let seed = 4321;
    function random() {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    }
    for (let i = 0; i < stars.length; i += 3) {
      const theta = random() * Math.PI * 2,
        z = random() * 2 - 1,
        r = 700 + random() * 200;
      stars[i] = r * Math.sqrt(1 - z * z) * Math.cos(theta);
      stars[i + 1] = r * z;
      stars[i + 2] = r * Math.sqrt(1 - z * z) * Math.sin(theta);
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.BufferAttribute(stars, 3));
    scene.add(
      new THREE.Points(
        starGeometry,
        new THREE.PointsMaterial({
          color: '#c8d7ee',
          size: 0.7,
          sizeAttenuation: true,
          transparent: true,
          opacity: 0.8,
        }),
      ),
    );
    const meshes = new Map<string, THREE.Group>();
    const surfaces = new Map<string, THREE.Mesh>();
    const lines = new Map<string, THREE.LineLoop>();
    const labels = new Map<string, HTMLButtonElement>();
    const labelLayer = document.createElement('div');
    labelLayer.className = 'scene-labels';
    container.appendChild(labelLayer);
    planets.forEach((p) => {
      const group = new THREE.Group();
      scene.add(group);
      meshes.set(p.id, group);
      const tilt = new THREE.Group();
      tilt.rotation.z = (p.tilt * Math.PI) / 180;
      group.add(tilt);
      const material = new THREE.MeshStandardMaterial({
        map: texture(
          `${p.id === 'earth' ? 'earth_daymap' : p.id === 'venus' ? 'venus_atmosphere' : p.id}.jpg`,
        ),
        roughness: p.id === 'earth' ? 0.74 : 1,
        metalness: 0,
      });
      const surface = new THREE.Mesh(sphere, material);
      surface.scale.setScalar(p.size);
      surface.userData.id = p.id;
      tilt.add(surface);
      surfaces.set(p.id, surface);
      if (p.id === 'earth') {
        const cloud = new THREE.Mesh(
          sphere,
          new THREE.MeshStandardMaterial({
            map: texture('earth_clouds.jpg'),
            alphaMap: textures[textures.length - 1],
            transparent: true,
            opacity: 0.45,
            depthWrite: false,
          }),
        );
        cloud.scale.setScalar(p.size * 1.009);
        surface.add(cloud);
        cloud.scale.setScalar(1.009);
        // View-angle rim glow, an educational atmosphere approximation.
        const atmosphere = new THREE.Mesh(
          sphere,
          new THREE.ShaderMaterial({
            vertexShader:
              'varying vec3 n; varying vec3 v; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.); n=normalize(normalMatrix*normal); v=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }',
            fragmentShader:
              'varying vec3 n; varying vec3 v; void main(){float a=pow(1.-max(dot(normalize(n),normalize(v)),0.),3.5); gl_FragColor=vec4(.23,.55,1.,a*.55);}',
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          }),
        );
        atmosphere.scale.setScalar(p.size * 1.035);
        tilt.add(atmosphere);
      }
      if (p.id === 'saturn') {
        const ringGeometry = new THREE.RingGeometry(p.size * 1.25, p.size * 2.3, 128);
        const pos = ringGeometry.attributes.position,
          uv = ringGeometry.attributes.uv;
        for (let i = 0; i < pos.count; i++) {
          const r = Math.hypot(pos.getX(i), pos.getY(i));
          uv.setXY(i, (r - p.size * 1.25) / (p.size * 1.05), 0.5);
        }
        const ring = new THREE.Mesh(
          ringGeometry,
          new THREE.MeshStandardMaterial({
            map: texture('saturn_ring.png'),
            transparent: true,
            side: THREE.DoubleSide,
            opacity: 0.85,
            roughness: 1,
            depthWrite: false,
          }),
        );
        ring.rotation.x = -Math.PI / 2;
        tilt.add(ring);
      }
      const orbit = new THREE.LineLoop(
        new THREE.BufferGeometry(),
        new THREE.LineBasicMaterial({ color: p.color, transparent: true, opacity: 0.16 }),
      );
      scene.add(orbit);
      lines.set(p.id, orbit);
      const button = document.createElement('button');
      button.className = 'planet-label';
      button.textContent = p.name;
      button.onclick = () => live.current.onSelect(p.id);
      labelLayer.appendChild(button);
      labels.set(p.id, button);
    });
    const moon = new THREE.Mesh(
      sphere,
      new THREE.MeshStandardMaterial({ map: texture('moon.jpg'), roughness: 1 }),
    );
    moon.scale.setScalar(0.11);
    scene.add(moon);
    const selector = new THREE.Mesh(
      new THREE.RingGeometry(1, 1.012, 96),
      new THREE.MeshBasicMaterial({
        color: '#a9d4ff',
        transparent: true,
        opacity: 0.25,
        side: THREE.DoubleSide,
      }),
    );
    scene.add(selector);
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let downX = 0,
      downY = 0;
    function down(e: PointerEvent) {
      downX = e.clientX;
      downY = e.clientY;
    }
    function click(e: PointerEvent) {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 5) return;
      const b = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((e.clientX - b.left) / b.width) * 2 - 1,
        (-(e.clientY - b.top) / b.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects([...surfaces.values()], false)[0];
      if (hit) live.current.onSelect(hit.object.userData.id);
    }
    renderer.domElement.addEventListener('pointerdown', down);
    renderer.domElement.addEventListener('pointerup', click);
    let previousScale: boolean | undefined,
      previousDay = -1;
    let lastKey = -1,
      lastSelected: string | null | undefined;
    let lastMode = '';
    let flying = false;
    let follow = false;
    let userInteracting = false;
    const targetPosition = new THREE.Vector3(),
      targetLook = new THREE.Vector3();
    const lastFollow = new THREE.Vector3();
    controls.addEventListener('start', () => {
      flying = false;
      userInteracting = true;
    });
    controls.addEventListener('end', () => {
      userInteracting = false;
    });
    const resize = new ResizeObserver(() => {
      const w = container.clientWidth,
        h = container.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    resize.observe(container);
    let frame = 0;
    const projected = new THREE.Vector3();
    function render() {
      const { date, selected, settings, cameraKey, cameraMode } = live.current;
      const day = Math.floor(date / 86400000);
      if (settings.trueScale !== previousScale || day !== previousDay) {
        planets.forEach((p) => {
          const points = Array.from(
            { length: 257 },
            (_, i) =>
              new THREE.Vector3(
                ...renderPosition(
                  orbitPosition(p, date, (i / 256) * Math.PI * 2),
                  settings.trueScale,
                ),
              ),
          );
          const line = lines.get(p.id)!;
          line.geometry.dispose();
          line.geometry = new THREE.BufferGeometry().setFromPoints(points);
        });
        previousScale = settings.trueScale;
        previousDay = day;
      }
      planets.forEach((p) => {
        const g = meshes.get(p.id)!;
        g.position.set(...renderPosition(orbitPosition(p, date), settings.trueScale));
        g.visible = cameraMode === 'overview' || p.id === selected;
        surfaces.get(p.id)!.rotation.y = (date / 3600000 / p.rotation) * Math.PI * 2;
        lines.get(p.id)!.visible =
          settings.orbits && (cameraMode === 'overview' || p.id === selected);
      });
      sun.visible = cameraMode === 'overview';
      glow.visible = sun.visible;
      const earth = meshes.get('earth')!.position;
      const moonAngle = (date / 86400000 / 27.3217) * Math.PI * 2;
      moon.position.set(
        earth.x + 1.5 * Math.cos(moonAngle),
        earth.y + 0.13 * Math.sin(moonAngle),
        earth.z + 1.5 * Math.sin(moonAngle),
      );
      moon.visible = selected === 'earth';
      if (cameraKey !== lastKey || selected !== lastSelected || cameraMode !== lastMode) {
        const p = planets.find((p) => p.id === selected);
        targetLook.copy(p ? meshes.get(p.id)!.position : new THREE.Vector3());
        if (cameraMode === 'overview' || !p) {
          targetLook.set(0, 0, 0);
          targetPosition.set(12, 62, 76);
        } else if (cameraMode === 'top') {
          targetPosition.copy(targetLook).add(new THREE.Vector3(0, Math.max(p.size * 8, 5), 0.01));
        } else {
          const lightDirection = targetLook.clone().negate().normalize();
          const tangent = new THREE.Vector3(lightDirection.z, 0, -lightDirection.x).normalize();
          targetPosition
            .copy(targetLook)
            .addScaledVector(lightDirection, p.size * 4.8)
            .addScaledVector(tangent, p.size * 3.7)
            .add(new THREE.Vector3(0, p.size * 1.8, 0));
        }
        follow = cameraMode !== 'overview' && !!p;
        lastFollow.copy(targetLook);
        flying = true;
        if (lastKey === -1 || settings.reducedMotion) {
          camera.position.copy(targetPosition);
          controls.target.copy(targetLook);
          flying = false;
        }
        lastKey = cameraKey;
        lastSelected = selected;
        lastMode = cameraMode;
      }
      const p = planets.find((p) => p.id === selected);
      const selectedPosition = p ? meshes.get(p.id)!.position : null;
      if (follow && selectedPosition) {
        const shift = selectedPosition.clone().sub(lastFollow);
        camera.position.add(shift);
        controls.target.add(shift);
        targetPosition.add(shift);
        targetLook.copy(selectedPosition);
        lastFollow.copy(selectedPosition);
      }
      if (flying && !userInteracting) {
        camera.position.lerp(targetPosition, 0.065);
        controls.target.lerp(targetLook, 0.065);
        if (camera.position.distanceTo(targetPosition) < 0.005) flying = false;
      }
      if (selectedPosition && p) {
        selector.visible = true;
        selector.position.copy(selectedPosition);
        selector.scale.setScalar(p.size * 1.18);
        selector.quaternion.copy(camera.quaternion);
      } else selector.visible = false;
      controls.update();
      planets.forEach((p: Planet) => {
        const g = meshes.get(p.id)!;
        projected.copy(g.position).project(camera);
        const label = labels.get(p.id)!;
        const close = camera.position.distanceTo(g.position) < p.size * 12;
        label.style.display =
          settings.labels &&
          g.visible &&
          !close &&
          projected.z < 1 &&
          Math.abs(projected.x) < 0.95 &&
          Math.abs(projected.y) < 0.92
            ? 'block'
            : 'none';
        label.style.left = `${(projected.x * 0.5 + 0.5) * container.clientWidth}px`;
        label.style.top = `${(-projected.y * 0.5 + 0.5) * container.clientHeight + 18}px`;
        label.classList.toggle('selected', p.id === selected);
      });
      renderer.render(scene, camera);
      if (renderer.info.render.calls > 0) renderer.domElement.dataset.rendered = 'true';
      frame = requestAnimationFrame(render);
    }
    frame = requestAnimationFrame(render);
    const contextLost = (e: Event) => {
      e.preventDefault();
      setError(
        'The graphics context was interrupted. Reload the page or use a lower quality setting.',
      );
    };
    renderer.domElement.addEventListener('webglcontextlost', contextLost);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      controls.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        if (m.material) {
          const materials = Array.isArray(m.material) ? m.material : [m.material];
          materials.forEach((m) => m.dispose());
        }
      });
      textures.forEach((t) => t.dispose());
      renderer.dispose();
      container.replaceChildren();
    };
    // Rebuild GPU resources only when quality changes. Live controls are read from the ref.
  }, [props.settings.quality]);
  return (
    <div className="scene" ref={host}>
      {error && (
        <div className="scene-error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="scene-notice" role="status">
          {notice}
        </div>
      )}
    </div>
  );
}
