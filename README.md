# Thebes

A city builder for phone and desktop browsers, inspired by classic Egyptian city builders. It's a personal hobby project.

## Requirements

Python 3 on your PATH, and Microsoft Edge for the command-line tests.

## Run it locally

    python tests/serve.py 8000 .

Then open http://localhost:8000/.

## Dev view

While the real interface is being built, `dev.html` shows the simulation running with the renderer:

    python tests/serve.py 8000 .

Then open http://localhost:8000/dev.html. Add `?seed=7` for another map, `?stress=1` for a full 64×64 city, or `&speed=0` to start paused. Keys: arrows or WASD pan, + and − zoom, 0–3 set the speed, O cycles the overlays, G toggles the tile grid, R reloads with the next seed. Drag to pan and use the wheel to zoom with a mouse.

`tests/screenshot.ps1 -Url '/dev.html?seed=1' -Out shot.png -Width 1280 -Height 800` saves a PNG of the page from headless Edge.

## Run the tests

    powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1

The script starts `tests/serve.py` and headless Edge. The test page sends its results back to the server by POST (to `/__results`), and the script waits for them on the real clock for up to 45 seconds, retrying once if they never arrive. It exits 0 only when the output ends with `ALL PASSED`.

Add `-Grep "reach"` to run only tests whose full name contains that text. You can also open http://localhost:8000/tests/ in a browser while the server above is running.

## Design

See `docs/superpowers/specs/2026-10-09-thebes-design.md`.
