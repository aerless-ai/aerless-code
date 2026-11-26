// Aerless pictures: a `generate_image` call from the aerless MCP server shows as picture cards, ChatGPT-style.
import { createEffect, createSignal, For, Index, onCleanup, Show } from "solid-js"
import { useDialog } from "@opencode/ui/context/dialog"
import { Icon } from "@opencode/ui/icon"
import { IconButton } from "@opencode/ui/icon-button"
import { ImagePreview } from "@opencode/ui/image-preview"
import { getFilename } from "@opencode/util/path"
import { useMarkdown } from "../context/markdown"
import type { ToolProps } from "./tool-renderer"
import "./picture.css"

/** The composer listens for this to put the picture in as a chip; session-ui cannot reach the composer itself. */
export const EDIT_PICTURE_EVENT = "aerless:edit-picture"

/** The composer sets these: the saved picture shape (placeholder size) and the default picture model (progress timing). */
export const [pictureAspect, setPictureAspect] = createSignal("auto")
export const [pictureModel, setPictureModel] = createSignal("")

const ASPECT_RATIO: Record<string, string> = { wide: "16 / 9", tall: "9 / 16", "4:3": "4 / 3", "3:4": "3 / 4" }

// Expected time per model: the last finished picture, kept in localStorage; 30 s until there is one.
const durationKey = (model: string) => `aerless:picture-ms:${model}`
const expectedMs = (model: string) => {
  try {
    return Number(localStorage.getItem(durationKey(model))) || 30_000
  } catch {
    return 30_000
  }
}

const STATUS = ["Getting started…", "Adding details…", "Final touches…"]

// `Saved <path> (<w>x<h>, <model>, $<cost>)`, one line per picture; older CLIs print the path relative to `In folder`.
function saved(output: string | undefined) {
  const text = output ?? ""
  const folder = text.match(/^In folder (.+?)\. Total/m)?.[1]
  return [...text.matchAll(/^Saved (.+) \((\d+)x(\d+), [^,]+, \$[\d.]+\)/gm)].map((match) => {
    const file = match[1]!
    const absolute = file.startsWith("/") || /^[a-z]:[\\/]/i.test(file)
    return { path: absolute || !folder ? file : `${folder}/${file}`, ratio: `${match[2]} / ${match[3]}` }
  })
}

function sizeRatio(size: unknown) {
  const match = typeof size === "string" ? size.match(/^(\d+)x(\d+)$/) : null
  return match ? `${match[1]} / ${match[2]}` : (ASPECT_RATIO[pictureAspect()] ?? "1 / 1")
}

async function pngBlob(src: string) {
  const blob = await (await fetch(src)).blob()
  if (blob.type === "image/png") return blob
  const bitmap = await createImageBitmap(blob)
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0)
  return canvas.convertToBlob({ type: "image/png" })
}

export function PictureTool(props: ToolProps) {
  const pictures = () => saved(props.output)
  const pending = () => props.status === "streaming" || props.status === "running"
  const count = () => Math.min(4, Math.max(1, Number(props.input.count) || 1))
  const model = () => (typeof props.input.model === "string" ? props.input.model : pictureModel())

  // The API reports no progress: 95% of an exponential curve that fits the expected time, 100% on arrival.
  const [now, setNow] = createSignal(Date.now())
  const percent = () => {
    if (!pending()) return 100
    const tau = expectedMs(model()) / 3
    return Math.round(95 * (1 - Math.exp(-Math.max(0, now() - (props.started ?? now())) / tau)))
  }
  let seenPending = false
  createEffect(() => {
    if (pending()) {
      seenPending = true
      const timer = setInterval(() => setNow(Date.now()), 500)
      onCleanup(() => clearInterval(timer))
    } else if (seenPending && props.started) {
      seenPending = false
      try {
        localStorage.setItem(durationKey(model()), String(Date.now() - props.started))
      } catch {}
    }
  })

  return (
    <Show when={pending() || pictures().length > 0} fallback={<div data-component="picture-note">{props.output}</div>}>
      <div data-component="picture-grid" data-multi={(pending() ? count() : pictures().length) > 1 ? "" : undefined}>
        <Show
          when={!pending()}
          fallback={
            <Index each={Array.from({ length: count() })}>
              {() => <PictureCard ratio={sizeRatio(props.input.size)} percent={percent()} />}
            </Index>
          }
        >
          <For each={pictures()}>
            {(picture, index) => (
              <PictureCard ratio={picture.ratio} percent={100} path={picture.path} fallback={props.files?.[index()]} />
            )}
          </For>
        </Show>
      </div>
    </Show>
  )
}

function PictureCard(props: { ratio: string; percent: number; path?: string; fallback?: string }) {
  const markdown = useMarkdown()
  const dialog = useDialog()
  const [src, setSrc] = createSignal<string>()
  const [loaded, setLoaded] = createSignal(false)
  const [status, setStatus] = createSignal(0)
  const [copied, setCopied] = createSignal(false)
  let image: HTMLImageElement | undefined

  const timer = setInterval(() => setStatus((value) => Math.min(value + 1, STATUS.length - 1)), 4000)
  onCleanup(() => clearInterval(timer))

  createEffect(() => {
    const path = props.path
    if (!path) return
    clearInterval(timer)
    const controller = new AbortController()
    let url: string | undefined
    void (markdown?.readImage?.(path, controller.signal) ?? Promise.resolve(undefined))
      .catch(() => undefined)
      .then((blob) => {
        if (controller.signal.aborted) return
        url = blob ? URL.createObjectURL(blob) : undefined
        setSrc(url ?? props.fallback)
      })
    onCleanup(() => {
      controller.abort()
      if (url) URL.revokeObjectURL(url)
    })
  })

  const name = () => (props.path ? getFilename(props.path) : "picture.png")
  const download = () => {
    const link = document.createElement("a")
    link.href = src()!
    link.download = name()
    link.click()
  }
  const copy = async () => {
    await navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob(src()!) })])
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  const edit = () => {
    window.dispatchEvent(new CustomEvent(EDIT_PICTURE_EVENT, { detail: { path: props.path } }))
  }
  const view = () =>
    dialog.show(() => (
      <ImagePreview
        src={src()!}
        alt={name()}
        origin={image}
        actions={
          <>
            <IconButton icon={<Icon name="download" />} variant="ghost" aria-label="Download" onClick={download} />
            <Show when={props.path}>
              <IconButton
                icon={<Icon name="pencil-line" />}
                variant="ghost"
                aria-label="Edit"
                onClick={() => {
                  dialog.close()
                  edit()
                }}
              />
            </Show>
          </>
        }
      />
    ))

  return (
    <div data-component="picture" data-done={loaded() ? "" : undefined}>
      <div data-slot="picture-label" aria-live="polite">
        <span data-slot="picture-title">{loaded() ? "Image created" : `Creating image · ${props.percent}%`}</span>
        <Show when={!loaded()}>
          <span data-slot="picture-status">{STATUS[status()]}</span>
        </Show>
      </div>
      <div data-slot="picture-frame" style={{ "aspect-ratio": props.ratio }}>
        <Show when={src()}>
          <img ref={image} src={src()} alt={name()} draggable={false} onLoad={() => setLoaded(true)} onClick={view} />
        </Show>
        <div data-slot="picture-blur" aria-hidden="true" />
        <Show when={!loaded()}>
          <div data-slot="picture-progress" style={{ width: `${props.percent}%` }} />
        </Show>
        <Show when={loaded()}>
          <div data-slot="picture-actions">
            <button type="button" title="Download" aria-label="Download" onClick={download}>
              <Icon name="download" />
            </button>
            <button
              type="button"
              title={copied() ? "Copied" : "Copy"}
              aria-label="Copy"
              onClick={() => void copy().catch(() => undefined)}
            >
              <Icon name={copied() ? "check" : "copy"} />
            </button>
            <Show when={props.path}>
              <button type="button" title="Edit" aria-label="Edit" onClick={edit}>
                <Icon name="pencil-line" />
              </button>
            </Show>
            <button type="button" title="Full view" aria-label="Full view" onClick={view}>
              <Icon name="outline-maximize" />
            </button>
          </div>
        </Show>
      </div>
    </div>
  )
}
