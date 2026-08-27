export type MonoRenderErrorCode =
  'INVALID_DIMENSIONS' | 'INVALID_RGB_LENGTH' | 'INVALID_MODE' | 'INVALID_THRESHOLD';

export class MonoRenderError extends Error {
  readonly code: MonoRenderErrorCode;

  constructor(code: MonoRenderErrorCode, message: string) {
    super(message);
    this.name = 'MonoRenderError';
    this.code = code;
  }
}
