# .context — AI Project Context

This directory contains files that help AI coding assistants understand this project.

## Files

| File | Used by | Format |
|------|---------|--------|
| `../AGENTS.md` | Gemini, Antigravity | Full project context |
| `../CLAUDE.md` | Claude Code, Claude Desktop | Condensed project context |
| `copilot-instructions.md` | GitHub Copilot | Coding guidelines |

## How it works

- **Gemini / Antigravity** reads `AGENTS.md` from the project root automatically
- **Claude Code** reads `CLAUDE.md` from the project root automatically
- **GitHub Copilot** reads `.github/copilot-instructions.md` if present
- **Cursor** reads `.cursorrules` if present
- **Any AI** can be given the contents of `AGENTS.md` as context in a prompt

## Updating

When you make significant architectural changes:
1. Update `AGENTS.md` and `CLAUDE.md` in the project root
2. Update `copilot-instructions.md` if coding patterns change
