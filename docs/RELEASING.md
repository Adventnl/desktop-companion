# Building and distributing Miso

## Make the installers

Run the **Test and build desktop apps** GitHub Actions workflow after pushing the project. It tests and builds on native Windows and macOS runners, producing a combined Windows x64/ARM64 per-user NSIS installer (`.exe`), and separate Apple silicon and Intel disk images (`.dmg`) and app archives (`.zip`).

The workflow uploads build artifacts; it does not create or publish a GitHub release. Download and verify the artifacts, then attach the installers to a release when ready. Version filenames follow `package.json`.

Local builds require Node 24+ and `npm ci`. Use `npm run dist:win -- --publish never` on Windows or `npm run dist:mac -- --publish never` on macOS. Apple’s tooling and notarization require macOS. Use native runners to avoid Wine and cross-compilation limitations.

## Signing

Development builds are useful for private testing. Without certificates, the native workflow makes unsigned Windows builds and ad-hoc signed Mac builds (with hardened runtime disabled for those test builds). Ad-hoc signing lets the altered Mac executable run on Apple silicon; it does not establish a trusted publisher identity or provide notarization. The Mac archives cross-built on Linux have no signing applied and should be replaced with native builds before distribution. A smooth public installation needs a trusted publisher identity. Store signing material as GitHub Actions secrets, never in the repository.

For macOS, add:

| Secret | Purpose |
| --- | --- |
| `MAC_CERTIFICATE` | Base64-encoded Developer ID Application certificate (`.p12`) |
| `MAC_CERTIFICATE_PASSWORD` | Password for that certificate |
| `APPLE_ID` | Apple developer account for notarization |
| `APPLE_APP_SPECIFIC_PASSWORD` | App-specific password for notarization |
| `APPLE_TEAM_ID` | Apple developer team identifier |

The workflow passes the certificate to electron-builder using `CSC_LINK` and `CSC_KEY_PASSWORD` and requires signing to succeed when a certificate is supplied. electron-builder automatically notarizes a signed macOS build when the complete Apple credential set is present. Hardened runtime and the V8 JIT entitlement are configured for signed distribution builds. Confirm notarization in the build log, then verify the downloaded application:

```sh
codesign --verify --deep --strict --verbose=2 /Applications/Miso.app
spctl --assess --type execute --verbose=2 /Applications/Miso.app
xcrun stapler validate /Applications/Miso.app
```

For Windows, add `WIN_CERTIFICATE` (base64 `.p12`) and `WIN_CERTIFICATE_PASSWORD`. The workflow passes them to electron-builder. Your certificate provider may require hardware-backed or cloud signing; configure electron-builder’s supported integration separately for that provider. A new signed Windows application can still receive SmartScreen reputation prompts.

Do not treat an unsigned artifact as signed or publish a Mac app if notarization failed. No signing material or developer credentials are included with this project.

## Native release checklist

On a clean Windows PC and a Mac, install the matching architecture and verify:

1. The installer completes, the application opens, and the cat has a transparent background above ordinary applications.
2. Click/tap reacts; drag moves; double-click opens controls; transparent areas let desktop clicks through. The tray/menu bar remains accessible after closing controls.
3. All four outfits, petting, play, sleep/wake, size, speed, visibility, and reduced motion work. Preferences persist after quitting and restarting.
4. With click-through on and with the cat hidden, the tray and `Ctrl+Shift+M` / `⌘⇧M` can recover it. If another app owns the shortcut, the UI reports this and the tray still works.
5. Try multiple monitors, including negative coordinates, different scale factors, and unplugging a monitor. Try macOS Spaces and fullscreen apps. Document platform-specific overlay limitations.
6. Enable launch at login in the installed app, sign out/in, verify it starts in the background, then disable it and verify it no longer starts.
7. Verify signatures, macOS notarization, and installer provenance. Uninstall and confirm the app and shortcuts are removed. Preferences are retained on Windows for reinstalls; they can be removed from the documented user data folder.

The cloud machine cannot replace this native acceptance check. The automated smoke test exercises real Electron windows, UI actions, movement, transparency, and persistence, but does not simulate a complete desktop compositor or installer session.
