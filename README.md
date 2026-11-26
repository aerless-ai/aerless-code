# Aerless Code

The coding assistant for your terminal, with pictures built in. Made by [Aerless](https://aerless.io).

```bash
curl -fsSL https://github.com/havecreator/aerless-code/releases/latest/download/install.sh | sh          # macOS, Linux, WSL
```
```powershell
irm https://github.com/havecreator/aerless-code/releases/latest/download/install.ps1 | iex            # Windows
```

Then open a new terminal and type `aerless` in any project folder. The first time it signs you in.

## What is different from opencode

Aerless Code is a fork of [opencode](https://github.com/anomalyco/opencode) 2.0.26 (MIT). It installs next to opencode and never touches its settings or sessions.

- **Own app:** the `aerless-code` command, its own folders (`~/.config/aerless-code`, `~/.local/share/aerless-code`), the Aerless theme and logo.
- **Lighter:** the interface and its server run in one process, and the 100+ provider catalog loads only when needed. About 300 MB idle instead of about 450-560 MB.
- **Pictures:** `/imgengine` opens the Aerless picture studio; the assistant can make, crop and place images in your project.
- **Signed in from the start:** Aerless, OpenRouter or Venice keys are set up by `aerless login`.
- **Nothing left running:** no background service; quitting stops the commands the assistant started.

## Build from source

Needs Bun 1.4.2.

```bash
bun install
cd packages/cli && bun run script/build.ts --single
```

The build is at `packages/cli/dist/cli-<os>-<arch>/bin/aerless-code`. Release builds of all platforms: `bun run script/build.ts` with `OPENCODE_VERSION` set.

## License

MIT, like opencode. See [LICENSE](LICENSE); opencode's copyright notice is kept as the license requires.
