# Hermes technical references retained for SamOS

These are developer pointers to the original, pre-prune source documentation. The full Docusaurus website is not a SamOS runtime dependency. **Do not copy upstream installation endpoints or publishing configuration into SamOS.** This index links to the exact pre-cleanup commit, so the documentation remains available even when `website/` is removed from the active tree.

## Core architecture
- [Agent and gateway architecture](https://github.com/samjuniors/SamOS/blob/bd33b471b34a6019db7f7dd9be4086102ebbbc4e/website/docs/developer-guide/architecture.md): the `run_agent.py` execution loop, `model_tools.py` registry, `gateway/` messaging and the session/state persistence modules. SamOS continues to use these as its agent backend.
- [Desktop integration architecture](https://github.com/samjuniors/SamOS/blob/bd33b471b34a6019db7f7dd9be4086102ebbbc4e/website/docs/user-guide/desktop.md): Electron renderer, API/gateway, local and remote backends, session state, model selection, Windows lifecycle. SamOS ships its own voice-first desktop experience.
- [Desktop extension SDK](https://github.com/samjuniors/SamOS/blob/bd33b471b34a6019db7f7dd9be4086102ebbbc4e/website/docs/developer-guide/desktop-plugin-sdk.md): native desktop plugin contributions and scoped API. This is **different** from the browser dashboard plugin SDK and Python gateway plugins; verify these seams before changing `plugins/`, `plugin-catalog/` or `apps/desktop/src/plugins/`.

## Security and operating requirements
- [Security model](https://github.com/samjuniors/SamOS/blob/bd33b471b34a6019db7f7dd9be4086102ebbbc4e/website/docs/user-guide/security.md): dangerous-command approvals, protected paths, MCP credential filtering, session isolation, and sandbox boundaries. These must survive the Windows-only scope change.
- [Windows native guide](https://github.com/samjuniors/SamOS/blob/bd33b471b34a6019db7f7dd9be4086102ebbbc4e/website/docs/user-guide/windows-native.md): Windows state locations, terminal/process behavior, gateway lifecycle, browser integration and installation pitfalls. Adapt only the verified behavior to SamOS. Do **not** invoke the upstream Hermes installer from SamOS release flows.
- [Provider routing](https://github.com/samjuniors/SamOS/blob/bd33b471b34a6019db7f7dd9be4086102ebbbc4e/website/docs/user-guide/features/provider-routing.md): provider routing restrictions and preferences; test against the actual provider implementation before promising free-first model routing.
- [Voice mode](https://github.com/samjuniors/SamOS/blob/bd33b471b34a6019db7f7dd9be4086102ebbbc4e/website/docs/user-guide/features/voice-mode.md): STT/TTS, recording, full-duplex and interruption paths. SamOS has a separate Windows voice-first shell specification (`apps/desktop/VOICE_AI_OS_SPEC.md`); treat claims of functionality as unverified until exercised on a device.
- [Installation and MSIX guide](https://github.com/samjuniors/SamOS/blob/bd33b471b34a6019db7f7dd9be4086102ebbbc4e/website/docs/getting-started/installation.md): distinguishes bundled MSIX from source bootstrap and Microsoft Store ownership.

## Attribution and implementation safeguards
- Retain upstream `LICENSE` and authorship notices, and preserve origin links in derivations.
- The upstream docs above are references, **not** SamOS product documentation, release guarantees or test evidence.
- User-facing SamOS installation instructions must point only to a validated SamOS release after Windows acceptance.
- The git-history commit above is the preservation anchor; no irreversible history rewrite is part of this cleanup.
