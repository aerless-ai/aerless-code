# Aerless web interface

Aerless Code has a web interface. It runs in your normal browser and talks to the same Aerless Code server, sessions and settings as the terminal app.

## How to open it

- In the terminal app, type `/webui`. It makes a one-time sign-in link for the server the terminal app is using and opens your browser on it. The link is also shown in case the browser does not open. That server lives inside the terminal app, so the page stops working when you quit it.
- From a shell, run `aerless-code webui [directory]`. It starts the Aerless background service if needed, makes a sign-in link and opens your browser. `--no-open` only prints the link. The service keeps the same port and password, so the browser stays signed in for 30 days, also after a restart. A directory you name is loaded so its project shows up.
- Sign-in links work once and expire after 5 minutes. Run the command again for a new one.
- If the build has no web interface (built with `--skip-web-ui`), `aerless-code webui` says so.

## What it can do

The web interface is opencode's desktop app running in a browser, with the Aerless name, mark and dark theme. Chat, tools, permissions, diffs, files, terminals, sessions, projects, worktrees, models, providers, MCP servers, skills and settings all use the same server API as the terminal app, so a session started in one shows up in the other.

By default it makes no calls to other sites: no Google favicon lookups, no GitHub contributor count, no opencode release notes, no opencode images. Links in the help menus go to aerless.io. Limit messages for opencode's own paid services (Zen, Go, Console) still link to opencode, because they only show up if you connected those services yourself.

## How it compares

"Works" rows were clicked through in a browser on 2026-11-27 (macOS, Aerless free use). "Built in, not run yet" means the code is in place and type-checks, but nobody has watched it work.

| Feature | Codex / Claude desktop apps | Aerless web UI | Note |
| --- | --- | --- | --- |
| Chat with the agent, see tool calls live | Yes | Works | Same timeline as opencode desktop |
| Approve permissions and answer questions | Yes | Works (permissions) | |
| Diffs and review | Yes | Works | |
| File tree and file viewer, HTML preview | Yes | Works | HTML files preview in a sandboxed frame |
| Terminal | Yes | Works | Server-side terminal |
| Sessions and projects, shared with the terminal app | Partly | Built in, not run yet | Same database and live events |
| Parallel sessions and worktrees | Yes | Built in, not run yet | |
| Models, providers, MCP servers, skills, plugins, settings | Yes | Built in, not run yet | |
| Add a project folder | Native picker | Works | Folders are picked from a list the server provides |
| Attach files, paste images | Yes | Built in, not run yet | Browser file picker and paste |
| Import a session file | Yes | Built in, not run yet | Browser file picker, new in this branch |
| Notifications | Yes | Works with limits, not run yet | Only when the browser allows notifications |
| Reveal in Finder / open in another app | Yes | Not yet | Needs a new server endpoint |
| Built-in web browser pane | Codex: no; Claude: yes | Not yet | Needs Electron; web pages cannot be framed |
| Pair other devices from settings | n/a | Not yet | Desktop only; use `aerless-code pair` |
| SSH and WSL servers | n/a | Not yet | Desktop only |
| Opening `/imgengine` from a button | n/a | Not yet | Type `/imgengine` in the composer if the `aerless` command set it up |
| Release notes after an update | Yes | Removed | Fetched opencode's changelog |
