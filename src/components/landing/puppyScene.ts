// Scroll-driven 3D puppy for the landing page. Loaded with a dynamic import so
// three.js stays out of the main bundle.
//
// The puppy is five photos of the same dog (public/landing), each on a mesh
// sculpted by its own height map. Mirrored photos cover the other side, and the
// tail, head, legs and tongue are bent in the vertex shader. Rebuild the textures
// with scripts/landing/make_puppy_assets.py.
//
// The dog follows the scroll across the screen on a clock-driven walk: see the
// note above the first `scrollStage` call.
import * as THREE from 'three';
import { isPhone, poses, routeAt, scrollStage, spotAt } from './puppyPath';

type Vec = [number, number];
type Rig = {
  crop: [number, number, number, number];
  tail: [Vec, Vec, Vec];              // two points on the rump line, then the pivot
  head: [Vec, Vec, Vec, number];      // two points on the neck line, pivot, reach
  tongue: Vec;
  legs: [number, number, number, number][]; // centre x, hip y, half width, swing direction
};

const NO_LEG: [number, number, number, number] = [-9999, 0, 1, 0];

const RIGS: Record<string, Rig> = {
  front: {
    crop: [460, 40, 702, 910],
    tail: [[935, 300], [1020, 470], [950, 330]],
    head: [[520, 395], [860, 395], [690, 400], 340],
    tongue: [688, 330],
    legs: [[625, 640, 105, 1], [830, 640, 100, -1], [1000, 640, 70, -1], [750, 700, 45, 1]],
  },
  side: {
    crop: [148, 99, 1301, 825],
    tail: [[1090, 345], [1215, 530], [1105, 385]],
    head: [[290, 395], [560, 300], [480, 330], 370],
    tongue: [205, 338],
    legs: [[575, 630, 100, 1], [480, 640, 62, -1], [1175, 640, 100, -1], [1050, 650, 62, 1]],
  },
  back: {
    crop: [498, 38, 646, 902],
    tail: [[860, 310], [950, 510], [830, 410]],
    head: [[480, 250], [860, 250], [680, 262], 320],
    tongue: [-9999, 0],
    legs: [[650, 640, 105, 1], [910, 640, 100, -1], [590, 700, 45, -1], [812, 700, 45, 1]],
  },
  quarter: {
    crop: [478, 54, 772, 868],
    tail: [[1045, 262], [1178, 402], [1062, 288]],
    head: [[555, 405], [900, 280], [770, 372], 340],
    tongue: [566, 332],
    legs: [[850, 640, 112, 1], [690, 640, 78, -1], [1125, 620, 100, -1], [985, 625, 58, 1]],
  },
  top: {
    crop: [580, 8, 436, 955],
    tail: [[900, 770], [640, 770], [750, 770]],
    head: [[600, 300], [890, 300], [745, 305], 320],
    tongue: [-9999, 0],
    legs: [NO_LEG, NO_LEG, NO_LEG, NO_LEG],
  },
};

// The turntable, in yaw order. Mirrored photos make the dog's other side.
const TURNTABLE: { name: string; yaw: number; mirror: boolean }[] = [
  { name: 'back', yaw: -180, mirror: false },
  { name: 'side', yaw: -90, mirror: false },
  { name: 'quarter', yaw: -45, mirror: false },
  { name: 'front', yaw: 0, mirror: false },
  { name: 'quarter', yaw: 45, mirror: true },
  { name: 'side', yaw: 90, mirror: true },
];

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const clamp01 = (v: number) => clamp(v, 0, 1);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (a: number, b: number, v: number) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const D2R = Math.PI / 180;

function tubTexture(front: boolean) {
  const c = document.createElement('canvas');
  c.width = 1000;
  c.height = 520;
  const g = c.getContext('2d')!;
  if (!front) {
    g.fillStyle = '#A9DCCB';
    g.beginPath();
    g.ellipse(500, 150, 470, 92, 0, 0, Math.PI * 2);
    g.fill();
    return new THREE.CanvasTexture(c);
  }
  // Gold feet, white body, gold rim, then a line of foam over the rim.
  g.fillStyle = '#C8922F';
  for (const x of [230, 770]) {
    g.beginPath();
    g.ellipse(x, 470, 46, 34, 0, 0, Math.PI * 2);
    g.fill();
  }
  const body = g.createLinearGradient(0, 150, 0, 470);
  body.addColorStop(0, '#FFFFFF');
  body.addColorStop(1, '#CDE9DF');
  g.fillStyle = body;
  g.beginPath();
  g.moveTo(40, 170);
  g.bezierCurveTo(60, 400, 170, 470, 300, 470);
  g.lineTo(700, 470);
  g.bezierCurveTo(830, 470, 940, 400, 960, 170);
  g.closePath();
  g.fill();
  g.fillStyle = '#DDA94A';
  g.beginPath();
  g.roundRect(14, 142, 972, 40, 20);
  g.fill();
  for (let i = 0; i < 46; i++) {
    const x = 70 + (i * 860) / 45, r = 26 + ((i * 37) % 26);
    g.fillStyle = i % 3 ? '#FFFFFF' : '#EAF7F1';
    g.beginPath();
    g.arc(x, 130 - ((i * 53) % 24), r, 0, Math.PI * 2);
    g.fill();
  }
  return new THREE.CanvasTexture(c);
}
function shadowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(14,62,44,0.6)');
  grd.addColorStop(0.55, 'rgba(14,62,44,0.2)');
  grd.addColorStop(1, 'rgba(14,62,44,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

const VERT = /* glsl */`
  uniform sampler2D uDepth;
  uniform vec4 uCrop, uTailLine, uHeadLine, uLegs[4];
  uniform vec3 uTailPivot, uHeadPivot;
  uniform vec2 uTonguePos;
  uniform float uRelief, uTail, uHeadTurn, uHeadNod, uPant, uGait, uStride;
  varying vec2 vUv;
  varying mat3 vNormalMat;

  vec2 rot(vec2 p, vec2 c, float a) {
    float s = sin(a), k = cos(a);
    p -= c;
    return c + vec2(p.x * k - p.y * s, p.x * s + p.y * k);
  }
  // Signed pixel distance from the line a -> b; positive is "up" for a left-to-right line.
  float side(vec2 p, vec2 a, vec2 b) {
    vec2 d = normalize(b - a);
    return (p.x - a.x) * d.y - (p.y - a.y) * d.x;
  }
  float leg(vec2 p, vec4 L) {
    return smoothstep(L.y, L.y + 110.0, p.y) * smoothstep(L.z, L.z * 0.55, abs(p.x - L.x));
  }

  void main() {
    vUv = uv;
    vNormalMat = normalMatrix;
    vec2 p = uCrop.xy + vec2(uv.x, 1.0 - uv.y) * uCrop.zw;
    vec2 src = p;
    float z = texture2D(uDepth, uv).r * uRelief;

    float tail = smoothstep(-6.0, 34.0, side(src, uTailLine.xy, uTailLine.zw));
    tail *= smoothstep(10.0, 170.0, distance(src, uTailPivot.xy));
    p = rot(p, uTailPivot.xy, uTail * tail * 0.28);
    z += uTail * tail * 0.06;

    float head = smoothstep(-8.0, 60.0, side(src, uHeadLine.xy, uHeadLine.zw));
    head *= smoothstep(uHeadPivot.z, uHeadPivot.z * 0.82, distance(src, uHeadPivot.xy));
    p = rot(p, uHeadPivot.xy, uHeadNod * head);
    p.x += uHeadTurn * head * 22.0;

    float tongue = smoothstep(62.0, 18.0, distance(src, uTonguePos));
    p.y += uPant * tongue * 5.0;

    for (int i = 0; i < 4; i++) {
      if (uLegs[i].w == 0.0) continue;
      // Swing from the hip, and lift the paw on the way forward.
      float phase = uGait + (uLegs[i].w > 0.0 ? 0.0 : 3.14159);
      float w = leg(src, uLegs[i]);
      p = rot(p, uLegs[i].xy, sin(phase) * uStride * w);
      p.y -= max(0.0, cos(phase)) * uStride * w * 36.0;
    }

    vec2 mid = uCrop.xy + uCrop.zw * 0.5;
    vec3 pos = vec3((p.x - mid.x) / uCrop.w, -(p.y - mid.y) / uCrop.w, z);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const FRAG = /* glsl */`
  uniform sampler2D uMap, uDepth;
  uniform vec2 uTexel;
  uniform float uOpacity;
  varying vec2 vUv;
  varying mat3 vNormalMat;

  void main() {
    vec4 c = texture2D(uMap, vUv);
    if (c.a < 0.03) discard;
    // Light the relief so the fur turns with the model.
    float dx = texture2D(uDepth, vUv + vec2(uTexel.x, 0.0)).r - texture2D(uDepth, vUv - vec2(uTexel.x, 0.0)).r;
    float dy = texture2D(uDepth, vUv + vec2(0.0, uTexel.y)).r - texture2D(uDepth, vUv - vec2(0.0, uTexel.y)).r;
    vec3 n = normalize(vNormalMat * vec3(-dx * 7.0, -dy * 7.0, 1.0));
    float light = dot(n, normalize(vec3(0.25, 0.55, 0.8)));
    gl_FragColor = vec4(c.rgb * mix(0.84, 1.08, clamp(light, 0.0, 1.0)), c.a * uOpacity);
  }
`;

export async function createPuppyScene(canvas: HTMLCanvasElement, wraps: HTMLElement[], onWalked: (route: number) => void): Promise<() => void> {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  // The photos are already display-ready, so they bypass colour management.
  renderer.toneMapping = THREE.NoToneMapping;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 10);

  const shared = {
    uRelief: { value: 0.26 },
    uTail: { value: 0 },
    uHeadTurn: { value: 0 },
    uHeadNod: { value: 0 },
    uPant: { value: 0 },
    uGait: { value: 0 },
    uStride: { value: 0 },
  };

  const loader = new THREE.TextureLoader();
  const textures: THREE.Texture[] = [];
  const materials: Record<string, THREE.ShaderMaterial> = {};
  await Promise.all(Object.entries(RIGS).map(async ([name, rig]) => {
    const [map, depth] = await Promise.all([
      loader.loadAsync(`/landing/${name}.webp`),
      loader.loadAsync(`/landing/${name}-depth.png`),
    ]);
    map.colorSpace = depth.colorSpace = THREE.NoColorSpace;
    map.generateMipmaps = false;
    map.minFilter = THREE.LinearFilter;
    textures.push(map, depth);
    materials[name] = new THREE.ShaderMaterial({
      uniforms: {
        ...shared,
        uMap: { value: map },
        uDepth: { value: depth },
        uOpacity: { value: 1 },
        uTexel: { value: new THREE.Vector2(3 / depth.image.width, 3 / depth.image.height) },
        uCrop: { value: new THREE.Vector4(...rig.crop) },
        uTailLine: { value: new THREE.Vector4(...rig.tail[0], ...rig.tail[1]) },
        uTailPivot: { value: new THREE.Vector3(...rig.tail[2], 0) },
        uHeadLine: { value: new THREE.Vector4(...rig.head[0], ...rig.head[1]) },
        uHeadPivot: { value: new THREE.Vector3(...rig.head[2], rig.head[3]) },
        uTonguePos: { value: new THREE.Vector2(...rig.tongue) },
        uLegs: { value: rig.legs.map(l => new THREE.Vector4(...l)) },
      },
      vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, toneMapped: false, depthTest: false, depthWrite: false,
    });
  }));

  const geometry = new THREE.PlaneGeometry(1, 1, 110, 110);
  const makeMesh = (name: string, mirror: boolean) => {
    const material = mirror ? materials[name].clone() : materials[name];
    if (mirror) {
      // clone() deep-copies uniforms; keep the animated ones shared.
      Object.assign(material.uniforms, shared);
      material.uniforms.uMap.value = materials[name].uniforms.uMap.value;
      material.uniforms.uDepth.value = materials[name].uniforms.uDepth.value;
    }
    const mesh = new THREE.Mesh(geometry, material);
    const [, , w, h] = RIGS[name].crop;
    mesh.scale.x = mirror ? -1 : 1;
    mesh.frustumCulled = false;
    mesh.visible = false;
    mesh.userData = { aspect: w / h };
    return mesh;
  };

  // scene > flight (position, scale) > hop (bounce) > one mesh per view
  const flight = new THREE.Group();
  const hopper = new THREE.Group();
  flight.add(hopper);
  scene.add(flight);
  const views = TURNTABLE.map(v => {
    const mesh = makeMesh(v.name, v.mirror);
    // The shader sizes each photo to one unit tall; the pivot stands it on the floor.
    const pivot = new THREE.Group();
    pivot.position.y = 0.5;
    pivot.add(mesh);
    hopper.add(pivot);
    return { ...v, mesh, pivot };
  });

  // Top-down view for the tracking map, on its own so it can steer.
  const topMesh = makeMesh('top', false);
  topMesh.renderOrder = 3;
  const topPivot = new THREE.Group();
  topPivot.position.y = 0.5;
  topPivot.add(topMesh);
  flight.add(topPivot);

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 0.42),
    new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false, depthTest: false, toneMapped: false }),
  );
  shadow.rotation.x = -Math.PI / 2 + 0.35;
  shadow.position.set(0, 0.02, 0);
  shadow.renderOrder = -1;
  flight.add(shadow);

  const resize = () => {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  };
  resize();
  addEventListener('resize', resize);

  const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  const onMove = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return;
    mouse.x = (e.clientX / innerWidth) * 2 - 1;
    mouse.y = -((e.clientY / innerHeight) * 2 - 1);
  };
  addEventListener('pointermove', onMove, { passive: true });

  // The bathtub in the grooming chapter. It lives in the 3D scene so the dog can
  // stand between its back and front.
  const tubBack = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.78), new THREE.MeshBasicMaterial({ map: tubTexture(false), transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
  const tubFront = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.78), new THREE.MeshBasicMaterial({ map: tubTexture(true), transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
  tubBack.renderOrder = -2;
  tubFront.renderOrder = 5;
  const tub = new THREE.Group();
  tub.add(tubBack, tubFront);
  tub.visible = false;
  scene.add(tub);

  // Follows the scroll the whole way down: it strolls slowly through each pinned
  // section and walks on to the next, so there's no point where scrolling leaves it
  // standing. If the page stops mid-walk, it carries on the way it was heading.
  const stage0 = scrollStage(wraps);
  const startPose = poses()[stage0.i];
  const startSpot = spotAt(startPose, stage0.hold);
  let routeQ = startPose.map ? stage0.hold : 0;
  let walking = false;
  let lastY = scrollY;
  let lastMove = -1;
  let scrollDir = 1;
  const start0 = routeAt(routeQ);
  const cur = {
    x: startSpot.x, y: startSpot.y, s: startPose.s, yaw: startSpot.yaw, dir: 1,
    speed: 0, stride: 0, gait: 0, map: startPose.map ? 1 : 0,
    heading: Math.atan2(start0.dy * innerHeight, start0.dx * innerWidth) - Math.PI / 2,
  };
  const clock = new THREE.Clock();
  let raf = 0;

  const tick = () => {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    if (scrollY !== lastY) { scrollDir = scrollY > lastY ? 1 : -1; lastY = scrollY; lastMove = t; }
    const scrolling = t - lastMove < 0.35;

    const stage = scrollStage(wraps);
    const K = poses();
    const a = K[stage.i], b = K[Math.min(stage.i + 1, K.length - 1)];
    const pace = isPhone() ? 1.9 : 1.5;
    const px = cur.x, py = cur.y;

    // How far across to the next chapter's spot the page says the dog should be.
    const T = stage.walk;
    const across = T === 0 ? 0 : scrolling ? Math.min(1, T / 0.82) : scrollDir > 0 ? 1 : 0;
    const from = spotAt(a, stage.hold), to = spotAt(b, 0);
    // The stroll through a pinned section, drifting toward wherever it goes next.
    const stroll = (n: number, hold: number) => {
      const pose = K[n];
      if (pose.map || pose.stops) return 0;
      const here = pose.x, next = K[Math.min(n + 1, K.length - 1)], prev = K[Math.max(n - 1, 0)];
      const way = n === K.length - 1 ? Math.sign(here - spotAt(prev, 1).x) : Math.sign(spotAt(next, 0).x - here) || 1;
      const share = n === 0 ? hold : n === K.length - 1 ? hold - 1 : hold - 0.5;
      return share * way * (isPhone() ? 0.1 : 0.14);
    };
    const fromX = from.x + stroll(stage.i, stage.hold), toX = to.x + stroll(Math.min(stage.i + 1, K.length - 1), 0);
    const goalX = lerp(fromX, toX, across), goalY = lerp(from.y, to.y, across);
    const restYaw = (across > 0.5 ? to : from).yaw;
    const onRoute = a.map && T === 0;
    const atHome = b.map && across >= 1;

    // Tracking map: the dog and its gold line sit exactly on the scroll position.
    const routeGoal = onRoute ? stage.hold : atHome ? 0 : a.map ? 1 : b.map ? 0 : routeQ;
    routeQ = lerp(routeQ, routeGoal, 1 - Math.exp(-dt * 12));
    const dx = goalX - cur.x, dy = goalY - cur.y;
    const dist = Math.hypot(dx, dy);
    const wantMap = (onRoute || atHome) && (cur.map > 0.5 || dist < 0.05);
    cur.map = clamp01(cur.map + (wantMap ? dt : -dt) * 4.5);

    if (wantMap || cur.map > 0.02) {
      const r = routeAt(routeQ);
      const k = 1 - Math.exp(-dt * 16);
      cur.x = lerp(cur.x, r.x, k);
      cur.y = lerp(cur.y, r.y, k);
      cur.speed = Math.hypot(cur.x - px, cur.y - py) / Math.max(dt, 1e-3);
      walking = false;
      onWalked(routeQ);
    } else {
      if (dist > 0.012) walking = true;
      if (dist < 0.004 && !scrolling) walking = false;
      if (walking && Math.abs(dx) > 0.012) cur.dir = dx > 0 ? 1 : -1;
      const goal = walking ? Math.min(pace, dist * 2.4 + 0.02) : 0;
      cur.speed = lerp(cur.speed, goal * (walking ? smooth(95, 40, Math.abs(cur.yaw - cur.dir * 90)) : 1), 1 - Math.exp(-dt * 7));
      if (dist > 1e-4) {
        const move = Math.min(cur.speed * dt, dist);
        cur.x += (dx / dist) * move;
        cur.y += (dy / dist) * move;
      }
    }

    // Face the way it's going, and turn to the reader on arrival.
    const yawGoal = walking ? cur.dir * 90 : cur.map ? cur.yaw : restYaw;
    cur.yaw = clamp(lerp(cur.yaw, yawGoal, 1 - Math.exp(-dt * 5)), -180, 90);
    const sGoal = cur.map > 0.5 || wantMap ? (a.map ? a : b).s : lerp(a.map ? b.s : a.s, b.map ? a.s : b.s, across);
    cur.s = lerp(cur.s, sGoal * (1 - 0.08 * cur.stride * (1 - cur.map)), 1 - Math.exp(-dt * 4));

    const km = 1 - Math.exp(-dt * 2.5);
    mouse.sx = lerp(mouse.sx, mouse.x, km);
    mouse.sy = lerp(mouse.sy, mouse.y, km);

    const halfH = Math.tan((camera.fov * D2R) / 2) * camera.position.z;
    const halfW = halfH * camera.aspect;
    // Sized by whichever side of the screen is tighter, so phones fit too.
    const fit = Math.min(halfH * 1.16, halfW * 1.5);
    const base = fit * cur.s;

    // The tub rides up and down with its section; the dog climbs over its rim.
    const groomAt = K.findIndex(p => p.stops);
    const groomStop = K[groomAt].stops!.find(s => s.tub)!;
    const groomTop = (wraps[groomAt].firstElementChild as HTMLElement).getBoundingClientRect().top;
    tub.visible = Math.abs(groomTop) < innerHeight;
    const tubBase = fit * K[groomAt].s;
    tub.position.set(groomStop.x * halfW, groomStop.y * halfH - tubBase * 0.26 + (groomTop / innerHeight) * 2 * halfH, 0);
    tub.scale.setScalar(tubBase);
    const nearRim = Math.abs(Math.abs(cur.x - groomStop.x) * halfW / tubBase - 0.72);
    const climb = tub.visible && !cur.map ? Math.exp(-nearRim * nearRim * 30) * 0.09 * tubBase : 0;

    flight.scale.setScalar(base);
    flight.position.set(cur.x * halfW, cur.y * halfH - base / 2 + climb, 0);

    // Steps follow the distance covered, so the paws don't slide along the floor.
    const moved = Math.hypot((cur.x - px) * halfW, (cur.y - py) * halfH) / base;
    cur.gait += (moved / 0.85) * Math.PI * 2;
    cur.stride = lerp(cur.stride, clamp01(cur.speed / (pace * 0.14)), 1 - Math.exp(-dt * 7));

    if (cur.map > 0 && moved > 2e-4) {
      const aim = Math.atan2((cur.y - py) * innerHeight, (cur.x - px) * innerWidth) - Math.PI / 2;
      const turn = Math.atan2(Math.sin(aim - cur.heading), Math.cos(aim - cur.heading));
      cur.heading += turn * (1 - Math.exp(-dt * 8));
    }

    // Find the two views either side of the current yaw. They rotate together and
    // share one width, so their outlines line up while the fade between them runs.
    let n = 0;
    while (n < views.length - 2 && cur.yaw >= views[n + 1].yaw) n++;
    const va = views[n], vb = views[n + 1];
    const u = (cur.yaw - va.yaw) / (vb.yaw - va.yaw);
    const f = smooth(0.2, 0.8, u);
    const width = lerp(va.mesh.userData.aspect, vb.mesh.userData.aspect, smooth(0, 1, u));
    const standing = 1 - cur.map;
    const idle = (1 - cur.stride) * standing;
    const sway = (mouse.sx * 14 + Math.sin(t * 0.7) * 3) * idle;
    for (const v of views) {
      // The incoming view firms up early and the outgoing one fades over it, so the dog never goes see-through.
      const fade = v === va ? 1 - f : v === vb ? Math.min(1, f * 3) : 0;
      v.mesh.visible = fade > 0.005 && standing > 0.01;
      if (!v.mesh.visible) continue;
      (v.mesh.material as THREE.ShaderMaterial).uniforms.uOpacity.value = fade * standing;
      v.mesh.renderOrder = v === va ? 2 : 1;
      v.mesh.scale.x = ((v.mirror ? -1 : 1) * width) / v.mesh.userData.aspect;
      v.pivot.rotation.y = ((cur.yaw - v.yaw) * 0.35 + sway) * D2R;
    }

    topMesh.visible = cur.map > 0.01;
    topPivot.rotation.z = cur.heading + Math.sin(cur.gait) * 0.05 * Math.min(1, cur.speed * 4) * cur.map;
    topMesh.scale.setScalar(1.5);
    (topMesh.material as THREE.ShaderMaterial).uniforms.uOpacity.value = cur.map;

    // Wriggles in the bath while the page passes the tub.
    const tubTime = tub.visible && !cur.map && Math.abs(cur.x - groomStop.x) * halfW < tubBase * 0.3;
    hopper.position.y = Math.abs(Math.sin(cur.gait)) * 0.016 * cur.stride;
    hopper.rotation.z = Math.sin(cur.gait * 2) * 0.008 * cur.stride + (tubTime ? Math.sin(t * 7) * 0.025 : 0);
    hopper.scale.y = 1 + Math.sin(t * 2.6) * 0.005 * (1 - cur.stride);

    const inTub = tub.visible && Math.abs(cur.x - groomStop.x) * halfW < tubBase * 0.72;
    shadow.visible = standing > 0.01 && !inTub;
    shadow.scale.set(width * 0.8 + 0.2, 1, 1);
    (shadow.material as THREE.MeshBasicMaterial).opacity = standing;

    shared.uGait.value = cur.gait;
    shared.uStride.value = 0.3 * cur.stride;
    shared.uTail.value = Math.sin(t * (10 - 4 * cur.stride)) * (1 - 0.45 * cur.stride);
    shared.uPant.value = Math.sin(t * 8.5);
    shared.uHeadNod.value = (Math.sin(t * 1.1) * 0.03 - mouse.sy * 0.07) * idle + Math.sin(cur.gait * 2) * 0.018 * cur.stride;
    shared.uHeadTurn.value = (Math.sin(t * 0.8) * 0.12 + mouse.sx * 0.45) * idle;

    renderer.render(scene, camera);
  };
  tick();

  return () => {
    cancelAnimationFrame(raf);
    removeEventListener('resize', resize);
    removeEventListener('pointermove', onMove);
    geometry.dispose();
    Object.values(materials).forEach(m => m.dispose());
    textures.forEach(tex => tex.dispose());
    renderer.dispose();
  };
}
