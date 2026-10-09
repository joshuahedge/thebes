# Thebes

A city builder for phone and desktop browsers, inspired by classic Egyptian city builders. It's a personal hobby project.

## Requirements

Python 3 on your PATH, and Microsoft Edge for the command-line tests.

## Run it locally

    python tests/serve.py 8000 .

Then open http://localhost:8000/.

## Run the tests

    powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1

The script starts `tests/serve.py` and headless Edge. The test page sends its results back to the server by POST (to `/__results`), and the script waits for them on the real clock for up to 45 seconds, retrying once if they never arrive. It exits 0 only when the output ends with `ALL PASSED`.

Add `-Grep "reach"` to run only tests whose full name contains that text. You can also open http://localhost:8000/tests/ in a browser while the server above is running.

## Design

See `docs/superpowers/specs/2026-10-09-thebes-design.md`.
