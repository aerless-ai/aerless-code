import { Schema } from "effect"
import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema, OpenApi } from "effect/http-api"
import { ServiceUnavailableError, UnauthorizedError } from "../errors.js"

export const ServerInfo = Schema.Struct({
  version: Schema.String,
  // 0 means the runtime has no OS process identity (e.g. workerd).
  pid: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  // The machine's name, absent where the runtime has none (e.g. workerd).
  hostname: Schema.optional(Schema.String),
  urls: Schema.Array(Schema.String),
  paths: Schema.Struct({
    tmp: Schema.String,
  }),
  // Optional at every level so clients still decode servers that predate a capability.
  capabilities: Schema.optional(
    Schema.Struct({
      persistentPty: Schema.optional(Schema.Boolean),
    }),
  ),
}).annotate({ identifier: "ServerInfo" })
export type ServerInfo = typeof ServerInfo.Type

export const PairingCode = Schema.Struct({
  code: Schema.String,
  expires_in: Schema.Int,
}).annotate({ identifier: "PairingCode" })
export type PairingCode = typeof PairingCode.Type

export const PairingSession = Schema.Struct({
  token: Schema.String,
}).annotate({ identifier: "PairingSession" })
export type PairingSession = typeof PairingSession.Type

// One picture model from `aerless models --json`; price is null when the provider sets it.
export const ImageModel = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  price: Schema.NullOr(Schema.Number),
  edits: Schema.Boolean,
  default: Schema.Boolean,
}).annotate({ identifier: "ImageModel" })
export type ImageModel = typeof ImageModel.Type

export const PAIRING_CONNECT_PATH = "/auth/connect/:code"

const PAIRING_CONNECT_URL = /^\/auth\/connect\/[^/]+$/

export function isPairingConnectURL(url: URL) {
  return PAIRING_CONNECT_URL.test(url.pathname)
}

export const ServerGroup = HttpApiGroup.make("server.server")
  .add(
    HttpApiEndpoint.get("server.info", "/api/info", {
      success: ServerInfo,
    }).annotateMerge(
      OpenApi.annotations({
        identifier: "server.info",
        summary: "Get server info",
        description: "Return the server identity, connection URLs, paths, and readiness status.",
      }),
    ),
  )
  .add(
    HttpApiEndpoint.post("server.pair", "/api/pair", {
      success: PairingCode,
    }).annotateMerge(
      OpenApi.annotations({
        identifier: "server.pair",
        summary: "Create pairing code",
        description: "Create a short-lived, single-use code for a /auth/connect/:code pairing link.",
      }),
    ),
  )
  .add(
    HttpApiEndpoint.get("server.connect", PAIRING_CONNECT_PATH, {
      params: { code: Schema.String },
      success: PairingSession,
      error: UnauthorizedError,
    }).annotateMerge(
      OpenApi.annotations({
        identifier: "server.connect",
        summary: "Redeem pairing code",
        description:
          "Redeem a pairing code. Browsers receive a session cookie and a redirect to the web app; requests that accept JSON receive a session token to use as the password.",
      }),
    ),
  )
  .add(
    HttpApiEndpoint.get("server.imageModels", "/api/image-models", {
      success: Schema.Array(ImageModel),
      error: ServiceUnavailableError,
    }).annotateMerge(
      OpenApi.annotations({
        identifier: "server.imageModels.list",
        summary: "List picture models",
        description: "The Aerless picture models (`aerless models --json`), the default one marked. Experimental.",
      }),
    ),
  )
  .add(
    HttpApiEndpoint.post("server.imageModelUse", "/api/image-models", {
      payload: Schema.Struct({ id: Schema.String }),
      success: HttpApiSchema.NoContent,
      error: ServiceUnavailableError,
    }).annotateMerge(
      OpenApi.annotations({
        identifier: "server.imageModels.use",
        summary: "Set default picture model",
        description: "Save a picture model as the default (`aerless models --use <id>`). Experimental.",
      }),
    ),
  )
  .add(
    HttpApiEndpoint.post("server.studio", "/api/studio", {
      success: Schema.Struct({ url: Schema.String }),
      error: ServiceUnavailableError,
    }).annotateMerge(
      OpenApi.annotations({
        identifier: "server.studio.open",
        summary: "Open the picture studio",
        description: "Run `aerless studio --from aerless-code` and return the studio URL it prints. Experimental.",
      }),
    ),
  )
  .annotateMerge(OpenApi.annotations({ title: "server" }))
