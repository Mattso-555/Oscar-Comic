// Image processing for the kid's own drawings.
// Principle: we enhance presentation of THEIR art (lighting, edges, cutout)
// but never add, choose, or generate artwork.

/** Photo upload: turn paper into transparency with a long soft ramp. */
export function cleanupBackground(ctx, w, h) {
  const d = ctx.getImageData(0, 0, w, h);
  const p = d.data;
  for (let i = 0; i < p.length; i += 4) {
    const lum = (p[i] + p[i + 1] + p[i + 2]) / 3;
    if (lum > 215) p[i + 3] = 0;
    else if (lum > 140) p[i + 3] = Math.round(((215 - lum) / 75) ** 1.4 * 255);
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
  if (sx < 0 || sy < 0 || sx >= W || sy >= H) return;

  const N = W * H;
  const seed = sy * W + sx;
  const i0 = seed * 4;
  const target = [p[i0], p[i0 + 1], p[i0 + 2], p[i0 + 3]];

  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if (target[0] === r && target[1] === g && target[2] === b && target[3] === 255) return;

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
  if (barrier[seed]) return; // tapped directly on a line — nothing to fill

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
  for (let s = 0; s < N; s++) {
    if (region[s]) {
      const i = s * 4;
      p[i] = r; p[i + 1] = g; p[i + 2] = b; p[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}
