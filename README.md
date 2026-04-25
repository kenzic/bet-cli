# bet

Keep your house in order. Explore and jump between local projects.

**bet** is a lightweight project index for your machine: point it at one or more “root” folders (like `~/code`), let it scan for projects, then use fast commands to **search**, **inspect**, and **jump** to them — for you _and_ for the AI coding agents working inside your repos.

If your `~/code` folder is chaos, **bet turns it into a map**. The same map an agent can read in a handful of tokens instead of burning a context window on a sprawling `find` dump.

```

                            ░░░░░   ░░░░░░░░░░░░░░░░░░░░░░░░░░   ░░░░░░░░░░░░░░░░░░░░░░░░░░
                        ░░░░░░░░░   ░░░░░░░░░░░░░░░░░░░░░░░░░░   ░░░░░░░░░░░░░░░░░░░░░░░░░░
                    ░░░░░░░░░░░░░   ░░░░░░                                 ░░░░░░
                ░░░░░░░░░░░░░░░░░   ░░░░░░                                 ░░░░░░
            ░░░░░░░░░░░░░   ░░░░░   ░░░░░░                                 ░░░░░░
        ░░░░░░░░░░░░░       ░░░░░   ░░░░░░                                 ░░░░░░
      ░░░░░░░░░░░░          ░░░░░   ░░░░░░                                 ░░░░░░
         ░░░░░░░░░░░░░░░░   ░░░░░   ░░░░░░░░░░░░░░░░░░░░░░░░░░             ░░░░░░
              ░░░░░░░░░░░░░░░░░░░   ░░░░░░░░░░░░░░░░░░░░░░░░░░             ░░░░░░
                   ░░░░░░░░░░░░░░   ░░░░░░                                 ░░░░░░
                        ░░░░░░░░░   ░░░░░░                                 ░░░░░░
                            ░░░░░   ░░░░░░                                 ░░░░░░
                            ░░░░░   ░░░░░░                                 ░░░░░░
                            ░░░░░   ░░░░░░                                 ░░░░░░
       ░░░░░░░░░░░░░░░░░░░░░░░░░░   ░░░░░░░░░░░░░░░░░░░░░░░░░░             ░░░░░░
       ░░░░░░░░░░░░░░░░░░░░░░░░░░   ░░░░░░░░░░░░░░░░░░░░░░░░░░             ░░░░░░

```

## Why bet?

- **No scrolling through 300 folders**
- **No guessing paths**
- **No brittle aliases**
- Just indexed homes you can find instantly
- **Context-efficient for AI agents** — `bet path X` resolves a project name to a path in a handful of tokens; `bet list --json | jq` answers questions across hundreds of projects without spending tokens on a full `find` tree

“bet” (𐤁) is the Phoenician letter for **house**. Every project is a house—bet builds your registry of houses.

## How it works (high level)

- **You configure scan roots** (directories you keep projects under).
- `bet update` scans those roots and builds an index.
- Projects are detected using simple signals (today: folders containing **`.git`** and/or a **`README.md`**, with common build dirs ignored).
- Commands like `list`, `search`, `info`, `path`, and `go` read that index.
- Commands like `list`, `search`, `info`, `path`, `go`, and `edit` read that index.

## Install

### Install as a CLI (recommended)

Requires **Node >= 20**.

If/when this is published to npm, it’s intended to be installable as:

```sh
npm install -g bet-cli
```

## Quick start

### 1) Index your project roots

First run requires roots (comma-separated):

```sh
bet update --roots "$HOME/code,$HOME/work"
```

That saves your roots and writes the project index under your config directory.

### 2) Browse / search

```sh
bet list
bet search api
bet info payments
```

### 3) Jump to a project

To make `bet` actually change directories, enable shell integration once (details below), then:

```sh
bet go payments
```

## Shell integration (for proper `cd`)

CLIs can’t directly change the working directory of your current shell process. bet solves this by printing a small shell function that evaluates a `cd ...` snippet when needed.

Add this to your shell rc file (e.g. `~/.zshrc`, `~/.bashrc`):

```sh
eval "$(bet shell)"
```

After that:

- `bet go <slug>` will `cd` your current shell into the project
- `bet list` / `bet search` can also “select and jump” in interactive mode

**Project name autocompletion:** To complete project names (slugs) when using `bet go`, `bet path`, or `bet info`, add to your rc file:

```sh
eval "$(bet completion zsh)"   # zsh
eval "$(bet completion bash)"  # bash
```

Then Tab-complete the slug argument after `bet go `, `bet path `, or `bet info `.

## Core commands

- **`bet update`**: Scan configured roots and rebuild the project index.
  - **First-time setup**: `bet update --roots "$HOME/code,$HOME/work"`
  - If you pass `--roots` when you already have roots in config, you will be warned and must confirm (or use `--force` when not in a TTY).
  - **Optional**: `--cron [frequency]` — install a `crontab` entry that runs `bet update` on a schedule. Use Nm (1–59), Nh (1–24), or Nd (1–31), e.g. `--cron 5m`, `--cron 1h` (default if omitted), `--cron 2d`. Use `--cron 0` or `--cron false` to remove the cron. Cron stdout/stderr are appended to `~/.config/bet/cron-update.log`; structured logs go to the main log file (see [Logging](#logging)).
- **`bet list`**: List indexed projects (interactive by default).
  - **`--plain`**: non-interactive output
  - **`--json`**: machine-readable output
  - **`--print`**: print selected path only
- **`bet search <query>`**: Fuzzy-search projects (interactive when TTY).
- **`bet info <slug>`**: Show details/metadata for a project.
- **`bet path <slug>`**: Print the absolute path for a project.
- **`bet go <slug>`**: Jump to a project.
  - **`--print`**: print selected path only (no shell `cd`)
  - **`--no-enter`**: do not run the project’s `onEnter` hook (if configured)
- **`bet edit <slug>`**: Open a project in your editor.
  - Uses `editor` from `config.json` when set.
  - Falls back to the system default app opener when `editor` is not set.
- **`bet shell`**: Print the shell integration snippet (see above).
- **`bet completion [bash|zsh]`**: Print shell completion script for project name autocompletion (see above).

## Config & data files

bet stores its data in:

- **Config dir**: `~/.config/bet/` (or `$XDG_CONFIG_HOME/bet/`)
- **Roots**: `config.json` — each root is `{ "path": "/absolute/path", "name": "display-name" }`. The name defaults to the top folder name and is used when listing/grouping projects.
- **editor** (optional): In `config.json`, a command string used by `bet edit`, for example `"code -n"` or `"cursor"`.
- **slugParentFolders** (optional): In `config.json`, an array of folder names. When a discovered project path ends in one of these (e.g. `src` or `app`), the project slug is taken from the parent directory name instead. Default in code is `["src", "app"]` when the key is not set.
- **Project index**: `projects.json`

These are plain JSON files—easy to inspect, back up, or edit.

### Logging

bet writes a structured log file for debugging, especially when `bet update` runs from cron:

- **macOS**: `~/Library/Logs/bet/bet.log`
- **Linux**: `~/.local/state/bet/bet.log` (or `$XDG_STATE_HOME/bet/bet.log`)

Each line is timestamped and includes a level (`DEBUG`, `INFO`, `WARN`, `ERROR`). Set `BET_LOG_LEVEL=debug` for verbose output when troubleshooting (e.g. in your cron environment). When run from cron, stdout/stderr are also captured in `~/.config/bet/cron-update.log`; the main log file is the structured, level-based log.

### Advanced filtering with `--json`

You can combine `bet list --json` with [jq](https://stedolan.github.io/jq/) for powerful, scriptable project filtering. Here are some practical examples:

- Find all projects with uncommitted changes:

  ```sh
  bet list --json | jq 'map(select(.auto.dirty))'
  ```

- Show projects that were started after a given date:
  ```sh
  bet list --json | jq 'map(select(.auto.startedAt > "2026-01-01T00:00:00Z"))'
  ```

You can customize these jq expressions to target any field present in the project index for fully custom workflows.

## Use with AI agents

bet ships an agent skill at [`skills/bet/SKILL.md`](skills/bet/SKILL.md) that teaches an LLM-driven coding agent (Claude Code, Cursor, etc.) how to drive the CLI from natural-language requests like _"jump to my payments project"_, _"open the api repo in my editor"_, or _"which of my projects have uncommitted changes?"_.

The skill codifies:

- The **intent → command map** (`path`, `info`, `list`, `search`, `edit`, `update`, `ignore`)
- The **mandatory `--plain` / `--json` flags** so the interactive TUI does not hang the agent
- The **`cd "$(bet path X)"` pattern** for non-interactive shells, since `bet go` relies on shell integration the agent cannot load
- The **`bet list --json` schema** and ready-made `jq` recipes for dirty / recently modified / stale / grouped queries
- **Slug rules** (including `slugParentFolders`) and common pitfalls

To use it with Claude Code, drop the `skills/bet/` folder into a discovered skills directory (e.g. `~/.claude/skills/bet/`) — or import the skill into whichever harness your agent uses. Once loaded, `/bet` invokes it explicitly, and natural-language triggers in the description load it automatically.

This means an agent can navigate hundreds of projects on your machine using a few-line skill instead of spending tokens on directory listings, ad-hoc shell aliases, or hard-coded paths in its prompt.

### Development setup (contributors)

To work on bet locally (without necessarily linking it globally), install deps and build:

```sh
pnpm install
pnpm build
```

Run unit tests (Vitest):

```sh
pnpm test
pnpm test:coverage   # with coverage report
```
