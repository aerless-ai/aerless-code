# Contributing to Aerless Code

Bug fixes, picture features, speed and memory improvements, and docs are the changes most likely to be merged. For a bigger feature, open an issue first so we can agree on the approach.

## Develop

Needs the Bun version in the `packageManager` field of [`package.json`](../package.json). From the repository root:

```bash
bun install
bun dev [directory]       # the CLI and terminal interface; pass . to open this repository
bun run dev:web           # the web interface (run `bun dev serve --port 4096` in another terminal)
bun run dev:desktop       # the desktop app
```

Build a binary for your machine:

```bash
cd packages/cli && bun run script/build.ts --single
```

## Where things live

| Package | What it does |
| --- | --- |
| `packages/cli` | The `aerless-code` command and its lifecycle |
| `packages/tui` | The terminal interface |
| `packages/core` | Sessions, tools, providers and storage |
| `packages/server` | HTTP server |
| `packages/protocol`, `packages/schema` | API and data contracts |
| `packages/client` | Generated TypeScript client |
| `packages/app` | The web interface |
| `packages/desktop` | The Electron desktop app |
| `packages/ai` | Model and picture calls |
| `packages/plugin` | Plugin API |

## Check your change

Run tests and typechecks in the package you changed, not from the root:

```bash
cd packages/core
bun run test
bun typecheck
```

`bun run check` at the root runs lint and every typecheck; the pre-push hook runs it too. After changing the Protocol or Server API, run `bun run generate` in `packages/client`. Never edit generated client files by hand. Follow the style guide in [AGENTS.md](../AGENTS.md) and any `AGENTS.md` in the package you touch.

## Pull requests

- Keep them small and focused, and say what you tested.
- For interface changes, add a before and after screenshot.
- Title them `type(scope): summary`, for example `fix(tui): keep the scroll position`. Types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`.
- Reference the issue with `Fixes #123` when there is one.
