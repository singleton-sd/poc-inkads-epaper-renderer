import { Buffer } from 'node:buffer';
import { PNG } from 'pngjs';

import type { PreviewImage } from './preview.js';

/**
 * Encode a preview as PNG bytes for consumers that store or serve a file.
 *
 * Server-side only. Browsers should render the `PreviewImage` straight to a
 * canvas via `ImageData`, or use `canvas.toBlob()` when a file is needed.
 */
export function encodePreviewPng(preview: PreviewImage): Uint8Array {
  const png = new PNG({ width: preview.width, height: preview.height });
  png.data = Buffer.from(preview.data.buffer, preview.data.byteOffset, preview.data.length);
  return Uint8Array.from(PNG.sync.write(png));
}
