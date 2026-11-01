"""Builds the landing-page puppy assets from the five source photos.

Usage: python make_puppy_assets.py <front> <side> <back> <quarter> <top> <output-dir>
Needs pillow, numpy and scipy. For each view it writes <name>.webp (cutout) and
<name>-depth.png (height map that sculpts the 3D mesh), and prints the crops
that go in src/components/landing/puppyViews.ts.
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ni

NAMES = ['front', 'side', 'back', 'quarter', 'top']
out = sys.argv[6]

# Parts pushed toward (+) or away from (-) the camera: x, y, radius x, radius y, amount.
BUMPS = {
    'front': [(688, 190, 200, 170, 0.34), (688, 262, 95, 80, 0.42), (688, 235, 40, 34, 0.16),
              (690, 540, 150, 170, 0.2), (625, 760, 85, 200, 0.2), (830, 760, 80, 200, 0.2),
              (1000, 660, 75, 200, -0.3), (750, 780, 50, 90, -0.42), (1040, 300, 110, 170, -0.32)],
    'side': [(400, 220, 170, 130, 0.26), (225, 260, 95, 60, 0.12), (800, 480, 340, 170, 0.22),
             (580, 730, 80, 170, 0.14), (1170, 700, 85, 180, 0.14), (480, 760, 60, 130, -0.34),
             (1050, 760, 60, 120, -0.34), (1290, 300, 150, 170, -0.1)],
    'back': [(680, 180, 150, 120, -0.1), (760, 520, 190, 240, 0.28), (650, 760, 80, 150, 0.2),
             (910, 760, 80, 150, 0.2), (590, 790, 45, 60, -0.3), (815, 790, 45, 60, -0.3),
             (1000, 310, 120, 190, 0.12)],
    'quarter': [(650, 220, 175, 170, 0.42), (565, 275, 85, 70, 0.34), (548, 238, 34, 30, 0.12),
                (720, 520, 150, 150, 0.22), (840, 720, 90, 220, 0.2), (680, 720, 70, 160, -0.08),
                (1125, 630, 90, 190, 0.04), (985, 665, 60, 120, -0.4), (1135, 230, 105, 170, -0.22)],
    'top': [(745, 210, 130, 130, 0.2), (745, 520, 110, 260, 0.2), (850, 860, 140, 90, -0.1)],
}


def bump(H, W, cx, cy, rx, ry, amp):
    yy, xx = np.mgrid[0:H, 0:W]
    return amp * np.exp(-(((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2))


for name, src in zip(NAMES, sys.argv[1:6]):
    rgb = np.array(Image.open(src).convert('RGB')).astype(np.float32)
    H, W, _ = rgb.shape
    green_lean = rgb[..., 1] - rgb[..., 0]

    # The backdrop and its shadow lean green; flood in from the frame edges so
    # the green collar, enclosed by fur, is never reached.
    lab, _ = ni.label(green_lean > 8)
    edge = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    bg = np.isin(lab, edge[edge > 0])
    fg = ni.binary_fill_holes(~bg)
    lab, n = ni.label(fg)
    fg = lab == (np.argmax(ni.sum(fg, lab, range(1, n + 1))) + 1)

    # Gaps between the legs are backdrop too: bright green patches, unlike the dark collar.
    lum0 = rgb.mean(axis=2)
    lab, n = ni.label(fg & (green_lean > 8))
    for i in range(1, n + 1):
        if lum0[lab == i].mean() > 165 and (lab == i).sum() > 25:
            fg[ni.binary_dilation(lab == i, iterations=1)] = False

    # Soft edge for the fur: full inside, ramped on green-lean in a narrow band.
    solid = ni.binary_erosion(fg, iterations=3)
    band = ni.binary_dilation(fg, iterations=5) & ~solid
    alpha = solid.astype(np.float32)
    alpha[band] = np.clip((14 - green_lean[band]) / 16, 0, 1)
    alpha = ni.gaussian_filter(alpha, 0.6)

    # Replace edge colours with the nearest solid fur so no mint fringe shows on dark.
    core = alpha > 0.97
    idx = ni.distance_transform_edt(~core, return_distances=False, return_indices=True)
    rgb_out = np.where(alpha[..., None] > 0.97, rgb, rgb[idx[0], idx[1]])

    ys, xs = np.where(alpha > 0.02)
    pad = 12
    x0, x1 = max(xs.min() - pad, 0), min(xs.max() + pad, W)
    y0, y1 = max(ys.min() - pad, 0), min(ys.max() + pad, H)

    # Depth: inflate the silhouette, then shape it part by part.
    pillow = np.sqrt(np.clip(1 - (1 - np.clip(ni.distance_transform_edt(fg) / 150, 0, 1)) ** 2, 0, 1))
    d = pillow * 0.7
    for cx, cy, rx, ry, amp in BUMPS[name]:
        d += bump(H, W, cx, cy, rx, ry, amp)
    d = ni.gaussian_filter(d, 7)
    lum = rgb.mean(axis=2) / 255
    d += (lum - ni.gaussian_filter(lum, 9)) * 0.25  # fur relief
    d = np.clip(d, 0, None) * ni.gaussian_filter(fg.astype(np.float32), 3)
    d /= d.max()

    rgba = np.dstack([rgb_out, alpha * 255]).clip(0, 255).astype(np.uint8)[y0:y1, x0:x1]
    cut = Image.fromarray(rgba, 'RGBA')
    scale = min(1, 900 / max(cut.size))
    cut = cut.resize((round(cut.width * scale), round(cut.height * scale)), Image.LANCZOS)
    cut.save(f'{out}/{name}.webp', quality=86, exact=True, method=6)
    # Phones get a much smaller copy.
    k = 480 / max(cut.size)
    cut.resize((round(cut.width * k), round(cut.height * k)), Image.LANCZOS).save(f'{out}/{name}-sm.webp', quality=78, exact=True, method=6)
    dep = Image.fromarray((d[y0:y1, x0:x1] * 255).astype(np.uint8), 'L')
    dep.resize((cut.width // 3, cut.height // 3), Image.BICUBIC).save(f'{out}/{name}-depth.png', optimize=True)
    print(f"{name}: {{ x: {x0}, y: {y0}, w: {x1 - x0}, h: {y1 - y0} }}")
