// Aerless pictures in the composer: the default picture model (saved by the `aerless` CLI) and the picture shape.
import { createResource, For, Show } from "solid-js"
import { Button } from "@opencode/ui/button"
import { Menu } from "@opencode/ui/menu"
import { useServerSDK } from "@/runtime/server/client"
import { formatServerError } from "@/runtime/server/errors"
import { useLanguage } from "@/runtime/i18n/language"
import { showToast } from "@/shell/notifications/toast"
import { PICTURE_SIZES, pictureSize, setPictureSize } from "./picture-size"

const price = (value: number | null) => (value === null ? "" : `$${value.toFixed(2)}`)

export function PictureControls() {
  const sdk = useServerSDK()
  const language = useLanguage()
  // No aerless program or no key: the server answers with an error and the chips stay hidden.
  const [models, { refetch }] = createResource(() => sdk.api.server.imageModels.list().catch(() => []))
  const current = () => models()?.find((model) => model.default) ?? models()?.[0]

  const choose = (id: string) =>
    void sdk.api.server.imageModels
      .use({ id })
      .then(refetch)
      .catch((error: unknown) =>
        showToast({
          variant: "error",
          title: language.t("common.requestFailed"),
          description: formatServerError(error, language.t),
        }),
      )

  return (
    <Show when={current()}>
      {(model) => (
        <>
          <Menu placement="top-start" gutter={8}>
            <Menu.Trigger as={Button} type="button" variant="ghost" size="small" title="Picture model">
              {[model().name, price(model().price)].filter(Boolean).join(" · ")}
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Content>
                <Menu.RadioGroup value={model().id} onChange={choose}>
                  <For each={models()}>
                    {(item) => (
                      <Menu.RadioItem
                        value={item.id}
                        closeOnSelect
                        shortcut={price(item.price)}
                        badge={item.edits ? "edits" : undefined}
                      >
                        {item.name}
                      </Menu.RadioItem>
                    )}
                  </For>
                </Menu.RadioGroup>
              </Menu.Content>
            </Menu.Portal>
          </Menu>
          <Menu placement="top-start" gutter={8}>
            <Menu.Trigger as={Button} type="button" variant="ghost" size="small" title="Picture shape">
              {PICTURE_SIZES.find((item) => item.size === pictureSize())?.label}
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Content>
                <Menu.RadioGroup value={pictureSize()} onChange={setPictureSize}>
                  <For each={PICTURE_SIZES}>
                    {(item) => (
                      <Menu.RadioItem value={item.size} closeOnSelect>
                        {item.label}
                      </Menu.RadioItem>
                    )}
                  </For>
                </Menu.RadioGroup>
              </Menu.Content>
            </Menu.Portal>
          </Menu>
        </>
      )}
    </Show>
  )
}
