# Security

## Report a vulnerability

Use GitHub's [private vulnerability report](https://github.com/aerless-ai/aerless-code/security/advisories/new). Please don't open a public issue. We reply with next steps and keep you posted until a fix ships.

Reports must show a real, reproduced problem. Unverified, AI-generated reports are closed.

## Threat model

Aerless Code is a coding assistant that runs on your machine. Its agent can run shell commands, read and write files, and use the web.

**No sandbox.** Permission prompts keep you aware of what the agent is doing; they are not security isolation. For isolation, run Aerless Code in a container or VM.

**Server mode is opt-in.** When you turn it on, set `OPENCODE_SERVER_PASSWORD` to require HTTP Basic Auth. Without it the server runs unauthenticated, with a warning.

### Out of scope

| Category | Why |
| --- | --- |
| Server access after you turn server mode on | API access is the expected behaviour |
| Escaping the permission prompts | They are not a sandbox (see above) |
| What your model provider does with your data | Their policy covers it |
| MCP servers you add | They are outside our trust boundary |
| Malicious config files | You control your own config |
