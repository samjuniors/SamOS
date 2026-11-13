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
