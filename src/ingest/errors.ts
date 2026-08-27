export class ImageIngestError extends Error {
  readonly name = 'ImageIngestError';
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}
