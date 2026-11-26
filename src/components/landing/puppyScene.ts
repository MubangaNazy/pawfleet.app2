// Scroll-driven 3D puppy for the landing page. Loaded with a dynamic import so
// three.js stays out of the main bundle.
//
// The puppy is five photos of the same dog (public/landing), each on a mesh
// sculpted by its own height map. Mirrored photos cover the other side, and the
// tail, head, legs and tongue are bent in the vertex shader. Rebuild the textures
// with scripts/landing/make_puppy_assets.py.
//
// How it moves lives in puppyWalker, shared with the phone version in puppySprite.
import * as THREE from 'three';
import { isPhone, poses } from './puppyPath';
import { TURNTABLE, createWalker, lerp, viewsAt } from './puppyWalker';

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

const D2R = Math.PI / 180;

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
    #ifdef LITE
    float z = 0.0;
    #else
    float z = texture2D(uDepth, uv).r * uRelief;
    #endif

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
    #ifdef LITE
    gl_FragColor = vec4(c.rgb, c.a * uOpacity);
    #else
    // Light the relief so the fur turns with the model.
    float dx = texture2D(uDepth, vUv + vec2(uTexel.x, 0.0)).r - texture2D(uDepth, vUv - vec2(uTexel.x, 0.0)).r;
    float dy = texture2D(uDepth, vUv + vec2(0.0, uTexel.y)).r - texture2D(uDepth, vUv - vec2(0.0, uTexel.y)).r;
    vec3 n = normalize(vNormalMat * vec3(-dx * 7.0, -dy * 7.0, 1.0));
    float light = dot(n, normalize(vec3(0.25, 0.55, 0.8)));
    gl_FragColor = vec4(c.rgb * mix(0.84, 1.08, clamp(light, 0.0, 1.0)), c.a * uOpacity);
    #endif
  }
`;

export async function createPuppyScene(canvas: HTMLCanvasElement, wraps: HTMLElement[], onWalked: (route: number) => void): Promise<() => void> {
  // Phones and slower machines get smaller photos, a coarser mesh and no relief.
  const lite = isPhone() || (navigator.hardwareConcurrency ?? 8) <= 4;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lite, alpha: true, powerPreference: 'high-performance' });
  let pixelRatio = Math.min(devicePixelRatio, lite ? 1.25 : 1.75);
  renderer.setPixelRatio(pixelRatio);
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
      loader.loadAsync(`/landing/${name}${lite ? '-sm' : ''}.webp`),
      lite ? null : loader.loadAsync(`/landing/${name}-depth.png`),
    ]);
    map.colorSpace = THREE.NoColorSpace;
    map.generateMipmaps = false;
    map.minFilter = THREE.LinearFilter;
    textures.push(map);
    if (depth) {
      depth.colorSpace = THREE.NoColorSpace;
      textures.push(depth);
    }
    materials[name] = new THREE.ShaderMaterial({
      uniforms: {
        ...shared,
        uMap: { value: map },
        uDepth: { value: depth },
        uOpacity: { value: 1 },
        uTexel: { value: depth ? new THREE.Vector2(3 / depth.image.width, 3 / depth.image.height) : new THREE.Vector2() },
        uCrop: { value: new THREE.Vector4(...rig.crop) },
        uTailLine: { value: new THREE.Vector4(...rig.tail[0], ...rig.tail[1]) },
        uTailPivot: { value: new THREE.Vector3(...rig.tail[2], 0) },
        uHeadLine: { value: new THREE.Vector4(...rig.head[0], ...rig.head[1]) },
        uHeadPivot: { value: new THREE.Vector3(...rig.head[2], rig.head[3]) },
        uTonguePos: { value: new THREE.Vector2(...rig.tongue) },
        uLegs: { value: rig.legs.map(l => new THREE.Vector4(...l)) },
      },
      defines: lite ? { LITE: 1 } : {},
      vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, toneMapped: false, depthTest: false, depthWrite: false,
    });
  }));

  const geometry = new THREE.PlaneGeometry(1, 1, lite ? 48 : 110, lite ? 48 : 110);
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

  // The canvas is only a box around the dog, slid across the page with a CSS
  // transform, so the phone isn't redrawing the whole screen for one small dog.
  const halfHeight = Math.tan((camera.fov * D2R) / 2) * camera.position.z;
  const box = { w: 0, h: 0 };
  const resize = () => {
    camera.aspect = innerWidth / innerHeight;
    const fit = Math.min(halfHeight * 1.16, halfHeight * camera.aspect * 1.5);
    const tallest = fit * Math.max(...poses().map(p => p.s)) * (innerHeight / (2 * halfHeight));
    const w = Math.ceil(tallest * 2.1), h = Math.ceil(tallest * 1.5);
    // Phone address bars resize the page while scrolling: only touch the canvas if the box changed.
    if (w !== box.w || h !== box.h) {
      box.w = w;
      box.h = h;
      renderer.setSize(w, h, false);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    }
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

  const walker = createWalker(wraps, onWalked, canvas);
  const { cur } = walker;
  const clock = new THREE.Clock();
  let raf = 0;
  let frame = 0;
  let slowTime = 0;

  const tick = () => {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    const { base, climb, halfW, halfH, walking, scrolling, inTub, wriggle } = walker.step(dt, t);

    const km = 1 - Math.exp(-dt * 2.5);
    mouse.sx = lerp(mouse.sx, mouse.x, km);
    mouse.sy = lerp(mouse.sy, mouse.y, km);

    flight.scale.setScalar(base);
    flight.position.set(cur.x * halfW, cur.y * halfH - base / 2 + climb, 0);

    const { a: from, b: to, f, width } = viewsAt(cur.yaw);
    const va = views[TURNTABLE.indexOf(from)], vb = views[TURNTABLE.indexOf(to)];
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
    hopper.position.y = Math.abs(Math.sin(cur.gait)) * 0.016 * cur.stride;
    hopper.rotation.z = Math.sin(cur.gait * 2) * 0.008 * cur.stride + (wriggle ? Math.sin(t * 7) * 0.025 : 0);
    hopper.scale.y = 1 + Math.sin(t * 2.6) * 0.005 * (1 - cur.stride);

    shadow.visible = standing > 0.01 && !inTub;
    shadow.scale.set(width * 0.8 + 0.2, 1, 1);
    (shadow.material as THREE.MeshBasicMaterial).opacity = standing;

    shared.uGait.value = cur.gait;
    shared.uStride.value = 0.3 * cur.stride;
    shared.uTail.value = Math.sin(t * (10 - 4 * cur.stride)) * (1 - 0.45 * cur.stride);
    shared.uPant.value = Math.sin(t * 8.5);
    shared.uHeadNod.value = (Math.sin(t * 1.1) * 0.03 - mouse.sy * 0.07) * idle + Math.sin(cur.gait * 2) * 0.018 * cur.stride;
    shared.uHeadTurn.value = (Math.sin(t * 0.8) * 0.12 + mouse.sx * 0.45) * idle;

    // Slide the box to the dog and draw just that part of the view.
    const boxX = Math.round(((1 + cur.x) / 2) * innerWidth - box.w / 2);
    const boxY = Math.round(((1 - cur.y) / 2) * innerHeight - box.h / 2);
    canvas.style.transform = `translate3d(${boxX}px,${boxY}px,0)`;

    // Waiting dogs only need half the frames; if it still struggles, soften the image once.
    frame++;
    if (lite && !walking && !scrolling && cur.map === 0 && frame % 2) return;
    slowTime += dt;
    if (frame % 90 === 0) {
      if (slowTime / 90 > 0.03 && pixelRatio > 1) {
        pixelRatio = 1;
        renderer.setPixelRatio(1);
      }
      slowTime = 0;
    }
    camera.setViewOffset(innerWidth, innerHeight, boxX, boxY, box.w, box.h);
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
    walker.dispose();
    renderer.dispose();
  };
}
