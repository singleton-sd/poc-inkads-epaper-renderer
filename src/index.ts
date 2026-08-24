/**
 * Shared InkAds e-paper renderer.
 *
 * Framework-independent TypeScript package for converting advertiser artwork
 * into display-ready e-paper assets. Concrete render modes and display
 * profiles land in follow-up issues.
 */

export const RENDERER_PACKAGE_NAME = '@singleton-sd/inkads-epaper-renderer' as const;

export type RendererStub = {
  readonly packageName: typeof RENDERER_PACKAGE_NAME;
  readonly version: string;
};

/**
 * Temporary public surface so tooling, CI, and consumers can import the package
 * before the full renderer API exists.
 */
export function createRendererStub(version = '0.0.0'): RendererStub {
  return {
    packageName: RENDERER_PACKAGE_NAME,
    version,
  };
}
