# SamOS Windows Electron runtime dependency audit — 2026-11-13

Branch: `chore/samos-cleanup-consolidated`. GitHub draft PR: #7. This is a **static source/build-graph review** only; no Windows host was online during the audit, and no real executable has been launched or installed.

## Decision matrix

| Tree / feature | Actual build / runtime linkage | Decision |
| --- | --- | --- |
| `website/`, `evals/` | Upstream docs site and standalone evaluation fixtures, not primary Electron app inputs; removed on PR #5 | **Already removed** (core tests remain; site-specific tests retired) |
| `ui-tui/` | `pnpm-workspace.yaml` lists it; full-profile `scripts/bundles/stage.py` builds TUI via `scripts/build/tui.mjs`; `scripts/build/agent.py` can plant `hermes_cli/tui_dist` | **Keep source** until full-profile/test callers are migrated and runtime regressions pass; exclude from explicit electron-only agent payload |
| `web/` | A pnpm workspace; full-profile stage builds `scripts/build/web.mjs`; `scripts/build/agent.py` can plant `hermes_cli/web_dist` | **Keep source** pending callsite/test migration; exclude from explicit electron-only payload |
| `tui_gateway/` | Python backend/gateway transport and source-retention guard; not equivalent to the TUI React/Ink frontend | **Keep** — do not prune just because its name contains `tui` |
| `apps/desktop/scripts/build-webapp.mjs`, `apps/desktop/dist-webapp` | Separate desktop webapp input/output, referenced by `webapp` frontend staging and test/build scripts | **Keep** until browser-hosted interface dependencies are verified |
| `agent/`, `tools/`, `hermes_cli/`, `gateway/`, `apps/shared/` | Hermes agent execution, tools and transport | **Keep** and verify tool invocation/cancel/permissions on Windows |
| `plugins/`, `skills/`, `optional-skills/`, `plugin-catalog/` | Dynamic skill/tool/catalog loading may reference them; installer subset not mapped | **Keep**, gate any future pruning on discovery tests |
| `contributors/` | Attribution archive tracked in source, not needed inside sealed agent runtime | **Keep in Git, exclude from packaged agent snapshot** |
| Mac/Linux/Docker/Nix runtime and packaging | Mixed upstream source and CI/build helpers; deleting by platform name could break shared tooling | **No further deletions without dependency graph** |

## Packaging facts

1. `apps/desktop/electron-builder.config.cjs` whitelists `dist/**`, `assets/**`, `public/**`, `package.json` for Electron application files. For `HERMES_DESKTOP_VARIANT=bundled` or `store`, it additionally copies `build/agent-payload` into resources.
2. `scripts/bundles/payload.py` already excludes docs/tests/website/evals/apps/ui-tui/web/scripts from agent snapshots. The consolidated branch also excludes contributor archives. **Removing source directories does not prove installer size improvement.**
3. `apps/desktop/package.json` default `payload` and inherited `dist:bundled` still select the full frontend build. The explicit `payload:samos` profile passes `--frontend-profile electron-only` to `scripts/bundles/stage.py`, which passes zero frontends to `stage_native`.
4. `pack:samos:unpacked` now links the lean profile into a **non-publishing** bundled Windows x64 unpacked build; static contract test checks its script wiring. No bundle execution has been performed.
5. `.github/workflows/samos-windows.yml` currently packages the **unbundled desktop shell** only, while also running the agent profile selection test. Report this shell size separately from the agent-inclusive package. Neither alone proves final signed MSIX bytes.

## Critical blockers before merge / release

- Inherited `product-identity.cjs` and MSIX publisher still identify Hermes/Nous; implement approved SamOS app identity and migration rules before releasing.
- Historical cloud API credential exposure flagged in `README.md`; its provider must revoke/rotate the exposed credential. Current-tree cleanup cannot undo Git history exposure.
- Voice/microphone always-on boot, backend tools, Windows computer-use Esc/cancel and authorization, real Paperclip API, autonomous repair and rollback must be exercised against the actual packaged runtime.
- Verify Python backend launches from the bundled agent manifest on Windows and has only required executables/data; audit legal attribution and MSIX signing/update feeds.
- Run Windows full-package size and launch comparisons against a reproducible baseline; do not declare the application lightweight based on deleted Git source alone.

## Next safe work

1. Let PR #7 CI finish; inspect failing jobs/steps and repair only confirmed failures.
2. On an authorized Windows host: install locked dependencies, run `pack:samos:unpacked`, verify backend+UI IPC and voice/tool execution, capture unpacked/Msix sizes and path inventories.
3. Map remaining optional TUI/web imports and tests before any further deletions; preserve user-facing and agent capabilities.
4. Keep PR #7 draft, `main` untouched and all releases unpublished until acceptance.
