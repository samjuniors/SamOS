# SamOS build and CI workflows

SamOS targets **Windows Electron**. The original Hermes release workflows are retained temporarily until a measured Windows artifact build and independent end-to-end acceptance; they are not approved for SamOS publication.

- `samos-windows.yml`: required new Windows build/typecheck and focused SamOS tests (runs on desktop-related pull requests).
- `ci.yaml`: inherited Hermes unit/integration review pipeline; the upstream docs-site job was removed along with the upstream site.
- `desktop-bundled-release.yml` and the upstream stable/canary publication workflows: **do not run or release SamOS** until Windows-only product identity, signing, update URL, artifact names, and rollback policy are audited.
- `docs-site-checks.yml`, `deploy-site.yml`, `docs-search-monitor.yml`, and upstream `skills-index` site publishing have been removed.

A passing source invariant does not replace a Windows real-host microphone/tool/browser/computer-use test. Do not merge the cleanup draft before Windows verification.

Retired workflow families: Hermes Docker image publication, Nix flake validation, Termux packaging, the Hermes stable/canary release controllers, and upstream catalog maintenance. SamOS has not shipped a new replacement installer or release updater.
