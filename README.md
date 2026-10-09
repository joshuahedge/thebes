# Thebes

A city builder for phone and desktop browsers, inspired by classic Egyptian city builders. It's a personal hobby project.

## Requirements

Python 3 on your PATH, and Microsoft Edge for the command-line tests.

## Run it locally

    python tests/serve.py 8000 .

Then open http://localhost:8000/.

## Run the tests

    powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1

Add `-Grep "reach"` to run only matching tests. You can also open http://localhost:8000/tests/ in a browser while the server above is running.

## Design

See `docs/superpowers/specs/2026-10-09-thebes-design.md`.
