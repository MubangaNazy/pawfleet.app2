// The landing puppy for phones. Instead of live 3D it slides pre-rendered strips of
// frames (scripts/landing/make_puppy_sprites.py) inside clipped boxes. Moving an
// image with a CSS transform is about the cheapest thing a phone can do, and three.js
// never has to download or start. The route is the same: see puppyWalker.
import { ASPECT, TURNTABLE, createWalker, viewsAt } from './puppyWalker';

export const SPRITES: Record<string, number> = { front: 4, quarter: 4, back: 4, top: 4, side: 8 };
export const spriteUrl = (name: string) => `/landing/sprite-${name}.webp`;

type View = { box: HTMLDivElement; strip: HTMLImageElement; frames: number; shown: boolean; frame: number; opacity: number; width: string };

export async function createPuppySprite(anchor: HTMLElement, wraps: HTMLElement[], onWalked: (route: number) => void): Promise<() => void> {
  await Promise.all(Object.keys(SPRITES).map(name => {
    const img = new Image();
    img.src = spriteUrl(name);
    return img.decode();
  }));

  const walker = createWalker(wraps, onWalked, anchor);
  const { cur } = walker;

  const fit0 = walker.step(0, 0).fit;
  const unit = () => fit0 * (innerHeight / (2 * Math.tan((15 * Math.PI) / 180) * 10));
  const U = Math.round(unit());

  // A point on the floor under the dog; everything hangs off it.
  const root = document.createElement('div');
  root.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;z-index:20;pointer-events:none;will-change:transform';
  anchor.after(root);

  const shadow = document.createElement('div');
  shadow.style.cssText = `position:absolute;left:${-U * 0.75}px;top:${-U * 0.12}px;width:${U * 1.5}px;height:${U * 0.24}px;background:radial-gradient(closest-side,rgba(14,62,44,.42),rgba(14,62,44,.14) 55%,rgba(14,62,44,0));will-change:transform`;
  root.append(shadow);

  const makeView = (name: string, size: number) => {
    const frames = SPRITES[name];
    const box = document.createElement('div');
    const w = ASPECT[name] * size;
    box.style.cssText = `position:absolute;left:${-w / 2}px;bottom:0;width:${w}px;height:${size}px;overflow:hidden;display:none;transform-origin:50% 100%;will-change:transform,opacity`;
    const strip = new Image();
    strip.src = spriteUrl(name);
    strip.alt = '';
    strip.style.cssText = `position:absolute;left:0;top:0;width:${frames * 100}%;height:100%;max-width:none;will-change:transform`;
    box.append(strip);
    root.append(box);
    return { box, strip, frames, shown: false, frame: -1, opacity: -1, width: '' } as View;
  };

  const views = TURNTABLE.map(v => ({ ...v, view: makeView(v.name, U) }));
  const top = makeView('top', U * 1.5);
  top.box.style.transformOrigin = '50% 50%';
  top.box.style.bottom = `${-U * 0.25}px`;

  const setFrame = (v: View, n: number) => {
    if (n === v.frame) return;
    v.frame = n;
    v.strip.style.transform = `translate3d(${(-100 * n) / v.frames}%,0,0)`;
  };
  const show = (v: View, on: boolean) => {
    if (on === v.shown) return;
    v.shown = on;
    v.box.style.display = on ? 'block' : 'none';
  };
  const fade = (v: View, o: number) => {
    const rounded = Math.round(o * 50) / 50;
    if (rounded === v.opacity) return;
    v.opacity = rounded;
    v.box.style.opacity = String(rounded);
  };

  let raf = 0;
  let last = performance.now();
  const started = last;

  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const t = (now - started) / 1000;
    const s = walker.step(dt, t);

    const pick = viewsAt(cur.yaw);
    const standing = 1 - cur.map;
    const wag = Math.floor(t * 9) % 4;
    const steps = Math.floor((cur.gait / (Math.PI * 2)) * 8);

    for (const v of views) {
      const o = v === views[TURNTABLE.indexOf(pick.a)] ? 1 - pick.f : v === views[TURNTABLE.indexOf(pick.b)] ? Math.min(1, pick.f * 3) : 0;
      const on = o > 0.01 && standing > 0.01;
      show(v.view, on);
      if (!on) continue;
      fade(v.view, o * standing);
      v.view.box.style.zIndex = v === views[TURNTABLE.indexOf(pick.a)] ? '2' : '1';
      const stretch = pick.width / ASPECT[v.name];
      v.view.box.style.transform = `scaleX(${((v.mirror ? -1 : 1) * stretch).toFixed(3)})`;
      setFrame(v.view, v.name === 'side' ? (cur.stride > 0.05 ? ((steps % 8) + 8) % 8 : 0) : wag);
    }

    const onMap = cur.map > 0.01;
    show(top, onMap);
    if (onMap) {
      fade(top, cur.map);
      setFrame(top, wag);
      top.box.style.transform = `rotate(${-cur.heading + Math.sin(cur.gait) * 0.05 * Math.min(1, cur.speed * 4)}rad)`;
    }

    shadow.style.display = standing > 0.01 && !s.inTub ? 'block' : 'none';
    shadow.style.transform = `scaleX(${(pick.width * 0.53 + 0.13).toFixed(3)})`;

    // Stand the dog on its spot: x/y are the centre of the dog, the root is its feet.
    const px = s.base * s.perWorld;
    const bob = (Math.abs(Math.sin(cur.gait)) * 0.016 * cur.stride * standing + s.climb / s.base) * px;
    const fx = ((1 + cur.x) / 2) * innerWidth;
    const fy = ((1 - cur.y) / 2) * innerHeight + px / 2 - bob;
    const lean = s.wriggle ? Math.sin(t * 7) * 0.025 : 0;
    root.style.transform = `translate3d(${fx.toFixed(1)}px,${fy.toFixed(1)}px,0) scale(${(px / U).toFixed(4)}) rotate(${lean.toFixed(3)}rad)`;
  };
  raf = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(raf);
    root.remove();
    walker.dispose();
  };
}
