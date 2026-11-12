# Firefox image-map regression checks

Requires Python 3, Selenium 4, Firefox, and geckodriver. Install Selenium in a separate virtual environment; the site itself has no package dependencies:

```sh
python3 -m venv /tmp/mandalapuzzle-tests
/tmp/mandalapuzzle-tests/bin/pip install 'selenium>=4,<5'
/tmp/mandalapuzzle-tests/bin/python tests/test_firefox_image_maps.py
```

If Firefox or geckodriver are outside the normal search path, set `FIREFOX_BINARY` and `GECKODRIVER` to their executable paths for the test command.

The suite starts a temporary local HTTP server and uses a disposable browser profile. It checks actual pointer hit testing for every area at 70% and 140% CSS zoom, verifies the puzzle images load, changes Celtic levels, and exercises keyboard selection and saved progress. Overlapping areas retain the original image map's first-area priority.

# Jigsaw layout and reload checks

Requires Node.js, Playwright, and Chromium. Start the site with `python3 -m http.server 8000`, then run:

```sh
node tests/test_jigsaw_layout.cjs
node tests/test_jigsaw_tray_drag.cjs
```

Set `CHROMIUM_BINARY` if Chromium is installed outside `/usr/bin/chromium`. The test uses disposable browser profiles, validates all ten jigsaws against Mosaico's board/tray dimensions, and compares every loose piece's actual coordinates before and after reload.

The drag test uses real pointer events to verify snapping and compaction without gaps, then checks board scrolling and tray dimensions on narrow screens.
## Mobile navigation regression checks

`mobile-navigation.cjs` requires Node.js, Playwright, and Chromium. Start a static
server from the repository root (`python3 -m http.server 8000`), then run:

```sh
node tests/mobile-navigation.cjs
```

Set `TEST_ORIGIN` for another server URL and `CHROMIUM_BINARY` for another Chromium
executable (default `/usr/bin/chromium`). The checks cover the 17 published
image-map puzzles and 11 jigsaws: menu bounds and toggling, fit/enlarge controls,
native touch scrolling, landscape layout, desktop controls, and JavaScript errors.
They use a disposable browser context and do not change real saved progress.

Desktop controls and compatibility with saved preferences:

```sh
node tests/desktop-navigation.cjs
```

This checks menu dragging, resizing, volume, hide/restore, puzzle selection,
wheel zoom, keyboard navigation, mouse-only small windows, and returning from
mobile to desktop without overwriting the saved desktop zoom or panel layout.

## Jigsaw touch checks

```sh
node tests/jigsaw-mobile.cjs
```

Checks all eleven jigsaws at a mobile viewport, native touch exploration, usable
board/tray areas, and menu controls. Mosaico additionally exercises real touch
placement, rejection of drops over the tray, rotation, removal, saved progress,
small screens and landscape. It also checks canvas dragging in Pavão and cancelled
gestures in Green Eye. The “Explorar” control switches between dragging
pieces and scrolling over pieces/canvas; Mosaico also exposes “Girar peça” and
“Retirar peça”. Desktop board coordinates and the existing save formats stay intact.
