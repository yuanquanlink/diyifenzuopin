# Vendored TIC-80 web build

Artifact: `tic80-v1.4-html.zip` from the v1.4.1 release (27 Oct 2026).

- Source: https://github.com/nesbox/TIC-80
- Release: https://github.com/nesbox/TIC-80/releases/tag/v1.4.1
- Files: `tic80.js`, `tic80.wasm` (the studio and the cart player are this one binary)
- TIC-80 license: MIT, Copyright (c) 2017 Vadim Grigoruk. See `LICENSE`.

`tic80.wasm` is unmodified. `tic80.js` is the official glue with five callbacks added so this spike can see the filesystem, the heap, and cart preload. The markers are `Module.FS`, `Module.HEAPU8`, `Module.onFolderReady`, `Module.onFsFlush`, and `Module.onCartReady`. Reapply them from a fresh official `tic80.js` with `node scripts/patch-tic80.mjs`.

## Third-party review

Reviewed `THIRD_PARTY_LICENSES.md` (TIC-80 main, read 27 Nov 2026) against this html artifact. The license texts it points at are copied in `LICENSES/`. The html zip is the full studio build, so the language runtimes below are inside `tic80.wasm` (their names appear in the binary): Lua, Fennel, MoonScript, YueScript, Wren, Squirrel, mruby, Janet, QuickJS, Gravity, pocketpy, wasm3, and s7.

Most of those are MIT. The ones that are not, and that this binary can actually include:

- **blip_buf** — LGPL-2.1-or-later. TIC-80 uses it as the audio resampler. It is linked into this wasm, not shipped as a separate shared library. The LGPL text is in `LICENSES/LGPL-2.1-or-later.txt`. The corresponding source is the TIC-80 tree at tag v1.4.1 (https://github.com/nesbox/TIC-80), which vendors blip_buf.
- **libpng** — libpng license, `LICENSES/libpng-2.0.txt`. Used when a cart is saved or loaded as a PNG.
- **zlib** — zlib license. Cart code used to be zipped; the current loader still carries the unzip path.

`GPL-3.0-or-later.txt` is upstream's license file for components that are not necessarily in every build. This spike does not add GPL code of its own. The wasm is the official release binary, redistributed under TIC-80's MIT license together with the third-party notices above.

The shell around the glass is separate and MIT. See the repository `LICENSE`.
