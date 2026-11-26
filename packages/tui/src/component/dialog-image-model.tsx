import { createResource } from "solid-js"
import { useClient } from "../context/client"
import { useDialog } from "../ui/dialog"
import { DialogSelect } from "../ui/dialog-select"
import { useToast } from "../ui/toast"

/** The Aerless picture models (`aerless models --json`, run by the server); the choice becomes the default. */
export function DialogImageModel() {
  const client = useClient()
  const dialog = useDialog()
  const toast = useToast()
  const [models] = createResource(() =>
    client.api.server.imageModels.list().catch((error: unknown) => {
      toast.error(error)
      return []
    }),
  )

  return (
    <DialogSelect<string>
      title="Select picture model"
      current={models()?.find((model) => model.default)?.id}
      options={(models() ?? []).map((model) => ({
        value: model.id,
        title: model.name,
        description: model.edits ? "edits" : undefined,
        footer: model.price === null ? undefined : `$${model.price.toFixed(2)}`,
        onSelect: () => {
          dialog.clear()
          void client.api.server.imageModels
            .use({ id: model.id })
            .then(() => toast.show({ variant: "success", message: `Picture model: ${model.name}` }))
            .catch(toast.error)
        },
      }))}
    />
  )
}
