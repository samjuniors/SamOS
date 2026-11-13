# SamOS Windows baseline CI

`.github/workflows/samos-windows-ci.yml` is a read-only build and smoke lane on a Windows-hosted GitHub Actions runner. It does **not** publish software.

## Checks
1. Checkout and configure the repository's pinned Node/pnpm/Python toolchain with `.github/actions/setup-pm`.
2. Install locked JS workspace dependencies and prepare Electron runtime via existing `just` targets.
3. Run desktop TypeScript typechecking and UI/Electron unit tests.
4. Build the React renderer + Electron main/preload bundles.
5. Package an **unpacked**, unsigned Windows x64 app via electron-builder `--dir`.
6. Write app output size and a build summary. This is not the final MSIX installation size.

## Not proven by this workflow
- Real microphone permissions or continuous Sofia voice, TTS playback and barge-in
- Desktop computer-use target selection, ESC cancellation and safety prompts
- Full sealed Python backend payload or Paperclip orchestration
- MSIX installation, digital signing, automatic update and rollback
- Installer bytes compared against a baseline before pruning other platform builds

The existing Windows install/update and desktop attach workflows remain preserved until they are brought under SamOS release ownership and explicitly verified. `main` should remain protected; PRs stay draft until the owner accepts these checks.

## Lean bundle profile under test
- `pnpm --dir apps/desktop run payload:samos` explicitly passes `--frontend-profile electron-only` to the native bundle stage driver.
- Default `pnpm --dir apps/desktop run payload` still builds the existing TUI, web and webapp products; no release behavior changes yet.
- `tests/scripts/test_samos_windows_bundle_profile.py` checks profile selection, no frontend staging, and rejection of conflicting explicit UI products.
