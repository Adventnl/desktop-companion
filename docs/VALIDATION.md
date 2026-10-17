# Validation and build status

Verified in the Linux cloud development machine:

- Clean, lockfile-based dependency installation (`npm ci`).
- JavaScript syntax checks and all 12 unit tests for preferences, movement, monitor bounds, and pose selection.
- Real Electron desktop smoke test: transparent captures, always-on-top configuration, sandboxed renderers, control panel actions, pet pointer events, wardrobe, size, speed, hiding/showing, click-through recovery, actual native window movement, reduced motion, per-pixel hit testing, and settings restored after a full process restart.
- Native X11 mouse click and drag on the final packaged application, with Xvfb and a window manager: clicking reacts; dragging moves the companion by the expected displacement.
- Packaged Linux application startup: both windows load from `app.asar`, with the preload bridge and all images present.
- Cross-built Windows portable executables for x64, ARM64, and a combined executable. These are unsigned development builds and have not been run on Windows here.
- Cross-built Intel and Apple silicon Mac application ZIPs. These are unsigned development builds and have not been run on macOS here.

Build artifacts are generated in ignored `dist/`, not checked into Git. The screenshot from the desktop test is in `test-results/companion-controls.png`. The release workflow is configured but has not been run from this cloud checkout.

The regular Windows NSIS installer cross-build encountered a Linux Wine runtime failure while generating its uninstaller. Incomplete installer files were removed. The app packages and portable build completed; the standard installer should be built and tested on the configured native Windows CI runner. Mac DMG creation, Developer ID signing, and notarization also require the native Mac runner.

Linux tests use Xvfb. In this restricted container, Chromium’s privileged sandbox helper cannot be installed, so the test runner is launched with the explicit `MISO_TEST_NO_SANDBOX=1` container-only override. Normal application startup and platform builds do not disable the sandbox. A running window manager is necessary for realistic X11 stacking and native mouse interaction checks.

Before public release, complete [the native installation and signing checklist](RELEASING.md). Platform acceptance testing, signing/notarization, touchscreen hardware, and true multi-monitor macOS/Windows behavior remain unverified in this Linux machine.
