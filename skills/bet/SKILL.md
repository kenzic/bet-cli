---
name: bet
description: Use the bet CLI to find, inspect, and jump between local projects from natural-language requests. Triggers on requests like "jump to my X project", "open the api repo in my editor", "what's the path to X", "find projects matching Y", "which of my projects have uncommitted changes", "list projects I haven't touched in N months", or any task where the user refers to a local project by name/topic instead of by path. Also use when the user types /bet.
---

# bet

`bet` is a local project index. It scans configured root folders, detects projects by `.git`/`README.md`, and exposes them through fast lookup commands. Treat it as the canonical way to resolve a project name → an absolute path on this machine.

## Quick command map

Map the user's intent to a command. Always use the slug (kebab-case folder name), not a fuzzy display name.

| User asks for… | Run |
|---|---|
| The path to project `X` | `bet path X` |
| Details / metadata about `X` (description, root, git state) | `bet info X --json` |
| The full README of `X` | `bet info X --full` |
| A list of all projects | `bet list --json` |
| Search by keyword `Y` | `bet search Y --json` |
| Open `X` in the user's editor | `bet edit X` |
| Re-scan disk for new projects | `bet update` |
| Add/remove/list ignored paths | `bet ignore add <path>` / `bet ignore rm <path>` / `bet ignore list` |

## Non-interactive flags are mandatory

`bet list` and `bet search` launch an interactive TUI by default. **Never** run them without `--plain` or `--json` from an agent context — they will hang waiting for keystrokes.

- `--json` — machine-readable, the right default for filtering/parsing
- `--plain` — line-per-project text, fine when only a name is needed
- `--print` — emit the selected absolute path only

## Resolving a path before `cd`

`bet go <slug>` only changes the shell's directory when the user has the shell integration (`eval "$(bet shell)"`) active. From a Bash tool call, that integration is **not** loaded, so `bet go` will not actually `cd`.

When you need to enter a project directory inside a Bash tool call, resolve the path first:

```sh
cd "$(bet path X)" && <command>
```

This works without any shell integration and is the correct pattern for agent-driven workflows.

## The `--json` schema

`bet list --json` and `bet info <slug> --json` return objects with these fields:

```jsonc
{
  "id": "/abs/path",            // unique id (= path)
  "slug": "my-project",         // use this with all commands
  "name": "my-project",
  "path": "/abs/path",
  "root": "/abs/root",          // which configured root it lives under
  "rootName": "code",           // friendly root label
  "hasGit": true,
  "hasReadme": true,
  "auto": {
    "description": "...",        // first paragraph of README
    "startedAt": "ISO-8601",     // first git commit date
    "lastModifiedAt": "ISO-8601",// most recent file mtime
    "lastIndexedAt": "ISO-8601",
    "dirty": true                // uncommitted changes
  }
}
```

`bet list --json` returns an array of these.

## `--json | jq` recipes

The single highest-leverage feature for an agent. Reach for these when the user asks anything analytical about their projects:

```sh
# Projects with uncommitted work
bet list --json | jq 'map(select(.auto.dirty)) | .[].slug'

# Projects modified in the last 30 days, newest first
bet list --json | jq 'sort_by(.auto.lastModifiedAt) | reverse | map(select(.auto.lastModifiedAt > (now - 86400*30 | todateiso8601)))'

# Stale projects (untouched > 6 months)
bet list --json | jq --arg cutoff "$(date -u -v-6m +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d '6 months ago' +%Y-%m-%dT%H:%M:%SZ)" \
  'map(select(.auto.lastModifiedAt < $cutoff)) | .[].slug'

# Group projects by root
bet list --json | jq 'group_by(.rootName) | map({root: .[0].rootName, count: length, slugs: map(.slug)})'

# Projects whose description mentions a keyword
bet list --json | jq --arg q "rust" 'map(select(.auto.description | test($q; "i"))) | .[].slug'
```

Compose `jq` filters from `auto.*` fields rather than re-implementing logic in shell. The user's README at `bet --help` calls out this pattern explicitly.

## When `bet` returns nothing

If `bet list --json` is empty or `bet path X` errors with an unknown slug, the user has not indexed yet (or the index is stale). Run:

```sh
bet update
```

If this is their first run, `bet update` will fail without roots. Tell the user to run:

```sh
bet update --roots "$HOME/code,$HOME/work"
```

…with whatever roots make sense for their machine. Do not pick roots for them.

## Slug rules — what to actually pass

- The slug is the project folder's basename, kebab-cased.
- If the project sits inside a wrapper folder named in `slugParentFolders` (defaults: `src`, `app`), the slug is the **parent's** name. Example: `~/code/foo/src` → slug `foo`, not `src`.
- When unsure, run `bet search <fuzzy>` first and read back the slug from JSON.

## Common pitfalls

- **TUI hang** — `bet list` / `bet search` without `--plain`/`--json` will block waiting for keystrokes. Always pass one.
- **`bet go` in Bash** — won't actually change directory; use `cd "$(bet path X)"` instead.
- **Treating the name as the slug** — `bet info "My Project"` will fail; use the slug from `bet list --json`.
- **Stale index after creating a new project** — run `bet update` before assuming the new project is searchable. Suggest `bet update --cron 1h` if the user creates projects often.
- **Editing config by hand** — config lives at `~/.config/bet/config.json` (or `$XDG_CONFIG_HOME/bet/config.json`). Prefer commands (`bet update --roots`, `bet ignore add`) over hand-editing.

## File locations (for debugging only)

- Config + ignore list: `~/.config/bet/config.json`
- Project index: `~/.config/bet/projects.json`
- Logs: `~/Library/Logs/bet/bet.log` (macOS) or `~/.local/state/bet/bet.log` (Linux). Set `BET_LOG_LEVEL=debug` for verbose output.
