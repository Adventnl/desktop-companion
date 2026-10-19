# Validation and build status

Latest local validation: macOS, 19 October 2026.

- JavaScript syntax checks and all 12 unit tests pass.
- Real Electron desktop smoke test passes across a complete restart: the launcher has one button, opening shows the pet and closes the launcher, skins persist through petting/play/sleep/wake, clicking never resizes the window, walking faces travel direction, Sit still stops movement, alpha hit testing works, and saved skin/roaming choices restore.
- All 16 regenerated sprites load, share a 320 × 320 canvas, and have transparent borders. The walking source faces right. Original assets remain for provenance but are not used by the pet renderer.
- Native screenshots `test-results/launcher.png` and `test-results/companion.png` were inspected. Smooth interpolation replaces pixelated rendering; the dashboard and wardrobe are removed.
- The Impeccable mechanical detector reports no findings on the changed renderer files.
- `npm run pack -- --publish never` succeeds for the local Apple silicon Mac. The rebuilt app is `dist/mac-arm64/Miso.app`.

Build artifacts and test screenshots are ignored by Git. Windows native behavior, true multi-monitor behavior, signing/notarization, touchscreen hardware, and full installer acceptance still require the [native release checklist](RELEASING.md). Earlier Linux cross-builds are historical and do not validate these changes on Windows.
