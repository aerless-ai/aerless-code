export * as SessionSystemPrompt from "./system-prompt.js"

import PROMPT from "./runner/prompt/system.txt"

export function make(tools: string[]) {
  return render(PROMPT, tools)
}

export function render(prompt: string, tools: string[]) {
  const instructions: string[] = []
  if (tools.includes("shell")) {
    instructions.push(
      "- Prefer dedicated tools over shell commands; fall back to the shell when a tool cannot do what you need.",
      "- Do not chain shell commands with separators like `echo \"====\";` or `printf '---'`; the output becomes noisy in a way that makes the user's side of the conversation worse.",
    )
  }
  if (tools.includes("write")) {
    instructions.push(
      "- Use the write tool to create files or completely replace their content. Prefer using the edit tool for targeted changes.",
    )
  }
  if (tools.includes("edit")) {
    instructions.push(
      "- Use the edit tool for targeted changes to existing text files. It replaces the exact text in `oldString` with `newString`, and the values must differ. By default, `oldString` must occur exactly once. If it occurs multiple times, include more surrounding context to make it unique or set `replaceAll` to true to replace every occurrence.",
    )
  }
  // Aerless: pictures are made in the chat, where the web interface shows them as cards; the studio is only on request.
  const picture = tools.find((tool) => tool.endsWith("_generate_image"))
  if (picture) {
    instructions.push(
      `- When the user asks for a picture, image, photo, banner or icon, call \`${picture}\` directly in this chat; do not open the picture studio or load the imgengine skill unless the user asks for the studio. To change a picture, pass its path in \`reference_images\`. Do not repeat the saved path or describe the picture at length afterwards; the user sees it.`,
      "- You may not be able to see pictures the user attaches. Never open, view, measure or convert pictures with shell commands. To use an attached picture, pass its path in `reference_images` and describe the wanted result fully in the prompt. If list_image_models shows no model that takes reference pictures, say in one sentence that pictures cannot be used as a starting point yet, then make it from the description if the user wants.",
    )
  }
  return prompt.replace("${OPENCODE_TOOL_GUIDANCE}", instructions.join("\n"))
}
