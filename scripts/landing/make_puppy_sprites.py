"""Pre-renders the puppy's animation frames for phones.

Usage: python make_puppy_sprites.py <public/landing folder>
Needs pillow, numpy and scipy. Reads the cutouts from make_puppy_assets.py and
writes sprite-<view>.webp, a strip of frames side by side: tail wag and panting
for the standing views, a full walk cycle for the side view. The bends match the
vertex shader in src/components/landing/puppyScene.ts.
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ni

folder = sys.argv[1]
PI = np.pi

RIGS = {
    'front': dict(crop=(460, 40, 702, 910), tail=((935, 300), (1020, 470), (950, 330)),
                  head=((520, 395), (860, 395), (690, 400), 340), tongue=(688, 330), legs=[]),
    'side': dict(crop=(148, 99, 1301, 825), tail=((1090, 345), (1215, 530), (1105, 385)),
                 head=((290, 395), (560, 300), (480, 330), 370), tongue=(205, 338),
                 legs=[(575, 630, 100, 1), (480, 640, 62, -1), (1175, 640, 100, -1), (1050, 650, 62, 1)]),
    'back': dict(crop=(498, 38, 646, 902), tail=((860, 310), (950, 510), (830, 410)),
                 head=((480, 250), (860, 250), (680, 262), 320), tongue=None, legs=[]),
    'quarter': dict(crop=(478, 54, 772, 868), tail=((1045, 262), (1178, 402), (1062, 288)),
                    head=((555, 405), (900, 280), (770, 372), 340), tongue=(566, 332), legs=[]),
    'top': dict(crop=(580, 8, 436, 955), tail=((900, 770), (640, 770), (750, 770)),
                head=((600, 300), (890, 300), (745, 305), 320), tongue=None, legs=[]),
}
# name: (frames, frame height in pixels, webp quality)
SHEETS = {'front': (4, 420, 74), 'quarter': (4, 420, 74), 'back': (4, 300, 70), 'top': (4, 300, 70), 'side': (8, 300, 72)}


def smoothstep(a, b, v):
    t = np.clip((v - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def line_side(x, y, a, b):
    d = np.array(b, float) - a
    d /= np.hypot(*d)
    return (x - a[0]) * d[1] - (y - a[1]) * d[0]


def turned(x, y, cx, cy, angle):
    s, c = np.sin(angle), np.cos(angle)
    return cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c


def frame(rgba, rig, wag, pant, gait):
    """Bends one frame by looking up, for each output pixel, where it came from."""
    h, w = rgba.shape[:2]
    cx, cy, cw, ch = rig['crop']
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    ox = cx + (xx + 0.5) * cw / w
    oy = cy + (yy + 0.5) * ch / h
    x, y = ox.copy(), oy.copy()

    a, b, pivot = rig['tail']
    tail = smoothstep(-6, 34, line_side(ox, oy, a, b)) * smoothstep(10, 170, np.hypot(ox - pivot[0], oy - pivot[1]))
    x, y = turned(x, y, pivot[0], pivot[1], -wag * 0.28 * tail)

    if rig['tongue']:
        tx, ty = rig['tongue']
        y = y - pant * 5 * smoothstep(62, 18, np.hypot(ox - tx, oy - ty))

    for lx, hip, half, sign in rig['legs']:
        phase = gait + (0 if sign > 0 else PI)
        # Judge each pixel by where it lands on the straight leg, so the paw travels with it.
        sx, sy = turned(x, y, lx, hip, -np.sin(phase) * 0.26)
        sy = sy + max(0.0, np.cos(phase)) * 0.26 * 36
        weight = smoothstep(hip, hip + 110, sy) * smoothstep(half * 1.3, half * 0.85, np.abs(sx - lx))
        x, y = x + (sx - x) * weight, y + (sy - y) * weight

    coords = [(y - cy) * h / ch - 0.5, (x - cx) * w / cw - 0.5]
    return np.dstack([ni.map_coordinates(rgba[..., i], coords, order=1, mode='constant') for i in range(4)])


for name, (count, height, quality) in SHEETS.items():
    im = Image.open(f'{folder}/{name}.webp').convert('RGBA')
    width = round(im.width * height / im.height)
    rgba = np.array(im.resize((width, height), Image.LANCZOS)).astype(np.float32)
    rgba[..., :3] *= rgba[..., 3:4] / 255  # premultiply, so fur edges stay clean
    rig = RIGS[name]
    strip = []
    for i in range(count):
        t = i / count * 2 * PI
        walk = name == 'side'
        out = frame(rgba, rig, np.sin(t) * (0.55 if walk else 1), np.sin(t * 2), t if walk else 0.0)
        # Drop stray specks of fur left behind by the bend.
        lab, n = ni.label(out[..., 3] > 30)
        if n > 1:
            keep = lab == (np.argmax(ni.sum(np.ones_like(lab), lab, range(1, n + 1))) + 1)
            out *= ni.binary_dilation(keep, iterations=3)[..., None]
        alpha = np.maximum(out[..., 3:4], 1e-3)
        out[..., :3] = np.clip(out[..., :3] * 255 / alpha, 0, 255)
        strip.append(out)
    Image.fromarray(np.hstack(strip).clip(0, 255).astype(np.uint8), 'RGBA').save(
        f'{folder}/sprite-{name}.webp', quality=quality, method=6)
    print(name, width, height, 'x', count)
