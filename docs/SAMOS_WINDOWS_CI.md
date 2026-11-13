# SamOS Windows baseline CI

Workflow: `.github/workflows/samos-windows.yml`. This is a **non-publishing** Windows-hosted acceptance lane on draft PR #7. It preserves the upstream runtime until the replacement app and installer are proven.

## Independent gates

- `windows-lint` runs pinned setup, locked JS dependency installation and `pnpm --dir apps/desktop run lint`. It is **not** `continue-on-error`; a lint failure remains a PR blocker.
- `windows-electron` independently runs the source-retention guard, Python lean-profile regression tests, locked JS dependencies, Electron toolchain, desktop TypeScript typecheck, UI tests, Electron unit tests, and the **agent-inclusive** packaging command `pnpm --dir apps/desktop run pack:samos:unpacked`.
- Both jobs must pass. The split prevents existing lint debt from hiding subsequent renderer, Electron or Python packaging failures.
- The unpacked Windows x64 package uses `HERMES_DESKTOP_VARIANT=bundled` plus `payload:samos`, including the native Python agent runtime while omitting standalone TUI/web frontend products. No software is published, signed, installed or updated.
- The size report includes `profile=samos-agent-inclusive-electron-only` so it cannot be confused with an Electron-shell-only measurement.

## Current evidence / blockers (2026-11-13)

The prior run on commit `f1b74ac` passed pinned setup, source guard, payload test, JS dependency installation, Electron preparation and typecheck, then failed at lint. Its UI/Electron tests and packaging were skipped. The lint job reported **433 errors and 715 warnings**; many errors involve import sorting, unused imports, JSX prop sorting and curly braces. These still require a real source fix, not a lint suppression.

The independent packaging gate was introduced in commit `8d45449` and is not counted as passed until its corresponding Windows job completes successfully.

## Not proven by this workflow

- Sofia real microphone capture, voice-first boot, listening/TTS playback and barge-in
- Actual agent-to-Hermes-backend tool calls against live model/provider credentials
- Computer-use approval prompts, ESC cancellation, target handling and multi-step completion
- Paperclip's live API orchestration, end-to-end company agent delegation and cost accounting
- MSIX installer install/uninstall, Publisher identity, digital signing, updater feed/rollback
- Reproducible installer-byte reduction relative to a Windows baseline

Both registered Desktop Commander Windows hosts were offline on 2026-11-13. Real-host acceptance remains blocked, not failed or passed.

## Further cleanup / release ownership

Retain `tui_gateway/` (Python backend), `agent/`, `gateway/`, `tools/`, `skills/` and other dynamic extension systems. The electron-only payload excludes unnecessary UI products; removing `web/`, `ui-tui/`, Mac/Linux scripts or inherited Hermes workflows from the source repository still requires a callsite/test review. The installer is still named and published as Hermes in inherited identity/configuration; **do not publish or auto-update** while SamOS app identity, MSIX publisher, data migration and feed ownership remain unsettled.

Recommended progression: clean lint errors, pass both independent Windows jobs, verify the packaged Sofia and backend tool path on Windows, then implement a SamOS-owned signing/install/update pipeline and retire old release workflows. Keep PR #7 draft and `main` untouched until evidence is accepted.
