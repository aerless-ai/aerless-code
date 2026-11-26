import { pictureAspect, setPictureAspect } from "@opencode/session-ui/picture"

/** Picture shapes, as `aerless models --aspect` knows them. */
export const PICTURE_ASPECTS = [
  { id: "auto", label: "Auto" },
  { id: "square", label: "Square" },
  { id: "wide", label: "Wide 16:9" },
  { id: "tall", label: "Tall 9:16" },
  { id: "4:3", label: "Landscape 4:3" },
  { id: "3:4", label: "Portrait 3:4" },
]

// The shape is saved by the aerless CLI, which enforces it in generate_image; session-ui reads it for the placeholder.
export { pictureAspect, setPictureAspect }
