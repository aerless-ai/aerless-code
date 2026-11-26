import fs from "node:fs"
import os from "node:os"
import path from "node:path"

// The app's global folders resolve from XDG variables when first imported, so point them at a throwaway root
// before any test module loads. Tests and the CLI processes they spawn never touch the developer's real
// ~/.config/aerless-code, ~/.local/share/aerless-code, ~/.local/state/aerless-code or ~/.cache/aerless-code.
// Bun.spawn without `env` passes the environment the test process started with, so spawning tests pass process.env.
const root = fs.mkdtempSync(path.join(os.tmpdir(), "aerless-code-test-home-"))
process.env.XDG_DATA_HOME = path.join(root, "data")
process.env.XDG_CACHE_HOME = path.join(root, "cache")
process.env.XDG_CONFIG_HOME = path.join(root, "config")
process.env.XDG_STATE_HOME = path.join(root, "state")
process.env.OPENCODE_TEST_HOME ??= root
