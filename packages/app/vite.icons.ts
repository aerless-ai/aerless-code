import type { Plugin } from "vite"
import manifest from "./manifest.json" with { type: "json" }

export function icons(): Plugin {
  // Vite's resolved `base`, such as `/opencode/` for `vite build --base=/opencode/`.
  let base = "/"

  const webManifest = () =>
    JSON.stringify({
      ...manifest,
      id: base,
      start_url: base,
      scope: base,
      icons: manifest.icons.map((icon) => ({ ...icon, src: `${base}${icon.src.slice(1)}` })),
    })

  return {
    name: "opencode-app:icons",
    configResolved(config) {
      base = config.base
    },
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "site.webmanifest", source: webManifest() })
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.url?.split("?")[0] !== `${base}site.webmanifest`) return next()
        response.setHeader("Content-Type", "application/manifest+json")
        response.end(webManifest())
      })
    },
  }
}
