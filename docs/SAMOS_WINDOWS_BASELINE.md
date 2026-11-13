# SamOS Windows Electron baseline — cleanup pass 1

Goal: a Windows-first Electron application with Hermes agent runtime and Paperclip-inspired orchestration. This branch starts with safe artifact hygiene, not wholesale source deletion.

## Preserve until verified
- `apps/desktop/`, `apps/shared/`, Electron main/preload/renderer, Windows installer and runtime integration.
- Agent runtime (`agent/`, `tools/`, `hermes_cli/`, `hermes_state*.py`, `run_agent.py`), model providers, state and tool execution.
- Tests relevant to Windows, agent execution, permissions, update/install, voice, dynamic UI, computer use, and orchestration.
- License/copyright notices for Hermes and any upstream Paperclip material.

## Candidates for later dependency-checked removal or packaging exclusion
- `website/` and standalone `web/` if no desktop build or runtime imports depend on them.
- `ui-tui/`, `tui_gateway/`, cloud/server gateways, Linux/macOS installers and Nix if excluded from Windows runtime.
- `plugin-catalog/`, `contributors/`, `evals/`, broad optional skills and marketing assets if not referenced by runtime or tests.
- CI workflows: simplify only after choosing Windows Electron checks and build smoke tests.

Do **not** delete those candidates by directory name alone. Check imports, package scripts, bundler inputs, dynamic asset discovery and license obligations first. Removing tracked source does not by itself shrink a packaged application; trim bundler inputs and installer payloads, then measure resulting installer size.

## Pass 1
Remove accidental root-level gateway debugging captures (`gwlog_live_head_*.log`, `live_head.json`). Ignore recurrence. No runtime source or application test changed.

## Next validation
On Windows: install pinned toolchain, run desktop typecheck, unit tests, Electron launch smoke test, voice-first boot and back-end tool calling, then Windows package build. Compare baseline and changed installer sizes.

## Pass 2 — bundled payload precision
- Verified `electron-builder.config.cjs` already whitelists only `dist/**`, `assets/**`, `public/**` and `package.json` for Electron app files.
- Verified `scripts/bundles/payload.py` excludes `website`, `apps`, `web`, `ui-tui`, tests and scripts from the bundled Hermes Python agent snapshot. Removing these trees from Git is **not** an installer-size win.
- Added `contributors/` to the payload snapshot exclusion: keep full source attribution in Git, but avoid copying the archive of contributor email files into a shipped Windows agent runtime.
- Added a synthetic Git snapshot regression test to ensure the agent runtime remains present and contributor archive, test and website trees stay out of the shipped snapshot.
- Deliberately retained `plugin-catalog/`, `optional-skills/`, `plugins/`, `skills/`, and all runtime state modules until their runtime discovery/feature wiring is audited; stripping them without tests risks disabling Sofia tools.
- No Windows executable was built during this Chat-only pass; actual package size and feature smoke tests remain pending.
