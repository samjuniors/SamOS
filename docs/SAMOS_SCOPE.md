# SamOS scope — Windows Electron and Hermes backend

**Product target:** a Windows-first, voice-first Electron app with Sofia, projects/company workspaces, browser/desktop automation, subagents and optional Paperclip-inspired task orchestration.

## Kept as product code
- `apps/desktop/`, `apps/shared/`: Electron main, preload, React renderer, windowing, microphone, Sofia views, panels, settings, update integration and Windows-native UX.
- `run_agent.py`, `agent/`, `tools/`, `hermes_cli/`, `hermes_state*.py`, `providers/`, `gateway/`: Hermes Python runtime and gateway protocol. A CLI module may remain necessary for internal launch, even if no terminal UI ships.
- `skills/`, `optional-skills/`, `plugins/`, `plugin-catalog/`, `optional-mcps/`: retain until explicit discovery, signing, consent, and feature tests show which can be made opt-in or external.
- The desktop's voice-first shell contract (`apps/desktop/VOICE_AI_OS_SPEC.md`) and safety pathways such as computer-use emergency stop and manual approval.

## Removed from the product source tree in this pass
- Upstream Docusaurus `website/`, which is already excluded from the sealed agent snapshot.
- Website-only deployment and monitoring jobs; website-specific documentation tests and docs-drift script.
- Obsolete `just docs-* ` targets that would refer to files no longer in the repository.

## Deferred (do not delete on directory names alone)
- `web/` and `ui-tui/`: the existing Python payload stage script builds both when generating a bundled artifact. Their separation is a distinct build-contract migration.
- Mac/Linux packaging: several Electron hooks and build helpers are shared with Windows, so run Windows build checks first.
- Upstream release workflows: remain until SamOS-controlled publish/update channels and installer verification replace them.
- Anything branded Hermes at runtime: rebrand in a separate testable change, avoiding accidental profile/IPC changes or data loss.

## Build and release contract
1. No production release until an actual Windows x64 Electron launch, Sofia voice session, agent-tool invocation, emergency-stop path, installer and update test have passed.
2. `docs/SAMOS_WINDOWS_CI.md` defines initial verification and the limitations of an unpacked electron-builder build.
3. No remote push, merge, release, skill installation, or destructive external action by Sofia without the appropriate owner approval.
4. **Paperclip integration is not verified.** A catalog entry or proposed design is not equivalent to a running orchestration backend.
