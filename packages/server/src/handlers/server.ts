import { existsSync } from "node:fs"
import { homedir, hostname } from "node:os"
import path from "node:path"
import { Duration, Effect, Schema } from "effect"
import { HttpServerRequest, HttpServerResponse } from "effect/http"
import { HttpApiBuilder } from "effect/http-api"
import { PersistentPty } from "@opencode/core/persistent-pty"
import { ServiceUnavailableError, UnauthorizedError } from "@opencode/protocol/errors"
import { ImageModel } from "@opencode/protocol/groups/server"
import { Api } from "../api"
import { ServerAuth } from "../auth"
import { ServerInfo } from "../server-info"
import { ServerPairing } from "../pairing"

export const ServerHandler = HttpApiBuilder.group(Api, "server.server", (handlers) =>
  Effect.gen(function* () {
    const pairing = yield* ServerPairing.Service
    const auth = yield* ServerAuth.Config

    return handlers
      .handle("server.info", () =>
        Effect.gen(function* () {
          const info = yield* ServerInfo.Service
          return {
            version: info.app.version ?? "unknown",
            pid: process.pid ?? 0,
            hostname: hostname() || undefined,
            urls: info.urls(),
            paths: info.paths,
            capabilities: { persistentPty: PersistentPty.available },
          }
        }),
      )
      .handle("server.pair", () => pairing.issue())
      .handle("server.imageModels", () =>
        aerless(["models", "--json"]).pipe(
          Effect.flatMap((out) => decodeImageModels(out)),
          Effect.mapError((error) => new ServiceUnavailableError({ message: error.message, service: "aerless" })),
        ),
      )
      .handle("server.imageModelUse", (ctx) =>
        aerless(["models", "--use", ctx.payload.id]).pipe(
          Effect.asVoid,
          Effect.mapError((error) => new ServiceUnavailableError({ message: error.message, service: "aerless" })),
        ),
      )
      .handle("server.studio", () =>
        aerless(["studio", "--from", "aerless-code"]).pipe(
          Effect.flatMap((out) => {
            const url = out.match(/https?:\/\/\S+/)?.[0]
            return url ? Effect.succeed({ url: url.replace("127.0.0.1", "localhost") }) : Effect.fail(new Error("The picture studio did not print an address."))
          }),
          Effect.mapError((error) => new ServiceUnavailableError({ message: error.message, service: "aerless" })),
        ),
      )
      .handle(
        "server.connect",
        Effect.fn(function* (ctx) {
          const request = yield* HttpServerRequest.HttpServerRequest
          // Browser navigations ask for HTML; everything else is an API client that wants the token.
          const browser = request.headers.accept?.includes("text/html") === true
          const token = (yield* pairing.consume(ctx.params.code)) ? ServerAuth.issueSession(auth) : undefined
          if (token === undefined) {
            if (!browser) return yield* new UnauthorizedError({ message: "Pairing link expired or already used" })
            return HttpServerResponse.text(
              "This pairing link expired or was already used. Run `aerless-code webui` or `aerless-code pair` to get a new one.",
              { status: 401 },
            )
          }
          if (!browser) return { token }
          return HttpServerResponse.redirect("/").pipe(
            HttpServerResponse.setCookieUnsafe(ServerAuth.sessionCookieName(request.headers.host), token, {
              path: "/",
              httpOnly: true,
              sameSite: "lax",
              maxAge: Duration.seconds(ServerAuth.SESSION_TTL_SECONDS),
            }),
          )
        }),
      )
  }),
)

const decodeImageModels = Schema.decodeEffect(Schema.fromJsonString(Schema.Array(ImageModel)))

// The `aerless` CLI: next to this program (the installer puts both in ~/.aerless/bin), else ~/.aerless/bin, else PATH.
function aerlessBin() {
  const name = process.platform === "win32" ? "aerless.exe" : "aerless"
  return (
    [path.join(path.dirname(process.execPath), name), path.join(homedir(), ".aerless", "bin", name)].find((file) =>
      existsSync(file),
    ) ??
    Bun.which("aerless") ??
    undefined
  )
}

function aerless(args: string[]) {
  return Effect.tryPromise({
    try: async () => {
      const bin = aerlessBin()
      if (!bin) throw new Error("The aerless program was not found. Install Aerless from aerless.io.")
      const proc = Bun.spawn([bin, ...args], { stdin: "ignore", stdout: "pipe", stderr: "pipe" })
      const [out, err, code] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
        proc.exited,
      ])
      if (code !== 0) throw new Error(err.trim() || `aerless ${args[0]} failed`)
      return out
    },
    catch: (error) => (error instanceof Error ? error : new Error(String(error))),
  })
}
