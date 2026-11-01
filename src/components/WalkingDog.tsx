import { useEffect, useRef } from 'react';

// The golden puppy walking in along the bottom of the first loading screen,
// leaving paw prints behind it. It runs on a plain canvas so the splash doesn't
// have to wait for three.js. The legs are bent by redrawing the bottom of the
// photo row by row, each leg's rows slid sideways from the hip.

const PAW = new Path2D('M12 13.2c-2.9 0-5.6 2.5-5.6 5 0 1.6 1.2 2.4 2.7 2.4 1.2 0 1.9-.5 2.9-.5s1.7.5 2.9.5c1.5 0 2.7-.8 2.7-2.4 0-2.5-2.7-5-5.6-5zM5.2 8.4c-1.3.3-1.9 1.8-1.4 3.3s1.8 2.5 3.1 2.2 1.9-1.8 1.4-3.3-1.8-2.5-3.1-2.2zm13.6 0c-1.3-.3-2.6.7-3.1 2.2s.1 3 1.4 3.3 2.6-.7 3.1-2.2-.1-3-1.4-3.3zM9.3 3.2C8 3.4 7.2 4.9 7.5 6.6s1.5 2.9 2.8 2.7 2.1-1.7 1.8-3.4-1.5-2.9-2.8-2.7zm5.4 0c-1.3-.2-2.5 1-2.8 2.7s.5 3.2 1.8 3.4 2.5-1 2.8-2.7-.5-3.2-1.8-3.4z');

// Columns of the 1301 x 825 side photo. phase null = fixed; otherwise a leg.
const COLUMNS: { from: number; to: number; phase: number | null }[] = [
  { from: 0, to: 270, phase: null },
  { from: 270, to: 375, phase: Math.PI },
  { from: 375, to: 540, phase: 0 },
  { from: 540, to: 840, phase: null },
  { from: 840, to: 960, phase: 0 },
  { from: 960, to: 1150, phase: Math.PI },
  { from: 1150, to: 1301, phase: null },
];
const PHOTO_W = 1301, PHOTO_H = 825, HIP = 530;
const WALK_MS = 2300;

export default function WalkingDog() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const g = canvas.getContext('2d')!;
    const img = new Image();
    let raf = 0;
    let stopped = false;

    const start = () => {
      if (stopped) return;
      const dpr = Math.min(devicePixelRatio, 2);
      const W = canvas.clientWidth, H = canvas.clientHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      const floor = H - 20;
      const dogH = Math.min(H - 26, 150);
      const dogW = (dogH * PHOTO_W) / PHOTO_H;
      const k = dogH / PHOTO_H;
      const toImg = img.naturalWidth / PHOTO_W;
      const endX = (W - dogW) / 2;
      const startX = -dogW - 10;
      const stride = dogH * 0.62;
      const prints: { x: number; y: number; at: number }[] = [];
      let nextPrint = 0;
      const t0 = performance.now();

      const frame = (now: number) => {
        const t = Math.min(1, (now - t0) / WALK_MS);
        const eased = 1 - Math.pow(1 - t, 2.4);
        const x = startX + (endX - startX) * eased;
        const travelled = x - startX;
        const gait = (travelled / stride) * Math.PI * 2;
        const moving = 1 - t * t * t * t;

        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.clearRect(0, 0, W, H);

        // A paw print every half stride, fading out behind the dog.
        while (travelled > nextPrint) {
          prints.push({ x: startX + dogW * 0.5 + nextPrint, y: floor + (prints.length % 2 ? 4 : -3), at: now });
          nextPrint += stride / 2;
        }
        for (const p of prints) {
          const a = Math.max(0, 0.55 - (now - p.at) / 2600);
          if (a <= 0 || p.x > x + dogW * 0.45) continue;
          g.save();
          g.translate(p.x, p.y);
          g.rotate(Math.PI / 2);
          g.scale(0.62, 0.62);
          g.translate(-12, -12);
          g.fillStyle = `rgba(242,200,121,${a})`;
          g.fill(PAW);
          g.restore();
        }

        const ground = g.createRadialGradient(0, 0, 0, 0, 0, 1);
        ground.addColorStop(0, 'rgba(0,0,0,.34)');
        ground.addColorStop(1, 'rgba(0,0,0,0)');
        g.save();
        g.translate(x + dogW / 2, floor);
        g.scale(dogW * 0.5, 9);
        g.fillStyle = ground;
        g.fillRect(-1, -1, 2, 2);
        g.restore();

        // Mirror the left-facing photo so it walks to the right.
        const bob = Math.abs(Math.sin(gait)) * 2.5 * moving;
        const top = floor - dogH - bob;
        g.setTransform(-k * dpr, 0, 0, k * dpr, (x + dogW) * dpr, top * dpr);
        g.drawImage(img, 0, 0, img.naturalWidth, HIP * toImg, 0, 0, PHOTO_W, HIP);
        const rows = 4;
        for (let y = HIP; y < PHOTO_H; y += rows) {
          const down = (y - HIP) / (PHOTO_H - HIP);
          for (const c of COLUMNS) {
            let dx = 0, dy = 0;
            if (c.phase !== null) {
              const p = gait + c.phase;
              dx = -Math.sin(p) * 0.3 * moving * (y - HIP);
              dy = -Math.max(0, Math.cos(p)) * 34 * moving * down;
            }
            g.drawImage(img, c.from * toImg, y * toImg, (c.to - c.from) * toImg, rows * toImg, c.from + dx, y + dy, c.to - c.from, rows + 1);
          }
        }

        if (now - t0 < WALK_MS + 2500) raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    };

    img.onload = start;
    img.src = '/landing/side.webp';
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, width: '100%', height: 190 }} />;
}
