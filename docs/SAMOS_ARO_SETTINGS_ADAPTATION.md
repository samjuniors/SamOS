# SamOS Settings adaptation from Aro

Date: 2026-11-13
Source: `samjuniors/Aro`, `AroMain` at `842fbd97c22f513e7da511305d7b8368ff66ee50` (owner-provided reference).
Target: `samjuniors/SamOS`, `feature/samos-aro-settings-parity` (draft PR #8 stacked on draft PR #7).
Status: SOURCE ADAPTATION; **NOT WINDOWS ACCEPTED OR RELEASED**.

## What is adapted

- Aro's calm Settings landing page and compact theme-mode toggle, with SamOS navigation to Sofia voice, providers, workspace, safety, plugins, memory, appearance and advanced settings.
- Contextual navigation ("More settings") retains all deep-link handlers. SamOS-only Plugins, local models, web access and delegated-agent controls are preserved rather than overwritten by Aro's older navigation implementation.
- Credential navigation groups account sign-in, API keys and encrypted vault destinations while retaining the original route handlers.
- Aro provider cards and credential rows: readable configured status, accessible status badges, restrained borders, focus/reduced-motion styles, settings-scope selection, existing account onboarding and key save/remove flows.
- SamOS-specific provider hardening: if OAuth discovery fails, show an error with Retry rather than treating unreachable providers as disconnected. The Local Models view must not fall back to API keys.
- Validate user-selected configuration JSON before sending it through the existing debounced autosave path; preserve unknown plugin extension fields but reject malformed, oversized, deeply nested or prototype-key-containing JSON.

## Connection semantics

- OAuth status is reported by the backend provider-auth endpoint. It is **not** an independent proof that a model API call will succeed.
- A saved API key is reported as **Configured**, **not Connection verified**. The existing onboard/connect flow uses backend provider credential validation, model discovery and runtime-readiness checks; custom endpoints have their own validator.
- Do not retrieve, expose or log the full saved key just to display a connection badge. For a live acceptance check, use a test provider and a model request on the intended profile/connection.
- Offline mode and local model availability must be checked on an actual Windows host. Do not mask gateway failures as empty account lists.

## Exclusions and migration constraints

- No wholesale copying of Aro's backend, global settings schema, subscription/billing screens, or designer-only features. SamOS has distinct plugins, agent delegation, Sofia voice and Windows packaging dependencies.
- Aro's conditional config-write API (`expected_fields`) was **not** ported: SamOS's existing config endpoint/client do not currently advertise this contract. Adding only the UI write guard would create a false concurrency guarantee.
- Existing SamOS provider routes, Python credentials/storage, profile scoping and env precedence remain the authority.
- Theme size/shape/contrast must be compared in a live Windows build at 100%, 125% and 150%; source adaptation alone is not visual acceptance.

## Windows voice-shell entrypoint integration (2026-11-14)

- Root cause of the visual mismatch: SamOS's default `VoiceAiOsRoot` always opened `AiProviderSettingsModal` for the Settings gear. The Aro-derived `SettingsView` was only reachable from the opt-in classic chat shell, not the shipped voice-first UI.
- The primary Settings gear now lazily mounts the existing complete Settings overlay inside a dedicated `MemoryRouter`, with the same query, i18n, theme, haptics and tooltip providers used by classic chat. The voice shell remains mounted underneath and its global URL is not rewritten.
- The provider badge opens the full Providers page directly. Sofia's separate voice-engine `.env`/offline control remains available through the voice setup notice and the footer voice-engine control; those two credential systems are not silently merged.
- Verified on DESKTOP-AND1FUJ with the built Electron renderer: overview displays Aro-style sidebar, grouped cards and theme selector; Providers sidebar expands to Accounts, API keys, Custom Endpoints and Local Models. No renderer exception seen when navigating. This verifies UI routing and appearance, **not a real provider login or voice model call**.
- Two focused route/close regression tests (`voice-os-settings-panel.test.tsx`) pass and the changed components pass ESLint. Source TypeScript passed before the final button-label correction; rerun full checks after it.

## Verification

- Imported Aro-oriented tests cover contextual navigation, credential grouping, the compact theme toggle and config-import validation.
- Extended provider tests cover gateway discovery Retry and Local Models routing.
- Run `pnpm --dir apps/desktop run typecheck`, `pnpm --dir apps/desktop run lint`, and `pnpm --dir apps/desktop run test:ui` under the pinned toolchain.
- Run `.github/workflows/samos-windows.yml` agent-inclusive Windows package build. Verify actual launch, microphone/Sofia voice setup, OAuth sign-in/out, API-key save/remove, credentials scoped to active vs selected profile, custom endpoints, model selection/fallback and tools.
- Check screenshot parity against Aro and keyboard-only/reduced-motion accessibility.
- Do not merge PR #8 or #7 and do not publish a Windows installer before acceptance.
