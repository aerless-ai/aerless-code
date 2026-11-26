import { CrossSpawnSpawner } from "@opencode/util/cross-spawn-spawner"
import { LayerNode } from "@opencode/util/effect/layer-node"
import { Deferred, Effect, Schema, Stream } from "effect"
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process"
import { randomBytes } from "node:crypto"
import { selfCommand } from "../util/process"

const Ready = Schema.Struct({ url: Schema.String })
const decodeReady = Schema.decodeUnknownPromise(Schema.fromJsonString(Ready))

type Options = {
  readonly command?: ReadonlyArray<string>
}

const startupDirectory = process.cwd()

function command(password: string, options: Options) {
  const [executable, ...args] = options.command ?? [...selfCommand(), "serve"]
  if (!executable) throw new Error("Failed to resolve standalone server command")
  return ChildProcess.make(executable, [...args, "--stdio", "--port", "0"], {
    cwd: startupDirectory,
    // Explicit entry wins over anything inherited, so a user-exported
    // OPENCODE_PASSWORD cannot shadow the child's lease credential.
    env: { OPENCODE_PASSWORD: password },
    extendEnv: true,
    // The server treats EOF on this pipe as the end of its ownership lease.
    // The OS closes it even when the TUI is killed before Effect finalizers run.
    stdin: "pipe",
    stderr: process.env.OPENCODE_PRINT_LOGS === "1" ? "inherit" : "ignore",
    killSignal: "SIGTERM",
    forceKillAfter: "3 seconds",
  })
}

const makeEndpoint = Effect.fn("cli.standalone.endpoint")(
  function* (options: Options) {
    const password = randomBytes(32).toString("base64url")
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner
    const proc = yield* spawner.spawn(command(password, options))
    const readyLine = yield* Deferred.make<string, Error>()
    // Keep draining stdout after readiness so later server writes cannot hit EPIPE.
    yield* proc.stdout.pipe(
      Stream.decodeText(),
      Stream.splitLines,
      Stream.runForEach((line) => Deferred.succeed(readyLine, line)),
      Effect.ensuring(Deferred.fail(readyLine, new Error("Standalone server exited before reporting readiness"))),
      Effect.forkScoped,
    )
    const output = yield* Deferred.await(readyLine)
    const ready = yield* Effect.tryPromise(() => decodeReady(output))
    return {
      url: ready.url,
      auth: { type: "basic" as const, username: "opencode", password },
      pid: proc.pid,
      exited: proc.exitCode,
    }
  },
  Effect.provide(LayerNode.compile(CrossSpawnSpawner.node)),
)

// Aerless: by default the server runs inside this process. A second process loaded the whole app a second
// time (about 100 MB idle). AERLESS_SPLIT_SERVER=1 restores the separate server process.
const embedded = Effect.fn("cli.standalone.embedded")(function* () {
  const { ServerProcess } = yield* Effect.promise(() => import("../server-process"))
  const ready = yield* Deferred.make<{ url: string; password: string }, Error>()
  yield* Effect.forkDetach(
    ServerProcess.run({
      mode: "embedded",
      port: 0,
      onReady: (url, password) => Effect.runFork(Deferred.succeed(ready, { url, password })),
    }).pipe(Effect.ensuring(Deferred.fail(ready, new Error("Embedded server stopped before it was ready")))),
  )
  const { url, password } = yield* Deferred.await(ready)
  return {
    url,
    auth: { type: "basic" as const, username: "opencode", password },
    pid: process.pid,
  }
})

export function start(options: Options = {}) {
  return makeEndpoint(options)
}

/** The interactive app's server: embedded unless AERLESS_SPLIT_SERVER=1. */
export function startForTui() {
  return process.env.AERLESS_SPLIT_SERVER === "1" ? makeEndpoint({}) : embedded()
}

export * as Standalone from "./standalone"
