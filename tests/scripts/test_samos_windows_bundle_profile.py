"""SamOS's explicit lean payload profile must not build standalone frontends."""
from __future__ import annotations

from pathlib import Path

import pytest

from scripts.bundles import stage


def test_electron_only_stages_agent_without_building_web_or_tui(tmp_path, monkeypatch):
    output = tmp_path / "bundle"
    calls = []

    def fake_stage_native(args):
        calls.append(args)
        return 0

    monkeypatch.setattr(stage, "stage_native", fake_stage_native)
    assert stage.main(["--out", str(output), "--frontend-profile", "electron-only"]) == 0
    assert len(calls) == 1
    assert calls[0].frontends == {}
    assert (output / "manifest.json").exists() is False


@pytest.mark.parametrize("args", [
    ["--tui", "tui"],
    ["--web", "web"],
])
def test_electron_only_rejects_explicit_frontends(tmp_path, args):
    with pytest.raises(SystemExit) as exc:
        stage.main(["--out", str(tmp_path / "bundle"),
                    "--frontend-profile", "electron-only", *args])
    assert exc.value.code == 2


def test_explicit_samos_unpacked_package_includes_native_agent_without_tui_web():
    """The optional Windows package command must stage the lean backend first."""
    import json

    root = Path(__file__).resolve().parents[2]
    scripts = json.loads((root / "apps/desktop/package.json").read_text(encoding="utf-8"))["scripts"]
    assert "--frontend-profile electron-only" in scripts["payload:samos"]
    package = scripts["pack:samos:unpacked"]
    assert package.startswith("pnpm run payload:samos && ")
    assert package.count("HERMES_DESKTOP_VARIANT=bundled") == 2
    assert "--dir" in package and "--win" in package
    assert "--publish never" in package
    # Existing Hermes full-profile packaging remains intact for compatibility.
    assert "--frontend-profile electron-only" not in scripts["payload"]
