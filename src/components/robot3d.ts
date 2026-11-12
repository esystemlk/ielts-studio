import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/**
 * Bolt in 3D: a small jointed robot (hips, knees, shoulders, elbows, neck) built from
 * rounded primitives, animated in code. Loaded only when he first appears.
 */
export type Mode = 'walk' | 'idle' | 'wave';
export type Facing = 'front' | 'left' | 'right';
export interface Bot { set(mode: Mode, facing: Facing): void; look(x: number, y: number): void; hop(): void; dispose(): void }

const WHITE = new THREE.MeshStandardMaterial({ color: 0xf7f7f5, roughness: 0.32, metalness: 0.05 });
const DARK = new THREE.MeshStandardMaterial({ color: 0x161616, roughness: 0.45, metalness: 0.3 });
const VISOR = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.08, metalness: 0.6 });
const RED = new THREE.MeshStandardMaterial({ color: 0xd0101b, roughness: 0.3, emissive: 0xd0101b, emissiveIntensity: 0.55 });
const EYE = new THREE.MeshBasicMaterial({ color: 0xffffff });

const mesh = (g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); return o; };
const joint = (parent: THREE.Object3D, x: number, y: number, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };

function limb(parent: THREE.Object3D, x: number, y: number, r: number, len: number, end: 'hand' | 'foot') {
  const top = joint(parent, x, y);
  top.add(mesh(new THREE.CapsuleGeometry(r, len, 6, 12), DARK, 0, -len / 2 - r * 0.4));
  const mid = joint(top, 0, -len - r * 0.9);
  mid.add(mesh(new THREE.SphereGeometry(r * 1.05, 16, 12), WHITE)); // knee / elbow cap
  mid.add(mesh(new THREE.CapsuleGeometry(r * 0.92, len * 0.9, 6, 12), DARK, 0, -len / 2 - r * 0.3));
  if (end === 'foot') mid.add(mesh(new RoundedBoxGeometry(0.34, 0.16, 0.5, 3, 0.07), WHITE, 0, -len - r * 1.2, 0.08));
  else mid.add(mesh(new THREE.SphereGeometry(r * 1.25, 16, 12), WHITE, 0, -len - r * 0.6));
  return { top, mid };
}

export function createBot(canvas: HTMLCanvasElement): Bot {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(3, 5, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0xff4d55, 0.9); rim.position.set(-4, 3, -3); scene.add(rim);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x404040, 0.5));

  const camera = new THREE.PerspectiveCamera(30, canvas.clientWidth / canvas.clientHeight, 0.1, 50);
  camera.position.set(0, 1.75, 8.4);
  camera.lookAt(0, 1.6, 0);

  // Soft round contact shadow under the feet.
  const sc = document.createElement('canvas'); sc.width = sc.height = 64;
  const sx = sc.getContext('2d')!; const grad = sx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(0,0,0,.45)'); grad.addColorStop(1, 'rgba(0,0,0,0)'); sx.fillStyle = grad; sx.fillRect(0, 0, 64, 64);
  const shadow = mesh(new THREE.PlaneGeometry(1.7, 1.1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.01; scene.add(shadow);

  // ---- Model ----
  const root = new THREE.Group(); scene.add(root);
  const body = joint(root, 0, 1.12); // pelvis: everything above the hips hangs off this
  body.add(mesh(new RoundedBoxGeometry(0.8, 0.22, 0.6, 3, 0.1), DARK, 0, 0.02));
  const torso = joint(body, 0, 0.1);
  torso.add(mesh(new RoundedBoxGeometry(1.15, 0.9, 0.8, 4, 0.26), WHITE, 0, 0.45));
  const heart = mesh(new THREE.SphereGeometry(0.11, 16, 12), RED, 0, 0.5, 0.41); heart.scale.set(1, 1, 0.45); torso.add(heart);
  torso.add(mesh(new THREE.TorusGeometry(0.17, 0.025, 8, 24), DARK, 0, 0.5, 0.4));

  const neck = joint(torso, 0, 0.92);
  neck.add(mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.14, 16), DARK, 0, 0.04));
  const head = joint(neck, 0, 0.1);
  head.add(mesh(new RoundedBoxGeometry(1.5, 1.04, 1.1, 5, 0.32), WHITE, 0, 0.52));
  head.add(mesh(new RoundedBoxGeometry(1.2, 0.64, 0.12, 4, 0.06), VISOR, 0, 0.53, 0.52));
  const eyes = joint(head, 0, 0.53, 0.59);
  const eyeGeo = new THREE.CapsuleGeometry(0.075, 0.12, 4, 10);
  const eyeL = mesh(eyeGeo, EYE, -0.24, 0); const eyeR = mesh(eyeGeo, EYE, 0.24, 0); eyes.add(eyeL, eyeR);
  for (const s of [-1, 1]) {
    const ear = mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.1, 20), RED, s * 0.78, 0.55); ear.rotation.z = Math.PI / 2; head.add(ear);
    head.add(mesh(new THREE.SphereGeometry(0.06, 12, 8), new THREE.MeshBasicMaterial({ color: 0xff4d55, transparent: true, opacity: 0.55 }), s * 0.48, 0.18, 0.56));
  }
  head.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.34, 8), DARK, 0, 1.18));
  const bulb = mesh(new THREE.SphereGeometry(0.1, 16, 12), RED, 0, 1.38); head.add(bulb);

  const armL = limb(torso, -0.7, 0.78, 0.11, 0.28, 'hand');
  const armR = limb(torso, 0.7, 0.78, 0.11, 0.28, 'hand');
  const legL = limb(body, -0.24, -0.05, 0.13, 0.3, 'foot');
  const legR = limb(body, 0.24, -0.05, 0.13, 0.3, 'foot');

  // ---- Animation ----
  let mode: Mode = 'idle', facing: Facing = 'front', lookX = 0, lookY = 0, hopT = -1;
  let phase = 0, raf = 0, last = performance.now(), blinkAt = 1.5, walkMix = 0, waveMix = 0;
  const yawFor = { front: 0, right: Math.PI / 2, left: -Math.PI / 2 };
  const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const t = now / 1000;
    const k = 1 - Math.pow(0.001, dt); // frame-rate independent easing
    walkMix = lerp(walkMix, mode === 'walk' ? 1 : 0, k * 0.9);
    waveMix = lerp(waveMix, mode === 'wave' ? 1 : 0, k * 0.7);
    phase += dt * (Math.PI * 2 / 0.9) * walkMix;
    const s = Math.sin(phase), c = Math.cos(phase);

    root.rotation.y = lerp(root.rotation.y, yawFor[facing], k * 0.6);

    // Legs: hip swing; knee bends only while that leg swings forward.
    legL.top.rotation.x = -0.55 * s * walkMix;
    legR.top.rotation.x = 0.55 * s * walkMix;
    legL.mid.rotation.x = 1.0 * Math.pow(Math.max(0, c), 1.5) * walkMix;
    legR.mid.rotation.x = 1.0 * Math.pow(Math.max(0, -c), 1.5) * walkMix;
    // Body: dips at each footfall, rises mid-stance, leans forward, hips sway.
    body.position.y = 1.12 + 0.07 * Math.abs(c) * walkMix - 0.04 * walkMix + Math.sin(t * 2.2) * 0.012 * (1 - walkMix);
    torso.rotation.x = 0.1 * walkMix;
    torso.rotation.z = 0.05 * s * walkMix;
    torso.rotation.y = -0.08 * s * walkMix;
    // Arms swing against the legs; idle arms hang with a slight breathing sway.
    armL.top.rotation.x = 0.5 * s * walkMix;
    armL.mid.rotation.x = -0.35 - 0.3 * Math.max(0, s) * walkMix;
    armL.top.rotation.z = -0.12;
    const wave = Math.sin(t * 9);
    armR.top.rotation.x = lerp(-0.5 * s * walkMix, 0, waveMix);
    armR.top.rotation.z = lerp(0.12, 2.55, waveMix);
    armR.mid.rotation.x = lerp(-0.35 - 0.3 * Math.max(0, -s) * walkMix, 0, waveMix);
    armR.mid.rotation.z = lerp(0, 0.45 * wave, waveMix);
    // Head: counter-bob while walking, follows the cursor, tilts while waving.
    head.rotation.y = lerp(head.rotation.y, lookX * 0.55, k * 0.5);
    head.rotation.x = lerp(head.rotation.x, lookY * 0.3 - 0.06 * walkMix * c, k * 0.5);
    head.rotation.z = 0.12 * Math.sin(t * 2.6) * waveMix - 0.03 * s * walkMix;
    eyes.position.x = lookX * 0.06; eyes.position.y = 0.53 - lookY * 0.04;
    // Blink every few seconds.
    blinkAt -= dt; const blink = blinkAt < 0.12 && blinkAt > 0 ? 0.15 : 1;
    if (blinkAt <= 0) blinkAt = 2.5 + Math.random() * 3;
    eyeL.scale.y = eyeR.scale.y = blink;
    // Antenna light and heart pulse.
    (bulb.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5 + 0.5 * (0.5 + 0.5 * Math.sin(t * 4));
    heart.scale.setScalar(1 + 0.12 * Math.max(0, Math.sin(t * 5.2))); heart.scale.z = 0.45;
    // Hop when clicked.
    if (hopT >= 0) { hopT += dt; root.position.y = Math.max(0, Math.sin(Math.min(1, hopT / 0.45) * Math.PI)) * 0.45; if (hopT > 0.45) { hopT = -1; root.position.y = 0; } }
    shadow.scale.setScalar(1 - root.position.y * 0.6 - 0.08 * Math.abs(c) * walkMix);

    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  return {
    set(m, f) { mode = m; facing = f; },
    look(x, y) { lookX = Math.max(-1, Math.min(1, x)); lookY = Math.max(-1, Math.min(1, y)); },
    hop() { hopT = 0; },
    dispose() {
      cancelAnimationFrame(raf);
      scene.traverse(o => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); const m = o.material as THREE.Material; if (![WHITE, DARK, VISOR, RED, EYE].includes(m as THREE.MeshStandardMaterial)) m.dispose(); } });
      scene.environment?.dispose(); pmrem.dispose(); renderer.dispose();
    },
  };
}
