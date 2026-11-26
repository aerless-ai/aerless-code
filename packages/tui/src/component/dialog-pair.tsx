import { TextAttributes } from "@opentui/core"
import { useTerminalDimensions } from "@opentui/solid"
import { createMemo, createResource, createSignal, For, Show } from "solid-js"
import { openUrl } from "@opencode/util/open"
import { renderUnicodeCompact } from "@opencode/util/qr"
import { useClient } from "../context/client"
import { useTheme } from "../context/theme"
import { DialogHeader, DialogLayout, useDialog } from "../ui/dialog"
import { Link } from "../ui/link"
import { errorMessage } from "../util/error"
import { run } from "../util/aerless"
import { Keymap } from "../context/keymap"
import { useToast } from "../ui/toast"

export function DialogPair(props: { open?: boolean }) {
  const client = useClient()
  const dialog = useDialog()
  const dimensions = useTerminalDimensions()
  const theme = useTheme().surface("dialog")
  const toast = useToast()
  const [enabling, setEnabling] = createSignal(false)
  const [loadError, setLoadError] = createSignal<unknown>()

  dialog.setSize("large")
  dialog.setCentered(true)

  const [info, { refetch }] = createResource(() =>
    Promise.all([client.api.server.info(), client.api.server.pair()])
      .then(([server, pairing]) => {
        const link = (url: string) => new URL(`/auth/connect/${pairing.code}`, url).href
        const local = server.urls[0] ? new URL(server.urls[0]) : undefined
        if (local) local.hostname = "localhost"
        const localhost = local ? link(local.href) : undefined
        if (props.open && localhost) openUrl(localhost).catch(() => {})
        return {
          // The QR carries the LAN IPv4 address: a loopback address is useless to a phone.
          lan: server.urls.map((url) => new URL(url)).find((url) => /^\d+\.\d+\.\d+\.\d+$/.test(url.hostname) && !url.hostname.startsWith("127.")),
          links: server.urls.map((url) => new URL(url)).filter((url) => !url.hostname.startsWith("127.") && url.hostname !== "[::1]").map((url) => link(url.href)),
          localhost,
          code: pairing.code,
          minutes: Math.round(pairing.expires_in / 60),
        }
      })
      .catch((error) => {
        setLoadError(error)
        return undefined
      }),
  )
  // Same as `aerless-code service set hostname 0.0.0.0`, which stops the service; restart it and re-read the addresses.
  Keymap.createLayer(() => ({
    mode: "modal",
    commands: [
      {
        bind: "n",
        title: "Turn on network access",
        group: "Dialog",
        run: () => {
          const value = info()
          if (!value || value.lan || enabling()) return
          setEnabling(true)
          void run("aerless-code", ["service", "set", "hostname", "0.0.0.0"])
            .then(() => run("aerless-code", ["service", "restart"]))
            .then(() => refetch())
            .catch(toast.error)
            .finally(() => setEnabling(false))
        },
      },
    ],
  }))
  const horizontal = createMemo(() => dimensions().width >= 96)
  const content = () => {
    const value = info()
    if (!value) return
    return (
      <box flexDirection={horizontal() ? "row" : "column"} alignItems={horizontal() ? "flex-start" : "center"} gap={2}>
        <box width={horizontal() ? 29 : "100%"} flexShrink={0} gap={1}>
          <text fg={theme.text.muted} wrapMode="word">
            Open a link to connect. Links work once and expire in {value.minutes} minutes.
          </text>
          <Show when={value.localhost}>
            {(url) => (
              <box>
                <text fg={theme.text.muted}>This device</text>
                <Link href={url()} fg={theme.text.base}>
                  {url()}
                </Link>
              </box>
            )}
          </Show>
          <Show
            when={value.lan}
            fallback={
              <text fg={theme.text.muted} wrapMode="word">
                {enabling()
                  ? "Turning on network access…"
                  : "The service only listens on this computer, so a phone cannot reach it. Press n to turn on network access (aerless-code service set hostname 0.0.0.0)."}
              </text>
            }
          >
            <box>
              <text fg={theme.text.muted}>Network</text>
              <For each={value.links}>
                {(url) => (
                  <Link href={url} fg={theme.text.base}>
                    {url}
                  </Link>
                )}
              </For>
            </box>
          </Show>
        </box>
        <box
          width={horizontal() ? undefined : "100%"}
          flexGrow={horizontal() ? 1 : 0}
          flexShrink={0}
          alignItems={horizontal() ? "flex-end" : "center"}
        >
          <Show when={value.lan}>
            {(url) => (
              <text fg={theme.text.base}>
                {renderUnicodeCompact(new URL(`/auth/connect/${value.code}`, url()).href, { border: 1 })}
              </text>
            )}
          </Show>
        </box>
      </box>
    )
  }

  return (
    <DialogLayout header={<DialogHeader title="Pair" />}>
      <Show
        when={loadError()}
        fallback={
          <Show when={info()} fallback={<text fg={theme.text.muted}>Loading server information…</text>}>
            <Show
              when={dimensions().height >= 36}
              fallback={
                <scrollbox
                  height={Math.max(8, dimensions().height - Math.floor(dimensions().height / 4) - 6)}
                  scrollbarOptions={{ visible: false }}
                >
                  {content()}
                </scrollbox>
              }
            >
              {content()}
            </Show>
          </Show>
        }
      >
        {(error) => (
          <box>
            <text fg={theme.text.feedback.error.base} attributes={TextAttributes.BOLD}>
              Could not load server information
            </text>
            <text fg={theme.text.muted}>{errorMessage(error())}</text>
            <text fg={theme.text.muted}>Close and reopen Pair to try again.</text>
          </box>
        )}
      </Show>
    </DialogLayout>
  )
}
