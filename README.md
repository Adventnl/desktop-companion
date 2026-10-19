# Miso

A little ghost. A good little friend.

Miso is a desktop companion for **Windows and macOS** built with Electron. Open the app, click **Open Miso**, and the ghost cat appears on your desktop. It wanders, reacts to pets, plays, and naps. Everything runs locally, with no account, API key, or internet connection needed after installation.

## Install

Download the installer for your computer from the artifacts of a successful **Test and build desktop apps** run in this repository’s GitHub Actions tab. Unzip the artifact first.

- **Windows:** run `Miso-…-win.exe`. The combined installer selects x64 or ARM64 for your PC, installs for your user without administrator access, and creates a desktop shortcut. Uninstall from Windows Settings → Apps.
- **Mac:** open `Miso-…-mac-arm64.dmg` for Apple silicon, or `…-x64.dmg` for Intel. Drag Miso into Applications, eject the disk image, then open Miso from Applications. To remove it, quit Miso and move the application to Trash.

Installers become available **after the workflow has run**; this checkout does not include a prebuilt Windows or Mac installer. Public distribution without operating-system trust prompts requires signing Windows builds and signing and notarizing Mac builds. See [release instructions](docs/RELEASING.md). Do not disable Gatekeeper or SmartScreen to install an untrusted binary.

## A little company

| Do this | Miso does this |
| --- | --- |
| Click / tap the cat | Shows a little love (or wakes up) |
| Drag the cat | Moves to your favorite corner |
| Right-click the cat | Opens actions: Sit still / Wander around, Change skin, Play, and Take a nap |
| Click the tray / menu bar icon | Shows Miso |
| `Ctrl+Shift+M` / `⌘⇧M` | Recalls Miso to your cursor |

There is no dashboard or wardrobe window. The launcher has one button and closes when Miso opens. Right-click **Change skin** to choose Just Miso, Witch hat, Pumpkin, or Cardboard box. The chosen skin stays on while petting, playing, walking, and sleeping. All sprites share a fixed canvas and scale; clicking never resizes the pet. Choose **Quit Miso** from the right-click or tray menu to exit. Some Windows tray icons are under the overflow arrow.

Transparent parts of the pet window pass clicks through to the desktop. Hovering the cat pauses roaming so it is easy to catch. **Sit still** stops roaming until you choose **Wander around**. The cat also pauses while its right-click menu is open. Miso stays within display work areas, avoiding the dock and taskbar, and occasionally visits another connected screen. On monitor removal or wake from sleep, its position is brought back onto an available display.

The overlay sits above normal applications. Operating-system security prompts, the lock screen, some exclusive fullscreen games, and certain fullscreen apps can appear above it. No Accessibility, screen recording, or administrator permissions are needed for normal features. Touch works through ordinary pointer events on supported touch displays; macOS normally uses a mouse or trackpad.

## Develop

Use the existing checkout in each isolated cloud task; a Git worktree is unnecessary.

Install **Node.js 24 LTS or newer**, then:

```sh
npm ci
npm start
```

`npm ci` installs the pinned Electron runtime (including its verified native binary) and packaging tools. No frontend build server or backend is needed. Start the app in a native desktop session. Launch at login is available only in the packaged Windows or Mac app and is off by default.

```sh
npm run check          # JavaScript syntax
npm test               # Movement, monitor bounds, settings, and pose rules
npm run test:desktop   # Real Electron windows, UI/IPC, roaming, restart persistence
npm run pack           # Package an unpacked app for the current host
npm run dist:win       # Windows installers (run on Windows)
npm run dist:portable  # Windows portable executable, no installation needed
npm run dist:mac       # Apple silicon + Intel DMG and ZIP (run on macOS)
```

Build outputs go into `dist/`. Desktop test screenshots go into `test-results/`. Desktop tests use a temporary preference directory and do not change normal settings. On headless Linux, a running X server such as Xvfb is required. The optional `MISO_TEST_NO_SANDBOX=1` flag is only for disposable Linux test containers that cannot enable the Chromium sandbox; normal launches and packaged builds retain the sandbox.

The portable Windows build can be launched directly without installation. Launch at login is disabled in portable mode because the app is unpacked to a temporary location each time. A Mac ZIP contains `Miso.app`, which can be copied to Applications. Unsigned builds still require a trusted publisher for frictionless installation; the archives produced on Linux are development artifacts, not signed releases.

In a cloud machine with a read-only home directory, use writable `XDG_CACHE_HOME` and `XDG_CONFIG_HOME` paths under `/workspace` for development. If the environment uses an HTTPS proxy, Node 24 can use it with `NODE_USE_ENV_PROXY=1` during installation. Keep TLS and artifact checksum verification enabled.

## Inside the app

- `src/main.js` owns native windows, the tray, settings, per-pixel mouse pass-through, multi-display movement, and IPC validation.
- `src/core.js` contains pure movement, settings, and sprite-selection rules.
- `src/preload.js` exposes a small API to sandboxed, isolated renderers. Node integration is disabled and pages enforce a restrictive content security policy.
- `src/renderer/` contains the transparent companion and single-button launcher. No remote content, analytics, or external fonts are loaded.
- `assets/cat/hd/` contains the regenerated smooth artwork: 16 transparent, consistently aligned 320 × 320 frames for four skins and four poses. Every walking sprite faces right in the source; the renderer mirrors it for leftward travel. [Generation prompt and provenance](assets/cat/hd/GENERATION.md) are included. `scripts/prepare-sprites.cjs` mechanically slices the source sheet without redrawing or enlarging it.
- `assets/cat/` retains the original supplied PNGs for provenance. The app uses the regenerated set with smooth interpolation rather than enlarging the old pixel art.

Preferences are saved atomically in `settings.json` under Electron’s per-user app data directory (`%APPDATA%/Miso` on Windows, `~/Library/Application Support/Miso` on macOS). No application or activity data is transmitted. Provenance notes from the supplied archive are retained in `assets/ASSET-NOTES.txt`.

## Verification status

The configured CI workflow will run the Node tests and Electron desktop smoke test on both native platforms. A Linux cloud smoke test verifies the shared implementation and transparent window captures; it cannot establish macOS Spaces behavior, Windows touch hardware, native installer behavior, signing, or notarization. Perform the native checklist in [RELEASING.md](docs/RELEASING.md) before distributing a release.
