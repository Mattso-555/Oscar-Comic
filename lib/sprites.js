// Image processing for the kid's own drawings.
// Principle: we enhance presentation of THEIR art (lighting, edges, cutout)
// but never add, choose, or generate artwork.

/**
 * Photo upload cleanup — works on REAL photos, not just white paper.
 *
 * Instead of assuming the paper is white, we measure it: the image is split
 * into a grid, each cell's "paper colour" is estimated (bright percentile,
 * robust to shadows and warm lamp light), smoothed, then every pixel is
 * white-balanced against its local paper estimate. Paper becomes white and
 * is cut away; the kid's lines keep their true colours, freed of the
 * yellow/brown photo cast. Nothing is added — this is better lighting only.
 */
export function cleanupBackground(ctx, w, h) {
  const d = ctx.getImageData(0, 0, w, h);
  const p = d.data;
  const G = 16; // paper-estimation grid
  const cw = Math.ceil(w / G), ch = Math.ceil(h / G);
  const bgR = new Float32Array(G * G);
  const bgG = new Float32Array(G * G);
  const bgB = new Float32Array(G * G);
  const allR = [], allG = [], allB = [];

  const pick90 = (a) => {
    if (!a.length) return 255;
    a.sort((m, n) => m - n);
    return a[Math.floor(a.length * 0.9)];
  };

  for (let gy = 0; gy < G; gy++) {
    for (let gx = 0; gx < G; gx++) {
      const rs = [], gs = [], bs = [];
      const x0 = gx * cw, y0 = gy * ch;
      for (let y = y0; y < Math.min(y0 + ch, h); y += 2) {
        for (let x = x0; x < Math.min(x0 + cw, w); x += 2) {
          const i = (y * w + x) * 4;
          if (p[i + 3] === 0) continue; // letterbox outside the photo
          rs.push(p[i]); gs.push(p[i + 1]); bs.push(p[i + 2]);
        }
      }
      const k = gy * G + gx;
      bgR[k] = pick90(rs); bgG[k] = pick90(gs); bgB[k] = pick90(bs);
      allR.push(bgR[k]); allG.push(bgG[k]); allB.push(bgB[k]);
    }
  }

  // Global paper estimate; clamp cells so a cell fully covered by drawing
  // can't be mistaken for (dark) paper.
  const gR = pick90(allR.slice()), gG = pick90(allG.slice()), gB = pick90(allB.slice());
  for (let k = 0; k < G * G; k++) {
    bgR[k] = Math.max(bgR[k], gR * 0.55, 40);
    bgG[k] = Math.max(bgG[k], gG * 0.55, 40);
    bgB[k] = Math.max(bgB[k], gB * 0.55, 40);
  }

  // Smooth the grid so cell seams don't show.
  const smooth = (src) => {
    const out = new Float32Array(G * G);
    for (let y = 0; y < G; y++) {
      for (let x = 0; x < G; x++) {
        let s = 0, n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx, yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= G || yy >= G) continue;
            s += src[yy * G + xx]; n++;
          }
        }
        out[y * G + x] = s / n;
      }
    }
    return out;
  };
  const R = smooth(bgR), Gr = smooth(bgG), B = smooth(bgB);

  // Bilinear sample of the paper grid at any pixel.
  const sample = (arr, fx, fy) => {
    const x0 = Math.floor(fx), y0 = Math.floor(fy);
    const x1 = Math.min(G - 1, x0 + 1), y1 = Math.min(G - 1, y0 + 1);
    const tx = fx - x0, ty = fy - y0;
    const a = arr[y0 * G + x0] * (1 - tx) + arr[y0 * G + x1] * tx;
    const b = arr[y1 * G + x0] * (1 - tx) + arr[y1 * G + x1] * tx;
    return a * (1 - ty) + b * ty;
  };

  for (let y = 0; y < h; y++) {
    const fy = Math.max(0, Math.min(G - 1, (y / h) * G - 0.5));
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (p[i + 3] === 0) continue;
      const fx = Math.max(0, Math.min(G - 1, (x / w) * G - 0.5));
      // white-balance against local paper
      const nr = Math.min(255, (p[i] * 255) / sample(R, fx, fy));
      const ng = Math.min(255, (p[i + 1] * 255) / sample(Gr, fx, fy));
      const nb = Math.min(255, (p[i + 2] * 255) / sample(B, fx, fy));
      p[i] = nr; p[i + 1] = ng; p[i + 2] = nb;
      const lum = (nr + ng + nb) / 3;
      if (lum >= 232) p[i + 3] = 0;
      else if (lum > 170) p[i + 3] = Math.round(((232 - lum) / 62) ** 1.3 * 255);
      // darker than 170 stays fully opaque — that's the drawing
    }
  }
  ctx.putImageData(d, 0, 0);
}

/** Boost saturation/contrast of the kid's own colours — better lighting, same hues. */
function colourPop(imgData) {
  const p = imgData.data;
  const SAT = 1.35, CON = 1.12, MID = 128;
  for (let i = 0; i < p.length; i += 4) {
    if (p[i + 3] < 10) continue;
    let r = p[i], g = p[i + 1], b = p[i + 2];
    const avg = (r + g + b) / 3;
    r = avg + (r - avg) * SAT; g = avg + (g - avg) * SAT; b = avg + (b - avg) * SAT;
    r = MID + (r - MID) * CON; g = MID + (g - MID) * CON; b = MID + (b - MID) * CON;
    p[i] = Math.max(0, Math.min(255, r));
    p[i + 1] = Math.max(0, Math.min(255, g));
    p[i + 2] = Math.max(0, Math.min(255, b));
  }
  return imgData;
}

/** Soften cutout edges so drawings sit into scenes instead of hard stickers. */
function featherEdges(imgData, w, h) {
  const p = imgData.data;
  const a = (x, y) => p[(y * w + x) * 4 + 3];
  const out = new Uint8ClampedArray(p);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4 + 3;
      if (p[i] > 0) {
        const n = Math.min(a(x - 1, y), a(x + 1, y), a(x, y - 1), a(x, y + 1));
        if (n === 0) out[i] = Math.round(p[i] * 0.45);
        else if (n < 200) out[i] = Math.round(p[i] * 0.8);
      }
    }
  }
  imgData.data.set(out);
  return imgData;
}

/** Crop to drawn content and export a polished transparent PNG. */
export function exportSprite(ctx, W, H, { pop = true } = {}) {
  const src = ctx.getImageData(0, 0, W, H);
  const p = src.data;
  let minX = W, minY = H, maxX = 0, maxY = 0, found = false;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (p[(y * W + x) * 4 + 3] > 25) {
        found = true;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  }
  if (!found) return null;
  const pad = 12;
  minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
  maxX = Math.min(W, maxX + pad); maxY = Math.min(H, maxY + pad);
  const w = maxX - minX, h = maxY - minY;
  const off = document.createElement('canvas');
  off.width = w; off.height = h;
  let region = ctx.getImageData(minX, minY, w, h);
  if (pop) region = colourPop(region);
  region = featherEdges(region, w, h);
  off.getContext('2d').putImageData(region, 0, 0);
  return off.toDataURL('image/png');
}

/**
 * Gap-tolerant paint-bucket fill. The kid picks the colour AND the spot.
 *
 * Hand-drawn and photographed outlines often have small breaks that make a
 * plain flood fill leak across the whole page. This version:
 *   1. builds a "barrier" mask of line-like pixels,
 *   2. temporarily thickens those barriers by `gap` pixels so breaks up to
 *      ~2×gap seal themselves,
 *   3. floods the safe interior,
 *   4. grows the filled region back outward (only across fillable pixels)
 *      so the colour meets the real lines with no pale halo.
 *
 * No colours are chosen by the machine — it only stops leaks.
 */
export function floodFill(ctx, W, H, x, y, hex, gap = 3) {
  const img = ctx.getImageData(0, 0, W, H);
  const p = img.data;
  const sx = Math.floor(x), sy = Math.floor(y);
  if (sx < 0 || sy < 0 || sx >= W || sy >= H) return 0;

  const N = W * H;
  const seed = sy * W + sx;
  const i0 = seed * 4;
  const target = [p[i0], p[i0 + 1], p[i0 + 2], p[i0 + 3]];

  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if (target[0] === r && target[1] === g && target[2] === b && target[3] === 255) return 0;

  const TOL = 48;
  const fillable = (s) => {
    const i = s * 4;
    return (
      Math.abs(p[i] - target[0]) <= TOL &&
      Math.abs(p[i + 1] - target[1]) <= TOL &&
      Math.abs(p[i + 2] - target[2]) <= TOL &&
      Math.abs(p[i + 3] - target[3]) <= TOL
    );
  };

  // 1) barrier mask: anything that isn't fillable is a line/edge.
  let barrier = new Uint8Array(N);
  for (let s = 0; s < N; s++) if (!fillable(s)) barrier[s] = 1;

  // 2) dilate barriers to seal small gaps — but never past the tapped spot.
  //    If a dilation pass would swallow the seed (tap was close to a line),
  //    stop early and use the last mask that keeps the seed free.
  for (let pass = 0; pass < gap; pass++) {
    const next = new Uint8Array(barrier);
    for (let yy = 0; yy < H; yy++) {
      const row = yy * W;
      for (let xx = 0; xx < W; xx++) {
        const s = row + xx;
        if (barrier[s]) continue;
        if (
          (xx > 0 && barrier[s - 1]) ||
          (xx < W - 1 && barrier[s + 1]) ||
          (yy > 0 && barrier[s - W]) ||
          (yy < H - 1 && barrier[s + W])
        ) next[s] = 1;
      }
    }
    if (next[seed]) break;
    barrier = next;
  }
  if (barrier[seed]) return 0; // tapped directly on a line — nothing to fill

  // 3) flood the safe interior.
  const region = new Uint8Array(N);
  const stack = [seed];
  region[seed] = 1;
  while (stack.length) {
    const s = stack.pop();
    const xx = s % W, yy = (s / W) | 0;
    if (xx > 0 && !region[s - 1] && !barrier[s - 1]) { region[s - 1] = 1; stack.push(s - 1); }
    if (xx < W - 1 && !region[s + 1] && !barrier[s + 1]) { region[s + 1] = 1; stack.push(s + 1); }
    if (yy > 0 && !region[s - W] && !barrier[s - W]) { region[s - W] = 1; stack.push(s - W); }
    if (yy < H - 1 && !region[s + W] && !barrier[s + W]) { region[s + W] = 1; stack.push(s + W); }
  }

  // 4) grow the region back out to the real lines (only across fillable pixels),
  //    one pass further than the dilation so anti-aliased edges are covered.
  for (let pass = 0; pass < gap + 1; pass++) {
    const adds = [];
    for (let yy = 0; yy < H; yy++) {
      const row = yy * W;
      for (let xx = 0; xx < W; xx++) {
        const s = row + xx;
        if (region[s] || !fillable(s)) continue;
        if (
          (xx > 0 && region[s - 1]) ||
          (xx < W - 1 && region[s + 1]) ||
          (yy > 0 && region[s - W]) ||
          (yy < H - 1 && region[s + W])
        ) adds.push(s);
      }
    }
    if (!adds.length) break;
    for (const s of adds) region[s] = 1;
  }

  // 5) apply the kid's colour.
  let filled = 0;
  for (let s = 0; s < N; s++) {
    if (region[s]) {
      filled++;
      const i = s * 4;
      p[i] = r; p[i + 1] = g; p[i + 2] = b; p[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return filled;
}

/* ---------- re-cut already-saved items in place ---------- */

function loadImage(src) {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
}

/**
 * How much of this sprite is opaque? Uncut photo rectangles are nearly fully
 * opaque (~1.0); real cutouts and canvas drawings are mostly transparent.
 */
export async function opaqueCoverage(dataUrl) {
  const img = await loadImage(dataUrl);
  const S = 96;
  const s = Math.min(S / img.width, S / img.height);
  const w = Math.max(1, Math.round(img.width * s));
  const h = Math.max(1, Math.round(img.height * s));
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const c = cv.getContext('2d', { willReadFrequently: true });
  c.drawImage(img, 0, 0, w, h);
  const p = c.getImageData(0, 0, w, h).data;
  let opaque = 0;
  for (let i = 3; i < p.length; i += 4) if (p[i] > 200) opaque++;
  return opaque / (w * h);
}

/**
 * Run the smart paper-detection on an already-saved sprite and return a fresh
 * cutout, or null if the result would be empty (caller keeps the original).
 * pop is off here — the original already had its colour boost at save time.
 */
export async function recutDataUrl(dataUrl) {
  const img = await loadImage(dataUrl);
  const S = 560;
  const cv = document.createElement('canvas');
  cv.width = S; cv.height = S;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  const s = Math.min(S / img.width, S / img.height);
  const w = img.width * s, h = img.height * s;
  ctx.drawImage(img, (S - w) / 2, (S - h) / 2, w, h);
  cleanupBackground(ctx, S, S);
  return exportSprite(ctx, S, S, { pop: false });
}
