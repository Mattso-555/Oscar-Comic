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

/** Paint-bucket flood fill at (x,y) with hex colour. The kid picks colour AND spot. */
export function floodFill(ctx, W, H, x, y, hex) {
  const img = ctx.getImageData(0, 0, W, H);
  const p = img.data;
  const idx = (X, Y) => (Y * W + X) * 4;
  const sx = Math.floor(x), sy = Math.floor(y);
  if (sx < 0 || sy < 0 || sx >= W || sy >= H) return;
  const i0 = idx(sx, sy);
  const target = [p[i0], p[i0 + 1], p[i0 + 2], p[i0 + 3]];
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if (target[0] === r && target[1] === g && target[2] === b && target[3] === 255) return;
  const TOL = 48;
  const match = (i) =>
    Math.abs(p[i] - target[0]) <= TOL &&
    Math.abs(p[i + 1] - target[1]) <= TOL &&
    Math.abs(p[i + 2] - target[2]) <= TOL &&
    Math.abs(p[i + 3] - target[3]) <= TOL;
  const stack = [[sx, sy]];
  const seen = new Uint8Array(W * H);
  while (stack.length) {
    const [cx, cy] = stack.pop();
    if (cx < 0 || cy < 0 || cx >= W || cy >= H) continue;
    const s = cy * W + cx;
    if (seen[s]) continue;
    seen[s] = 1;
    const i = s * 4;
    if (!match(i)) continue;
    p[i] = r; p[i + 1] = g; p[i + 2] = b; p[i + 3] = 255;
    stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
  }
  ctx.putImageData(img, 0, 0);
}
