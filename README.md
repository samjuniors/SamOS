# SamOS

**SamOS** is a Windows-first Electron desktop project exploring a voice-first AI workspace built on [Hermes Agent](https://github.com/NousResearch/hermes-agent), with a planned integration to [Paperclip](https://github.com/paperclipai/paperclip) for agent teams, company goals, projects, and governed work.

> **Development status — prototype.** The current tree is primarily a Hermes Agent source snapshot plus SamOS-specific Desktop components. The company board and heartbeats currently use local UI state and simulated task transitions. They are **not** evidence of a running Paperclip server or real autonomous work. Do not rely on displayed spending, agent activity, health scores, or task completion as verified results.

## Where the code lives

- `apps/desktop/` — Electron shell, React renderer, native IPC, and SamOS voice-first UI.
- `apps/desktop/src/app/voice-ai-os/` — SamOS voice HUD, workspace, company board, browser, and settings.
- `apps/desktop/src/store/` — SamOS voice, decision, company, provider, and repair state (alongside Hermes stores).
- `apps/shared/` — shared desktop/backend transport.
- `agent/`, `tools/`, `tui_gateway/`, `hermes_cli/`, `gateway/` — the upstream Hermes runtime and related services; **do not remove them without dependency mapping and tests**.
- `apps/desktop/VOICE_AI_OS_SPEC.md` — working specification.

## Development on Windows

1. Prepare the root dependencies using the pinned Node and pnpm versions described in the upstream development guides (`activate.ps1`, `pm/lock.json`, and `pnpm-workspace.yaml`).
2. Install workspace dependencies at the repository root with `pnpm install --frozen-lockfile`.
3. Run `./run-voice-ai-os.ps1` in PowerShell (or `run-voice-ai-os.bat` in Command Prompt). Both launch the existing `apps/desktop` development scripts **without enabling fake boot mode**.
4. To run desktop checks, use `pnpm --dir apps/desktop run typecheck` and `pnpm --dir apps/desktop run test` from the repository root.

Windows launch, microphone, actual Hermes tool calls, Paperclip connectivity, and installer packaging still require real-host verification.

## Architecture rules

- Electron owns native Windows capabilities and should expose only narrowly scoped, validated IPC.
- Hermes is the execution authority for models, sessions, tools, skills, and agents.
- Paperclip, when integrated, should own organization/task/budget governance over a well-defined adapter, not an imitation implemented only inside React.
- Never silently fake completed tasks, verified self-repairs, successful external syncs, or API usage.
- SamOS cloud and Paperclip API keys are now session-only in UI state; prior browser-storage secrets are scrubbed on load. Implement OS-protected secrets and backend-only provider calls before production.
- Keep operations auditable, with explicit user approval for consequential automation and a reliable cancel/stop path.

## Upstream credits and license

SamOS includes code from **Nous Research's Hermes Agent**, licensed under the MIT License. See [LICENSE](LICENSE) for the upstream copyright and terms. Preserve original copyright and attribution notices where applicable. Paperclip is an external upstream project and is not vendored as a complete functional runtime in this repository.

This repository is independently developed; the SamOS name does not imply endorsement by upstream projects.

## Credential security notice

An API key embedded in the imported desktop provider configuration has been removed from current source. **The key still exists in public Git history and must be revoked/rotated at the provider.** Never embed credentials in renderer code, presets, demos, or tests.

## Lightweight Windows-first source tree

The SamOS cleanup branch omits the upstream Hermes documentation website and standalone evaluation fixtures. Hermes's live execution engine and the SamOS Electron UI remain. The main optimization still pending is **measuring and pruning the packaged Windows payload** with a real Windows build; deleting source-only material does not directly reduce the installer size.
