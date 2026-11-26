// How the landing puppy moves: where it should be for the current scroll position
// and how it gets there. Shared by the two ways of drawing it, puppyScene (3D, for
// desktops) and puppySprite (pre-rendered frames, for phones). No three.js here.
//
// It follows the scroll the whole way down: it strolls slowly through each pinned
// section and walks on to the next, so there's no point where scrolling leaves it
// standing. If the page stops mid-walk, it carries on the way it was heading.
import { isPhone, poses, routeAt, scrollStage, scrolled, sectionTop, spotAt } from './puppyPath';

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const clamp01 = (v: number) => clamp(v, 0, 1);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (a: number, b: number, v: number) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };

// World units of the 3D view (30 degree camera, 10 units back), kept by the phone
// version too so both draw the dog at the same size.
const HALF_H = Math.tan((15 * Math.PI) / 180) * 10;

// The turntable, in yaw order. Mirrored photos make the dog's other side.
export const ASPECT: Record<string, number> = { front: 702 / 910, side: 1301 / 825, back: 646 / 902, quarter: 772 / 868, top: 436 / 955 };
export const TURNTABLE: { name: string; yaw: number; mirror: boolean }[] = [
  { name: 'back', yaw: -180, mirror: false },
  { name: 'side', yaw: -90, mirror: false },
  { name: 'quarter', yaw: -45, mirror: false },
  { name: 'front', yaw: 0, mirror: false },
  { name: 'quarter', yaw: 45, mirror: true },
  { name: 'side', yaw: 90, mirror: true },
];

/** The two views either side of a yaw. They share one width, so their outlines line up while they fade. */
export function viewsAt(yaw: number) {
  let n = 0;
  while (n < TURNTABLE.length - 2 && yaw >= TURNTABLE[n + 1].yaw) n++;
  const a = TURNTABLE[n], b = TURNTABLE[n + 1];
  const u = (yaw - a.yaw) / (b.yaw - a.yaw);
  const f = smooth(0.2, 0.8, u);
  return { a, b, f, width: lerp(ASPECT[a.name], ASPECT[b.name], smooth(0, 1, u)) };
}

function tubCanvas(front: boolean) {
  const c = document.createElement('canvas');
  c.width = 1000;
  c.height = 520;
  const g = c.getContext('2d')!;
  if (!front) {
    g.fillStyle = '#A9DCCB';
    g.beginPath();
    g.ellipse(500, 150, 470, 92, 0, 0, Math.PI * 2);
    g.fill();
    return c;
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
  return c;
}

export function createWalker(wraps: HTMLElement[], onWalked: (route: number) => void, anchor: Element) {
  // The bathtub in the grooming chapter: two page layers either side of the dog,
  // so it can stand between the tub's back and front.
  const tubLayers = [tubCanvas(false), tubCanvas(true)];
  tubLayers.forEach((layer, i) => {
    layer.style.cssText = `position:fixed;left:0;top:0;z-index:${i ? 21 : 19};display:none;pointer-events:none;will-change:transform`;
    anchor.after(layer);
  });
  let tubShown = false;

  const stage0 = scrollStage(wraps);
  const startPose = poses()[stage0.i];
  const startSpot = spotAt(startPose, stage0.hold);
  let routeQ = startPose.map ? stage0.hold : 0;
  let walking = false;
  let lastY = scrolled();
  let lastMove = -1;
  let scrollDir = 1;
  const start0 = routeAt(routeQ);
  const cur = {
    x: startSpot.x, y: startSpot.y, s: startPose.s, yaw: startSpot.yaw, dir: 1,
    speed: 0, stride: 0, gait: 0, map: startPose.map ? 1 : 0,
    heading: Math.atan2(start0.dy * innerHeight, start0.dx * innerWidth) - Math.PI / 2,
  };

  // The stroll through a pinned section, drifting toward wherever it goes next.
  const stroll = (n: number, hold: number) => {
    const K = poses();
    const pose = K[n];
    if (pose.map || pose.stops) return 0;
    const next = K[Math.min(n + 1, K.length - 1)], prev = K[Math.max(n - 1, 0)];
    const way = n === K.length - 1 ? Math.sign(pose.x - spotAt(prev, 1).x) : Math.sign(spotAt(next, 0).x - pose.x) || 1;
    const share = n === 0 ? hold : n === K.length - 1 ? hold - 1 : hold - 0.5;
    return share * way * (isPhone() ? 0.1 : 0.14);
  };

  const step = (dt: number, t: number) => {
    const pageY = scrolled();
    if (pageY !== lastY) { scrollDir = pageY > lastY ? 1 : -1; lastY = pageY; lastMove = t; }
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

    // Face the way it's going, and turn to the reader on arrival. Snapping to the side
    // view fast while walking matters more than it looks: the quarter/front/back sprites
    // have no leg-bend frames (only the side one does), so lingering mid-turn crossfades
    // a walking, animated-legged side view against a static-legged standing one — the
    // "pieces not all together" look. A quick turn hides that blend instead of holding it.
    const yawGoal = walking ? cur.dir * 90 : cur.map ? cur.yaw : restYaw;
    cur.yaw = clamp(lerp(cur.yaw, yawGoal, 1 - Math.exp(-dt * (walking ? 22 : 5))), -180, 90);
    const sGoal = cur.map > 0.5 || wantMap ? (a.map ? a : b).s : lerp(a.map ? b.s : a.s, b.map ? a.s : b.s, across);
    cur.s = lerp(cur.s, sGoal * (1 - 0.08 * cur.stride * (1 - cur.map)), 1 - Math.exp(-dt * 4));

    const halfH = HALF_H;
    const halfW = halfH * (innerWidth / innerHeight);
    // Sized by whichever side of the screen is tighter, so phones fit too.
    const fit = Math.min(halfH * 1.16, halfW * 1.5);
    const base = fit * cur.s;
    const perWorld = innerHeight / (2 * halfH);

    // The tub rides up and down with its section; the dog climbs over its rim.
    const groomAt = K.findIndex(p => p.stops);
    const groomStop = K[groomAt].stops!.find(s => s.tub)!;
    const groomTop = sectionTop(wraps, groomAt);
    const tubOn = Math.abs(groomTop) < innerHeight;
    const tubBase = fit * K[groomAt].s;
    if (tubOn !== tubShown) {
      tubShown = tubOn;
      tubLayers.forEach(layer => { layer.style.display = tubOn ? 'block' : 'none'; });
    }
    if (tubOn) {
      const w = 1.5 * tubBase * perWorld, h = 0.78 * tubBase * perWorld;
      const left = ((1 + groomStop.x) / 2) * innerWidth - w / 2;
      const top = innerHeight / 2 - (groomStop.y * halfH - tubBase * 0.26) * perWorld - h / 2 + groomTop;
      for (const layer of tubLayers) {
        layer.style.width = `${w}px`;
        layer.style.height = `${h}px`;
        layer.style.transform = `translate3d(${left}px,${top}px,0)`;
      }
    }
    const fromTub = Math.abs(cur.x - groomStop.x) * halfW;
    const nearRim = Math.abs(fromTub / tubBase - 0.72);
    const climb = tubOn && !cur.map ? Math.exp(-nearRim * nearRim * 30) * 0.09 * tubBase : 0;

    // Steps follow the distance covered, so the paws don't slide along the floor.
    const moved = Math.hypot((cur.x - px) * halfW, (cur.y - py) * halfH) / base;
    cur.gait += (moved / 0.85) * Math.PI * 2;
    cur.stride = lerp(cur.stride, clamp01(cur.speed / (pace * 0.14)), 1 - Math.exp(-dt * 7));

    if (cur.map > 0 && moved > 2e-4) {
      const aim = Math.atan2((cur.y - py) * innerHeight, (cur.x - px) * innerWidth) - Math.PI / 2;
      const turn = Math.atan2(Math.sin(aim - cur.heading), Math.cos(aim - cur.heading));
      cur.heading += turn * (1 - Math.exp(-dt * 8));
    }

    return {
      base, climb, halfW, halfH, perWorld, fit, walking, scrolling,
      inTub: tubOn && fromTub < tubBase * 0.72,
      wriggle: tubOn && !cur.map && fromTub < tubBase * 0.3,
    };
  };

  return { cur, step, dispose: () => tubLayers.forEach(layer => layer.remove()) };
}
