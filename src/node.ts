/**
 * Server-only additions to the renderer.
 *
 * `@singleton-sd/inkads-epaper-renderer/node` bundles the parts that need Node
 * built-ins or a bundled image codec: decoding uploaded PNG/JPEG bytes, and
 * encoding a preview to a PNG file. Everything else lives in the isomorphic
 * root entry point and runs unchanged in both environments.
 */

export { decodeImage } from './ingest/decode.js';
export type { DecodeImageOptions } from './ingest/decode.js';
export { ingestImageToProfile } from './ingest/ingest.js';
export { encodePreviewPng } from './pack/preview-png.js';
