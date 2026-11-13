# SamOS cleanup audit — initial pass (2026-11-13)

Scope: [samjuniors/SamOS](https://github.com/samjuniors/SamOS), `main` commit `bd33b471b34a6019db7f7dd9be4086102ebbbc4e`. No Windows host execution performed in this pass.

## Findings

- **25,215 files**, about **253.4 MB** of Git blob content.
- Compared path/blob hashes against a current snapshot of `NousResearch/hermes-agent/main`: **24,989 identical paths**, **195 overlapping paths with different contents**, **31 SamOS-only files**, **312 upstream-only files**. Upstream may have advanced since the SamOS import; different blobs do not by themselves establish original SamOS changes.
- SamOS-specific files include `apps/desktop/src/app/voice-ai-os/`, `apps/desktop/src/store/{voice-state,company-state,agent-decision-engine,ai-provider-config,self-repair-engine,...}.ts`, `apps/desktop/electron/voice-ai-os-bridge.ts`, and startup scripts. These are **protected from bulk cleanup**.
- The Electron entrypoint in `apps/desktop/src/main.tsx` defaults to `VoiceAiOsRoot`; classic Hermes UI is accessible through the `win=classic` route.
- `company-state.ts` stores company data in browser localStorage, and `runCompanyHeartbeat()` simulates task progress/completion; this is **not a live Paperclip integration**.
- `company-onboarding-modal.tsx` announces company registration on Paperclip without showing server API registration; the announcement must be corrected when implementing the adapter.
- `voice-ai-os-root.tsx` includes a **mock workspace canvas preview**.
- `self-repair-engine.ts` performs limited checks and seeds demo CUA elements; its health/success messages should not be treated as verified real repairs.
- `ai-provider-config.ts` stores UI overrides, including the `cloudApiKey` property, in browser localStorage. This requires security remediation before production.
- Both old launch scripts used `HERMES_DESKTOP_BOOT_FAKE=1` and terminated **all** Electron processes. This cleanup removes both behaviors.

## Deletions in this safe pass

Five inherited translated documentation duplicates, not imported by runtime source:
- `README.es.md`
- `README.ur-pk.md`
- `README.zh-CN.md`
- `CONTRIBUTING.es.md`
- `SECURITY.es.md`

English security policy, development guides, source, tests, copyright license, and project specs are retained.

## Candidates for later, dependency-aware pruning (NOT YET DELETED)

1. `website/` (791 files): upstream Hermes documentation website; first preserve relevant engineering reference and remove stale imports/docs workflows.
2. `contributors/` (2,896 files): Hermes upstream email-to-contributor credit mapping; preserve required attribution and upstream credit history when deciding what to prune.
3. `ui-tui/`, `web/`, `acp_adapter/`: alternative Hermes surfaces; inspect desktop install/bootstrap, gateway, and shared build dependencies before removal.
4. `docker/`, `nix/`, Linux/macOS packaging paths and workflows: primarily outside the Windows target but used by some build and CI checks.
5. `tests/` (8,312 files): keep core security/backend/runtime regression coverage; later subset only after a test ownership map.
6. `plugin-catalog/` and `optional-skills/`: retain for now because SamOS needs extensibility, and optional loading may have runtime consumers.

## Required next acceptance

- Install pinned dependencies and run Desktop typecheck, lint, UI tests, Electron tests on a Windows host.
- Verify real Hermes gateway startup, voice microphone permission and recognition, tool invocation, cancellation, and end-to-end task reporting.
- Implement a real Paperclip API/adapter with auth, company IDs, tasks, heartbeat execution, and reliable error states; test against an actual Paperclip instance.
- Remove simulated task completion/metrics or visually label them as sample data before exposing the company board to real users.
- Confirm proprietary identity/config, packaging, updates, and OS-only installer behavior before further deleting code.

**Branch policy:** perform large deletions on a review branch; do not merge or release before tests.
