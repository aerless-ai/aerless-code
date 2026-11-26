import { Show } from "solid-js"
import { usePlugin } from "@opencode/plugin/gui"
import type definition from "./index"
import type en from "./i18n/en"

/** The one update action the row offers: its label, a description replacing the row's own, and whether it runs now. */
export type UpdatesAction = {
  readonly label: keyof typeof en
  readonly description?: keyof typeof en
  readonly run?: string
}

export default function UpdatesSection(props: {
  action: () => UpdatesAction
  run: () => void
  /** Web only: drop the saved copy of the app and load the server's build. */
  reset?: () => void
}) {
  const ctx = usePlugin<typeof definition>()
  const ui = ctx.ui

  return (
    <ui.SettingsSection title={ctx.t("section.title")}>
      <ui.SettingsRow
        id="settings-check-updates"
        title={ctx.t("check.title")}
        description={ctx.t(props.action().description ?? "check.description")}
      >
        <ui.Button disabled={!props.action().run} onClick={() => props.run()}>
          {ctx.t(props.action().label)}
        </ui.Button>
      </ui.SettingsRow>

      <Show when={props.reset}>
        {(reset) => (
          <ui.SettingsRow
            id="settings-reload-from-server"
            title={ctx.t("web.reset.title")}
            description={ctx.t("web.reset.description")}
          >
            <ui.Button onClick={() => reset()()}>{ctx.t("web.reset.action")}</ui.Button>
          </ui.SettingsRow>
        )}
      </Show>
    </ui.SettingsSection>
  )
}
