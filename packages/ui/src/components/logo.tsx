import { type ComponentProps } from "solid-js"

// The aerless.io mark (haveapi apps/site/src/components/Logo.tsx), path data copied exactly.
const MarkPaths = () => (
  <g fill="#d41f26">
    <path d="M392.2 388.0 L715.5 388.0 A68.5 68.5 0 0 0 774.2 284.4 L636.7 57.0 A117.2 117.2 0 0 0 534.5 0.5 L495.5 1.0 A127.5 127.5 0 0 0 388.5 60.3 L55.0 600.8 L0.0 691.6 L133.6 691.6 L427.5 216.3 A47.7 47.7 0 0 1 467.9 193.9 L546.7 193.9 A57.3 57.3 0 0 1 587.2 221.0 L640.6 309.2 L473.8 309.2 A58.5 58.5 0 0 0 424.5 336.5 L392.2 388.0Z" />
    <path d="M985.3 694.4 L852.0 490.9 A104.4 104.4 0 0 0 765.1 443.7 L387.7 443.7 A54.8 54.8 0 0 0 349.2 469.2 L315.7 523.5 L656.8 523.5 A61.3 61.3 0 0 1 707.4 549.8 L786.5 664.9 A103.6 103.6 0 0 0 858.9 694.4 L985.3 694.4Z" />
    <path d="M213.7 694.4 L708.1 694.4 L637.7 580.2 L308.8 580.2 A54.2 54.2 0 0 0 268.7 605.7 L213.7 694.4Z" />
  </g>
)

export const Mark = (props: { class?: string }) => {
  return (
    <svg
      data-component="logo-mark"
      classList={{ [props.class ?? ""]: !!props.class }}
      viewBox="0 0 985.4 694.5"
      xmlns="http://www.w3.org/2000/svg"
    >
      <MarkPaths />
    </svg>
  )
}

export const Splash = (props: Pick<ComponentProps<"svg">, "ref" | "class">) => {
  return (
    <svg
      ref={props.ref}
      data-component="logo-splash"
      classList={{ [props.class ?? ""]: !!props.class }}
      viewBox="0 0 985.4 694.5"
      xmlns="http://www.w3.org/2000/svg"
    >
      <MarkPaths />
    </svg>
  )
}

export const Logo = (props: { class?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 150 32"
      role="img"
      aria-label="Aerless"
      classList={{ [props.class ?? ""]: !!props.class }}
    >
      <svg x="0" y="5" width="31" height="22" viewBox="0 0 985.4 694.5">
        <MarkPaths />
      </svg>
      <text x="38" y="24.5" font-size="23" font-weight="600" font-family="inherit" fill="currentColor">
        Aerless
      </text>
    </svg>
  )
}
