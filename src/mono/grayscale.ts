/**
 * Rec. 601 luma as integer 0–255 (deterministic, no gamma).
 * Prefer for text/logos/QR when paired with threshold mode.
 */
export function rgbToLuma(r: number, g: number, b: number): number {
  return Math.round(0.299 * r + 0.587 * g + 0.114 * b);
}

export function buildLumaBuffer(width: number, height: number, rgb: Uint8Array): Float64Array {
  const luma = new Float64Array(width * height);
  for (let i = 0; i < luma.length; i += 1) {
    const o = i * 3;
    luma[i] = rgbToLuma(rgb[o]!, rgb[o + 1]!, rgb[o + 2]!);
  }
  return luma;
}
