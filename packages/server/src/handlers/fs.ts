import { FileSystem } from "@opencode/core/filesystem"
import { FileWatch } from "@opencode/core/filesystem/file-watch"
import { Location } from "@opencode/core/location"
import { Project } from "@opencode/core/project"
import { Session } from "@opencode/core/session"
import { RelativePath } from "@opencode/core/schema"
import { ProjectID } from "@opencode/schema/project-id"
import { FileNotFoundError, ForbiddenError, ServiceUnavailableError } from "@opencode/protocol/errors"
import { Effect, Option, Stream } from "effect"
import { HttpServerRequest, HttpServerResponse } from "effect/http"
import { HttpApiBuilder } from "effect/http-api"
import { stat } from "node:fs/promises"
import path from "path"
import { Api } from "../api"
import { ContentHeaders } from "../content-headers"
import { response } from "../location"
import { ByteRange } from "../range"

export const FileSystemHandler = HttpApiBuilder.group(Api, "server.fs", (handlers) =>
  Effect.gen(function* () {
    const fileWatch = yield* FileWatch.Service
    const projects = yield* Project.Service
    const sessions = yield* Session.Service
    return handlers
      .handleRaw("fs.read", (ctx) =>
        Effect.gen(function* () {
          const path = yield* decodeRequestPath(ctx.request.url)
          const fs = yield* FileSystem.Service
          const file = yield* fs
            .read({ path })
            .pipe(
              Effect.mapError(
                (error) => new FileNotFoundError({ path: error.path, message: `File not found: ${error.path}` }),
              ),
            )
          return serveFile(ctx.request, file, ContentHeaders.download({ path, mime: file.mime }))
        }),
      )
      .handle("fs.list", (ctx) =>
        response(
          Effect.gen(function* () {
            const fs = yield* FileSystem.Service
            return yield* fs
              .list(ctx.query)
              .pipe(
                Effect.mapError(
                  (error) => new FileNotFoundError({ path: error.path, message: `Directory not found: ${error.path}` }),
                ),
              )
          }),
        ),
      )
      .handle("fs.find", (ctx) =>
        response(
          Effect.gen(function* () {
            const fs = yield* FileSystem.Service
            return yield* fs.find(ctx.query)
          }),
        ),
      )
      .handle("fs.write", (ctx) =>
        response(
          Effect.gen(function* () {
            const fs = yield* FileSystem.Service
            return yield* fs.write({ path: ctx.query.path, data: ctx.payload })
          }),
        ),
      )
      .handle("fs.watch", (ctx) =>
        Effect.gen(function* () {
          const fs = yield* FileSystem.Service
          const location = yield* Location.Service
          // Same confinement as read: the file must exist inside the location.
          yield* fs
            .read({ path: RelativePath.make(ctx.payload.path) })
            .pipe(
              Effect.mapError(
                (error) => new FileNotFoundError({ path: error.path, message: `File not found: ${error.path}` }),
              ),
            )
          yield* fileWatch
            .watch({
              location: { directory: location.directory, workspaceID: location.workspaceID },
              file: path.resolve(location.directory, ctx.payload.path),
            })
            .pipe(
              Effect.mapError(
                (error) => new ServiceUnavailableError({ message: error.message, service: "filewatcher" }),
              ),
            )
        }),
      )
      .handle("fs.open", (ctx) =>
        Effect.gen(function* () {
          const request = yield* HttpServerRequest.HttpServerRequest
          if (!fromThisMachine(request))
            return yield* new ForbiddenError({ message: "Files open only from the server's own machine" })
          const location = yield* Location.Service
          const target = path.resolve(location.directory, ctx.payload.path)
          // Only inside a project, or one of its worktrees, that has sessions: the location middleware registers any
          // folder a request names as a project, so being one says nothing about the user having worked there.
          const inside = (root: string) => {
            const relative = path.relative(root, target)
            return !relative.startsWith("..") && !path.isAbsolute(relative)
          }
          const candidates = (yield* projects.list()).filter(
            (project) => project.id !== ProjectID.global && [project.canonical, ...project.sandboxes].some(inside),
          )
          const worked = yield* Effect.filter(candidates, (project) =>
            sessions.list({ project: project.id, limit: 1 }).pipe(
              Effect.map((page) => page.data.length > 0),
              Effect.orElseSucceed(() => false),
            ),
          )
          if (worked.length === 0)
            return yield* new ForbiddenError({ message: `Not inside a project with sessions: ${ctx.payload.path}` })
          yield* Effect.tryPromise(() => stat(target)).pipe(
            Effect.mapError(() => new FileNotFoundError({ path: target, message: `File not found: ${target}` })),
          )
          Bun.spawn(systemOpen(target, ctx.payload.reveal === true, ctx.payload.app), {
            stdio: ["ignore", "ignore", "ignore"],
          }).unref()
        }),
      )
      .handle("fs.unwatch", (ctx) =>
        Effect.gen(function* () {
          const location = yield* Location.Service
          yield* fileWatch.unwatch({
            location: { directory: location.directory, workspaceID: location.workspaceID },
            file: path.resolve(location.directory, ctx.payload.path),
          })
        }),
      )
  }),
)

// The request's peer and the address it asked for are both this machine, and no proxy (such as the remote tunnel)
// forwarded it: a window opening on the server's screen is only useful to someone sitting at it.
function fromThisMachine(request: HttpServerRequest.HttpServerRequest) {
  const host = request.headers.host
  if (request.headers["x-forwarded-for"] !== undefined || host === undefined || !URL.canParse(`http://${host}`))
    return false
  return (
    isLoopback(Option.getOrUndefined(request.remoteAddress) ?? "") && isLoopback(new URL(`http://${host}`).hostname)
  )
}

function isLoopback(address: string) {
  return ["localhost", "::1", "[::1]", "::ffff:127.0.0.1"].includes(address) || address.startsWith("127.")
}

function systemOpen(target: string, reveal: boolean, app: string | undefined) {
  if (process.platform === "darwin") return ["open", ...(reveal ? ["-R"] : app ? ["-a", app] : []), target]
  if (process.platform === "win32") return ["explorer", reveal ? `/select,${target}` : target]
  return ["xdg-open", reveal ? path.dirname(target) : target]
}

function decodeRequestPath(url: string) {
  const raw = new URL(url, "http://localhost").pathname.slice(13)
  return Effect.try({
    try: () => RelativePath.make(decodeURIComponent(raw)),
    catch: () => new FileNotFoundError({ path: raw, message: `File not found: ${raw}` }),
  })
}

function serveFile(
  request: HttpServerRequest.HttpServerRequest,
  file: FileSystem.File,
  content: ReturnType<typeof ContentHeaders.download>,
) {
  const etag = `W/"${file.size.toString(16)}-${Option.match(file.mtime, {
    onNone: () => "0",
    onSome: (mtime) => mtime.getTime().toString(16),
  })}"`
  const lastModified = Option.getOrUndefined(Option.map(file.mtime, (mtime) => mtime.toUTCString()))
  // Clients must revalidate after agent edits; no-transform keeps compression from changing Content-Length.
  const validators = {
    "cache-control": "no-cache, no-transform",
    etag,
    ...(lastModified === undefined ? {} : { "last-modified": lastModified }),
  }
  if (isNotModified(request, etag, lastModified))
    return HttpServerResponse.empty({ status: 304, headers: { ...validators, ...content } })

  const rangeHeader = request.method === "GET" ? request.headers["range"] : undefined
  const range =
    rangeHeader !== undefined && matchesIfRange(request.headers["if-range"], etag, lastModified)
      ? ByteRange.parse(rangeHeader, file.size)
      : undefined
  if (range === "unsatisfiable")
    return HttpServerResponse.empty({
      status: 416,
      headers: { "accept-ranges": "bytes", "content-range": `bytes */${file.size}` },
    })

  const offset = range?.start ?? 0
  const length = range === undefined ? file.size : range.end - range.start + 1
  return HttpServerResponse.stream(length === 0 ? Stream.empty : file.stream({ offset, bytesToRead: length }), {
    status: range === undefined ? 200 : 206,
    contentLength: length,
    headers: {
      ...validators,
      ...content,
      "accept-ranges": "bytes",
      ...(range === undefined ? {} : { "content-range": `bytes ${range.start}-${range.end}/${file.size}` }),
    },
  })
}

function isNotModified(request: HttpServerRequest.HttpServerRequest, etag: string, lastModified: string | undefined) {
  const ifNoneMatch = request.headers["if-none-match"]
  if (ifNoneMatch !== undefined)
    return ifNoneMatch.split(",").some((tag) => tag.trim() === "*" || stripWeak(tag) === stripWeak(etag))
  const ifModifiedSince = request.headers["if-modified-since"]
  return (
    ifModifiedSince !== undefined &&
    lastModified !== undefined &&
    Date.parse(lastModified) <= Date.parse(ifModifiedSince)
  )
}

function matchesIfRange(ifRange: string | undefined, etag: string, lastModified: string | undefined) {
  if (ifRange === undefined) return true
  if (/^\s*(w\/)?"/i.test(ifRange)) return stripWeak(ifRange) === stripWeak(etag)
  return lastModified !== undefined && Date.parse(ifRange) === Date.parse(lastModified)
}

function stripWeak(etag: string) {
  return etag.trim().replace(/^w\//i, "")
}
