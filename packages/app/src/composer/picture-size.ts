import { createSignal } from "solid-js"

export const PICTURE_SIZES = [
  { label: "Square", size: "1024x1024" },
  { label: "Wide 16:9", size: "1920x1080" },
  { label: "Tall 9:16", size: "1080x1920" },
  { label: "4:3", size: "1600x1200" },
]

// shortcut: one shape for the whole app, not saved; keep it per draft if people want different shapes per session.
export const [pictureSize, setPictureSize] = createSignal(PICTURE_SIZES[0]!.size)

/** The line a sent message carries when the user picked a shape other than the square default. */
export const pictureSizeNote = () =>
  pictureSize() === PICTURE_SIZES[0]!.size
    ? []
    : [`If you make a picture, use size ${pictureSize()} in generate_image.`]
