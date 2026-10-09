# Thebes

A city builder for phone and desktop browsers, inspired by classic Egyptian city builders. It's a personal hobby project.

## Run it locally

    python -m http.server 8000

Then open http://localhost:8000/.

## Run the tests

    powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1

Add `-Grep "reach"` to run only matching tests. You can also open http://localhost:8000/tests/ in a browser while the server above is running.

## Design

See `docs/superpowers/specs/2026-10-09-thebes-design.md`.
