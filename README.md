# bet

Explore and jump between local projects.

**bet** is a lightweight project index for your machine: point it at one or more “root” folders (like `~/code`), let it scan for projects, then use fast commands to **search**, **inspect**, and **jump** to them.

If your `~/code` folder is chaos, **bet turns it into a map**.

## Why bet?

- **No scrolling through 300 folders**
- **No guessing paths**
- **No brittle aliases**
- Just indexed homes you can find instantly

“bet” (𐤁) is the Phoenician letter for **house**. Every project is a house—bet builds your registry of houses.

## How it works (high level)

- **You configure scan roots** (directories you keep projects under).
- `bet update` scans those roots and builds an index.
- Projects are detected using simple signals (today: folders containing **`.git`** and/or a **`README.md`**, with common build dirs ignored).
- Commands like `list`, `search`, `info`, `path`, and `go` read that index.

## Install

### Install as a CLI (recommended)

Requires **Node >= 20**.

If/when this is published to npm, it’s intended to be installable as:

```sh
npm install -g bet
```

If you’re installing from this repo (until it’s published), you can still install it globally via a link:

```sh
pnpm install
pnpm build
npm link
```

### Development setup (contributors)

To work on bet locally (without necessarily linking it globally), install deps and build:

```sh
pnpm install
pnpm build
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

## Core commands

- **`bet update`**: Scan configured roots and rebuild the project index.
  - **First-time setup**: `bet update --roots "$HOME/code,$HOME/work"`
  - **Optional**: `--cron` installs an hourly `crontab` entry that runs `bet update` and logs output to your bet config directory
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
- **`bet shell`**: Print the shell integration snippet (see above).

## Config & data files

bet stores its data in:

- **Config dir**: `~/.config/bet/` (or `$XDG_CONFIG_HOME/bet/`)
- **Roots**: `config.json`
- **Project index**: `projects.json`

These are plain JSON files—easy to inspect, back up, or edit.
