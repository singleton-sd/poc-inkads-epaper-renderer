# Changelog

## [1.0.0](https://github.com/singleton-sd/poc-inkads-epaper-renderer/compare/0.4.0...1.0.0) (2026-08-27)

### ⚠ BREAKING CHANGES

* decodeImage, ingestImageToProfile and encodePreviewPng
now import from @singleton-sd/inkads-epaper-renderer/node.

Co-authored-by: Cursor <cursoragent@cursor.com>

### Bug Fixes

* [#21](https://github.com/singleton-sd/poc-inkads-epaper-renderer/issues/21) Narrow browser limits to enforceable ones ([a835201](https://github.com/singleton-sd/poc-inkads-epaper-renderer/commit/a83520134edd6dcdf68d3b4b8ff1aba8faec9cd2))

### Code Refactoring

* [#21](https://github.com/singleton-sd/poc-inkads-epaper-renderer/issues/21) Split browser and Node entry points ([037cadf](https://github.com/singleton-sd/poc-inkads-epaper-renderer/commit/037cadffc3bdaaf50727ebdbafa9994341e4b232))

## [0.4.0](https://github.com/singleton-sd/poc-inkads-epaper-renderer/compare/0.3.0...0.4.0) (2026-08-27)

### Features

* [#19](https://github.com/singleton-sd/poc-inkads-epaper-renderer/issues/19) Average source pixels when downscaling ([10a351d](https://github.com/singleton-sd/poc-inkads-epaper-renderer/commit/10a351dad0ce25c38faa95e8d0447694f2949c82))

### Bug Fixes

* [#19](https://github.com/singleton-sd/poc-inkads-epaper-renderer/issues/19) Weight partly covered pixels by overlap area ([f909b20](https://github.com/singleton-sd/poc-inkads-epaper-renderer/commit/f909b20869f352c13cbd04c8f02ec30f9be039b2))
* [#20](https://github.com/singleton-sd/poc-inkads-epaper-renderer/issues/20) Guard decodeImage against oversized uploads ([e715a65](https://github.com/singleton-sd/poc-inkads-epaper-renderer/commit/e715a650997af40f43d48ef04b8fcd8de509ff32))
* [#20](https://github.com/singleton-sd/poc-inkads-epaper-renderer/issues/20) Validate limit overrides and freeze defaults ([7a08d37](https://github.com/singleton-sd/poc-inkads-epaper-renderer/commit/7a08d372da8d8be1d54805e47b94f8a957f7e346))

## [0.3.0](https://github.com/singleton-sd/poc-inkads-epaper-renderer/compare/0.2.0...0.3.0) (2026-08-27)

### Features

* [#5](https://github.com/singleton-sd/poc-inkads-epaper-renderer/issues/5) Pack framebuffer with preview and checksum ([4493909](https://github.com/singleton-sd/poc-inkads-epaper-renderer/commit/449390994b55b32e458d5f88677b88db307dc3bc))

### Bug Fixes

* [#5](https://github.com/singleton-sd/poc-inkads-epaper-renderer/issues/5) Share row-stride guard with preview ([9ee08b7](https://github.com/singleton-sd/poc-inkads-epaper-renderer/commit/9ee08b7c6938af0babc90638b28162c6a4b385bb))
* [#5](https://github.com/singleton-sd/poc-inkads-epaper-renderer/issues/5) Validate packing and preview profile invariants ([293e4ee](https://github.com/singleton-sd/poc-inkads-epaper-renderer/commit/293e4ee777dd77c36d7231df83c38d4b517f57c4))

## [0.2.0](https://github.com/singleton-sd/poc-inkads-epaper-renderer/compare/0.1.0...0.2.0) (2026-08-27)

### Features

* [#3](https://github.com/singleton-sd/poc-inkads-epaper-renderer/issues/3) Decode PNG/JPEG and cover-fit crop/resize to profile ([8eb4c41](https://github.com/singleton-sd/poc-inkads-epaper-renderer/commit/8eb4c414dea72111f4d32d4556710a9772d87698))
* [#4](https://github.com/singleton-sd/poc-inkads-epaper-renderer/issues/4) Add threshold and dither mono modes ([3cf53d7](https://github.com/singleton-sd/poc-inkads-epaper-renderer/commit/3cf53d74687753aa06f3bb2b0db860cd66a4920f))

## [0.1.0](https://github.com/singleton-sd/poc-inkads-epaper-renderer/compare/0.0.4...0.1.0) (2026-08-26)

### Features

* [#2](https://github.com/singleton-sd/poc-inkads-epaper-renderer/issues/2) Add display profile model ([a7c1887](https://github.com/singleton-sd/poc-inkads-epaper-renderer/commit/a7c18878e225e8366e557257cc6999c4182d2ac0))

### Bug Fixes

* [#2](https://github.com/singleton-sd/poc-inkads-epaper-renderer/issues/2) Address display profile review notes ([53ce013](https://github.com/singleton-sd/poc-inkads-epaper-renderer/commit/53ce013c4673b2131476816df6c84fa68dcc68a5))
* [#2](https://github.com/singleton-sd/poc-inkads-epaper-renderer/issues/2) Guard packed size against integer overflow ([3c55b90](https://github.com/singleton-sd/poc-inkads-epaper-renderer/commit/3c55b907a82ab9f9debf577b4a5897e2633d6aee))

## [0.0.4](https://github.com/singleton-sd/poc-inkads-epaper-renderer/compare/0.0.3...0.0.4) (2026-08-25)

### Bug Fixes

* Make GitHub Releases work with release-it ([60084fe](https://github.com/singleton-sd/poc-inkads-epaper-renderer/commit/60084fe9f10f62d86f1623fd4cbd817b4b325cf1))

## [0.0.3](https://github.com/singleton-sd/poc-inkads-epaper-renderer/compare/0.0.3..0.0.2) (2026-08-25)

## [0.0.2](https://github.com/singleton-sd/poc-inkads-epaper-renderer/compare/0.0.2..0.0.1) (2026-08-25)

## 0.0.1 (2026-08-25)

### Bug Fixes

* [#1](https://github.com/singleton-sd/poc-inkads-epaper-renderer/issues/1) Reject issue number zero in branch helpers ([cfbcceb](https://github.com/singleton-sd/poc-inkads-epaper-renderer/commit/cfbcceb08d7696b027968562a77988f2d24cdc3c))
* [#11](https://github.com/singleton-sd/poc-inkads-epaper-renderer/issues/11) Harden release workflow auth and sync ([39603c3](https://github.com/singleton-sd/poc-inkads-epaper-renderer/commit/39603c3732d03deb514b6e5e5f9b2ee7fae4d89e))
* [#11](https://github.com/singleton-sd/poc-inkads-epaper-renderer/issues/11) Quote release workflow if expression ([5279719](https://github.com/singleton-sd/poc-inkads-epaper-renderer/commit/5279719011d472d9bb67c0934e9660bf948b2a5c))

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
