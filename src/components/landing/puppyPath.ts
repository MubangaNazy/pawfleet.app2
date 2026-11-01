// Where the landing puppy stands in each chapter, and the walk route on the
// tracking map. No three.js here, so the page itself can import it.

// yaw: 0 = facing the camera, -90 = facing left, 90 = facing right, -180 = from behind.
// stops: points it walks through while the chapter is pinned; `at` is how far through (0..1).
export type Stop = { at: number; x: number; y: number; yaw: number; tub?: boolean };
export type Pose = { x: number; y: number; s: number; yaw: number; map?: boolean; stops?: Stop[] };

// Chapters: hero, walks, tracking, grooming, vets, marketplace, community, roles, passport.
const DESKTOP: Pose[] = [
  { x: -0.02, y: -0.30, s: 1.00, yaw: 0 },
  { x: -0.46, y: -0.20, s: 0.98, yaw: 45 },
  { x:  0.46, y: -0.20, s: 0.40, yaw: 0, map: true },
  { x:  0.52, y: -0.28, s: 0.66, yaw: -45, stops: [
    { at: 0, x: 0.90, y: -0.28, yaw: -45 },
    { at: 0.32, x: 0.50, y: -0.28, yaw: -45, tub: true },
    { at: 0.62, x: 0.50, y: -0.28, yaw: -45 },
    { at: 1, x: 0.12, y: -0.28, yaw: -45 },
  ] },
  { x: -0.30, y: -0.30, s: 0.62, yaw: 45 },
  { x: -0.60, y: -0.52, s: 0.62, yaw: 45 },
  { x:  0.74, y: -0.20, s: 0.74, yaw: -45 },
  { x:  0.34, y: -0.46, s: 0.50, yaw: -180 },
  { x: -0.48, y: -0.20, s: 0.96, yaw: 0 },
];
const MOBILE: Pose[] = [
  { x:  0.00, y: -0.16, s: 0.82, yaw: 0 },
  { x:  0.25, y:  0.52, s: 0.56, yaw: -45 },
  { x:  0.00, y: -0.50, s: 0.34, yaw: 0, map: true },
  { x:  0.05, y:  0.54, s: 0.44, yaw: -45, stops: [
    { at: 0, x: 0.74, y: 0.54, yaw: -45 },
    { at: 0.32, x: 0.05, y: 0.54, yaw: -45, tub: true },
    { at: 0.62, x: 0.05, y: 0.54, yaw: -45 },
    { at: 1, x: -0.66, y: 0.54, yaw: -45 },
  ] },
  { x:  0.42, y:  0.50, s: 0.36, yaw: -45 },
  { x:  0.62, y:  0.40, s: 0.34, yaw: -45 },
  { x:  0.58, y:  0.56, s: 0.40, yaw: -45 },
  { x:  0.42, y:  0.60, s: 0.34, yaw: -180 },
  { x: -0.40, y:  0.56, s: 0.48, yaw: 0 },
];
// Map coordinates: x/y in viewport units, -1..1, y up.
const ROUTE_DESKTOP: [number, number][] = [[0.10, -0.66], [0.30, -0.42], [0.22, -0.04], [0.48, 0.18], [0.72, -0.04], [0.82, 0.42]];
const ROUTE_MOBILE: [number, number][] = [[-0.72, -0.82], [-0.2, -0.66], [-0.46, -0.40], [0.14, -0.26], [0.58, -0.52], [0.72, -0.2]];

export const isPhone = () => innerWidth < 760;
export const poses = () => (isPhone() ? MOBILE : DESKTOP);

function catmull(a: number, b: number, c: number, d: number, t: number) {
  return 0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - a - 3 * c + d) * t * t * t);
}

function sample(pts: [number, number][]) {
  const out: [number, number][] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(i + 2, pts.length - 1)];
    for (let k = 0; k < 16; k++) {
      const t = k / 16;
      out.push([catmull(p0[0], p1[0], p2[0], p3[0], t), catmull(p0[1], p1[1], p2[1], p3[1], t)]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
const SAMPLES_DESKTOP = sample(ROUTE_DESKTOP);
const SAMPLES_MOBILE = sample(ROUTE_MOBILE);
export const routeSamples = () => (isPhone() ? SAMPLES_MOBILE : SAMPLES_DESKTOP);

/** Point and direction `q` (0..1) of the way along the route. */
export function routeAt(q: number) {
  const pts = routeSamples();
  const f = Math.min(1, Math.max(0, q)) * (pts.length - 1);
  const i = Math.min(pts.length - 2, Math.floor(f));
  const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
  const t = f - i;
  return { x: ax + (bx - ax) * t, y: ay + (by - ay) * t, dx: bx - ax, dy: by - ay };
}

/** Where the dog belongs in a chapter, `hold` (0..1) of the way through its pause. */
export function spotAt(pose: Pose, hold: number) {
  if (pose.map) { const r = routeAt(hold); return { x: r.x, y: r.y, yaw: pose.yaw }; }
  const stops = pose.stops;
  if (!stops) return pose;
  const i = Math.max(0, stops.findIndex(s => hold <= s.at) - 1);
  const a = stops[i], b = stops[i + 1];
  const t = Math.min(1, (hold - a.at) / (b.at - a.at));
  return { x: a.x + (b.x - a.x) * t, y: a.y, yaw: a.yaw };
}

/** Which chapter the page is on, how far through its pause, and how far into the walk to the next one. */
export function scrollStage(wraps: HTMLElement[]) {
  const y = scrollY;
  for (let i = 0; i < wraps.length; i++) {
    const w = wraps[i];
    if (i < wraps.length - 1 && y >= w.offsetTop + w.offsetHeight) continue;
    const pinned = w.offsetHeight - (w.firstElementChild as HTMLElement).offsetHeight;
    const s = y - w.offsetTop;
    return {
      i,
      hold: Math.min(1, Math.max(0, s / Math.max(1, pinned))),
      walk: Math.min(1, Math.max(0, (s - pinned) / Math.max(1, w.offsetHeight - pinned))),
    };
  }
  return { i: 0, hold: 0, walk: 0 };
}
