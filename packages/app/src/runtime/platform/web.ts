import { createBrowserDraftStore } from "@/runtime/persistence/drafts"
import { basePath, withBasePath } from "./base-path"
import type { Platform } from "./platform"

export function createWebPlatform(version: string) {
  const platform: Platform = {
    platform: "web",
    draftStore: createBrowserDraftStore(),
    version,
    openExternal(value) {
      if (!URL.canParse(value)) return
      const url = new URL(value)

      if (url.protocol !== "http:" && url.protocol !== "https:" && url.protocol !== "mailto:") return
      window.open(url.href, "_blank", "noopener,noreferrer")
    },
    restart: async () => window.location.reload(),
    openAttachmentPickerDialog(opts, onFile) {
      const input = document.createElement("input")
      input.type = "file"
      input.multiple = !!opts.multiple
      input.accept = [...(opts.accept ?? []), ...(opts.extensions ?? []).map((extension) => `.${extension}`)].join(",")

      return new Promise<void>((resolve, reject) => {
        input.oncancel = () => resolve()
        input.onchange = () =>
          Array.from(input.files ?? [])
            .reduce<Promise<unknown>>((done, file) => done.then(() => onFile(file)), Promise.resolve())
            .then(() => resolve(), reject)
        input.click()
      })
    },
    async notify(title, description, onClick) {
      if (!("Notification" in window)) return

      const permission =
        Notification.permission === "default"
          ? await Notification.requestPermission().catch(() => "denied")
          : Notification.permission

      if (permission !== "granted") return

      if (document.visibilityState === "visible" && document.hasFocus()) return

      const notification = new Notification(title, {
        body: description ?? "",
        icon: withBasePath("/favicon.svg"),
      })

      notification.onclick = () => {
        window.focus()
        onClick?.()
        notification.close()
      }
    },
  }

  return {
    platform,
    currentServerUrl: getCurrentServerUrl(),
  }
}

function getCurrentServerUrl() {
  if (import.meta.env.VITE_OPENCODE_SERVER_MODE === "none") return undefined

  if (import.meta.env.DEV) {
    const loopback =
      location.hostname === "localhost" || location.hostname === "[::1]" || location.hostname.startsWith("127.")

    const host = import.meta.env.VITE_OPENCODE_SERVER_HOST ?? (loopback ? location.hostname : "localhost")

    return `http://${host}:${import.meta.env.VITE_OPENCODE_SERVER_PORT ?? "4096"}`
  }

  // A build under a base path reaches the server through the same prefix.
  return location.origin + basePath
}
