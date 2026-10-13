# Minimal Todo App

A small, deterministic todo list for validating browser-based test pipelines. The application is a single `index.html` file with inline CSS and vanilla JavaScript; it has no runtime dependencies, backend, database, or build step. Task state is intentionally in memory and resets when the page reloads.

## Run the app

Open `index.html` directly in a browser. No server or installation is required.

## Verify

Node.js 22 or compatible is used for the built-in unit suite:

```sh
node --test tests/todo.test.mjs
```

Playwright is a development-only dependency for browser verification. Install dependencies and Chromium once, then run:

```sh
npm install
node node_modules/@playwright/test/cli.js install chromium
node node_modules/@playwright/test/cli.js test
```

The Playwright config starts a local static server only for browser tests. It does not change the app's direct-file launch behavior. The suite covers task creation by button and Enter, blank-input no-op, completion, deletion, empty state, accessible controls, reload reset, and browser console errors. The preflight spec saves empty and populated screenshots under `test-results/`.
