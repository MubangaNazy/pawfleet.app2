/**
 * Photo preparation. A phone camera photo is 3 to 8 MB, far too big to store or send around.
 * Every photo that leaves a picker goes through here: it is turned upright (phones store
 * sideways photos with a rotation note), scaled down, and saved as a small JPEG that every phone can show.
 */

export class UnsupportedImageError extends Error {
  constructor() { super('This photo type is not supported. Please choose a JPG or PNG photo.'); }
}

const loadBitmap = async (blob: Blob): Promise<{ w: number; h: number; draw: (c: CanvasRenderingContext2D, w: number, h: number) => void; close: () => void }> => {
  // Best route: the browser decodes it and applies the phone's rotation for us.
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(blob, { imageOrientation: 'from-image' } as ImageBitmapOptions);
      return { w: bmp.width, h: bmp.height, draw: (c, w, h) => c.drawImage(bmp, 0, 0, w, h), close: () => bmp.close?.() };
    } catch { /* fall back to an <img> */ }
  }
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new UnsupportedImageError());
      i.src = url;
    });
    return { w: img.naturalWidth, h: img.naturalHeight, draw: (c, w, h) => c.drawImage(img, 0, 0, w, h), close: () => {} };
  } finally {
    URL.revokeObjectURL(url);
  }
};

async function encode(blob: Blob, maxDim: number, quality: number, maxBytes: number): Promise<string> {
  const src = await loadBitmap(blob);
  try {
    let dim = maxDim;
    let q = quality;
    for (let attempt = 0; attempt < 5; attempt++) {
      const scale = Math.min(1, dim / Math.max(src.w, src.h));
      const w = Math.max(1, Math.round(src.w * scale));
      const h = Math.max(1, Math.round(src.h * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new UnsupportedImageError();
      ctx.fillStyle = '#fff'; // PNGs with see-through areas would otherwise turn black
      ctx.fillRect(0, 0, w, h);
      src.draw(ctx, w, h);
      const out = canvas.toDataURL('image/jpeg', q);
      // base64 is about 4/3 the size of the bytes it holds
      if (out.length * 0.75 <= maxBytes || attempt === 4) return out;
      dim = Math.round(dim * 0.8);
      q = Math.max(0.5, q - 0.08);
    }
    throw new UnsupportedImageError();
  } finally {
    src.close();
  }
}

export interface PrepareOptions {
  /** Longest side in pixels. */
  maxDim?: number;
  quality?: number;
  /** Target size ceiling in bytes. */
  maxBytes?: number;
}

/** A picked file to a small, upright JPEG data URL. */
export function prepareImage(file: File, opts: PrepareOptions = {}): Promise<string> {
  return encode(file, opts.maxDim ?? 768, opts.quality ?? 0.8, opts.maxBytes ?? 150_000);
}

/** Shrink a photo that is already a data URL (older, oversized photos saved before this existed). */
export async function shrinkDataUrl(dataUrl: string, opts: PrepareOptions = {}): Promise<string> {
  const blob = await (await fetch(dataUrl)).blob();
  return encode(blob, opts.maxDim ?? 768, opts.quality ?? 0.8, opts.maxBytes ?? 150_000);
}
