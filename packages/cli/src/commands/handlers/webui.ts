import { EOL } from "os"
import path from "node:path"
import { Effect, Option } from "effect"
import { Service } from "@opencode/client/effect/service"
import { OpenCode } from "@opencode/client/promise"
import { Commands } from "../commands"
import { Runtime } from "../../framework/runtime"
import { ServiceConfig } from "../../services/service-config"
import { openUrl } from "../../ui/prompt"

export default Runtime.handler(
  Commands.commands.webui,
  Effect.fn("cli.webui")(function* (input: Runtime.Input<typeof Commands.commands.webui>) {
    const config = yield* ServiceConfig.read()
    if (config.disabled === true)
      return yield* Effect.fail(
        new Error("The web interface needs the background service; run `aerless-code service unset disabled` first"),
      )
    // The background service keeps the Aerless port and password between runs, so the browser stays signed in.
    const endpoint = yield* Service.ensure(yield* ServiceConfig.options())
    const page = yield* Effect.tryPromise(() => fetch(endpoint.url, { method: "HEAD" }))
    if (!page.headers.get("content-type")?.startsWith("text/html"))
      return yield* Effect.fail(
        new Error("This build of Aerless Code has no web interface (it was built with --skip-web-ui)"),
      )
    const client = OpenCode.make({ baseUrl: endpoint.url, headers: Service.headers(endpoint) })
    // Loading the directory once makes its project show up in the web interface.
    const directory = Option.getOrUndefined(input.directory)
    if (directory)
      yield* Effect.tryPromise(() => client.location.get({ location: { directory: path.resolve(directory) } }))
    const pairing = yield* Effect.tryPromise(() => client.server.pair())
    const url = new URL(endpoint.url)
    url.hostname = "localhost"
    const link = new URL(`/auth/connect/${pairing.code}`, url).href
    process.stdout.write(
      [
        "",
        `  Aerless web interface: ${link}`,
        `  The link works once and expires in ${Math.round(pairing.expires_in / 60)} minutes; the browser stays signed in.`,
        "",
      ].join(EOL) + EOL,
    )
    if (input.open) yield* openUrl(link)
  }),
)
