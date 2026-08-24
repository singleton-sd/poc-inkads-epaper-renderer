# InkAds e-paper renderer

Shared TypeScript package that converts advertiser artwork into
**display-ready e-paper assets** for InkAds.

The same implementation is intended for:

- browser preview (marketing demo and advertiser UI)
- backend asset processing
- deterministic fixtures used to validate firmware on Waveshare hardware

Image processing stays in this package / the cloud. ESP32 firmware consumes
packed framebuffer bytes only.

## Status

Proof of concept. The public API and first Waveshare 7.5″ black-and-white
profile are under active construction — see [GitHub Issues](https://github.com/singleton-sd/poc-inkads-epaper-renderer/issues).

## Initial display profile

| Field | Value |
| --- | --- |
| Panel | Waveshare 7.5″ B/W |
| Resolution | 800×480 |
| Depth | 1 bit per pixel |
| Packed size | 48,000 bytes |

## Related repositories

- [`poc-inkads-marketing`](https://github.com/singleton-sd/poc-inkads-marketing) — public site / interactive preview consumer
- [`poc-inkads-firmware-display-device`](https://github.com/singleton-sd/poc-inkads-firmware-display-device) — ESP32 device firmware
- [`poc-inkads-assets`](https://github.com/singleton-sd/poc-inkads-assets) — brand SVG/PNG masters (not this package)

## Architecture reference

Follow repository conventions, TypeScript standards, and testing patterns from
[`poc-plattform-kit`](https://github.com/singleton-sd/poc-plattform-kit) where
applicable.

## License

Proprietary — Singleton SD. This repository is public for PoC collaboration;
do not commit secrets or commercially sensitive material.
