import { existsSync } from "node:fs"
import { homedir } from "node:os"
import path from "node:path"

// The `aerless` CLI: next to this program, else ~/.aerless/bin, else PATH.
function bin(name: string) {
  const file = process.platform === "win32" ? `${name}.exe` : name
  return (
    [path.join(path.dirname(process.execPath), file), path.join(homedir(), ".aerless", "bin", file)].find((f) =>
      existsSync(f),
    ) ??
    Bun.which(name) ??
    undefined
  )
}

export async function run(name: "aerless" | "aerless-code", args: string[]) {
  const file = bin(name)
  if (!file) throw new Error(`The ${name} program was not found. Install Aerless from aerless.io.`)
  const proc = Bun.spawn([file, ...args], { stdin: "ignore", stdout: "pipe", stderr: "pipe" })
  const [out, err, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ])
  if (code !== 0) throw new Error(err.trim() || out.trim() || `${name} ${args[0]} failed`)
  return out
}
