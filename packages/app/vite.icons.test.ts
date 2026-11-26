import { expect, test } from "bun:test"
import { build } from "vite"
import { icons } from "./vite.icons"
import manifest from "./manifest.json" with { type: "json" }

test.each(["/", "/opencode/"])("bundles the web manifest under base %s", async (base) => {
  const result = await build({
    root: import.meta.dirname,
    configFile: false,
    logLevel: "silent",
    base,
    plugins: [
      icons(),
      {
        name: "icons-only-fixture",
        transformIndexHtml: {
          order: "pre",
          handler: (html) => html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, ""),
        },
      },
    ],
    build: { write: false, copyPublicDir: false },
  })

  if (!("output" in result)) throw new Error("Expected a single build output")
  const read = (name: string) => {
    const file = result.output.find((file) => file.fileName === name)
    if (file?.type !== "asset") throw new Error(`Missing asset: ${name}`)
    return new TextDecoder().decode(new Uint8Array(Buffer.from(file.source)))
  }

  expect(JSON.parse(read("site.webmanifest"))).toEqual({
    ...manifest,
    id: base,
    start_url: base,
    scope: base,
    icons: [{ ...manifest.icons[0], src: `${base}favicon.svg` }],
  })
  expect(read("index.html")).toContain(`href="${base}favicon.svg"`)
  expect(read("index.html")).toContain(`href="${base}site.webmanifest"`)
})
