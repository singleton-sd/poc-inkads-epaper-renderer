export type PackErrorCode =
  | 'PROFILE_MISMATCH'
  | 'INVALID_BITMAP'
  | 'PACKED_LENGTH_MISMATCH'
  | 'UNSUPPORTED_PACKING'
  | 'UNSUPPORTED_ORIENTATION';

export class FramebufferPackError extends Error {
  readonly code: PackErrorCode;

  constructor(code: PackErrorCode, message: string) {
    super(message);
    this.name = 'FramebufferPackError';
    this.code = code;
  }
}
