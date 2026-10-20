"""Explicit schema/font checks using upstream parsers; no default test run."""
import argparse
import json
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--checks", choices=["schemas", "fonts", "all"])
    parser.add_argument("--rationale", default="")
    parser.add_argument("--full-suite-requested", action="store_true")
    args = parser.parse_args()
    if not args.checks:
        print("NOT_RUN: select --checks schemas|fonts|all with --rationale; all also needs --full-suite-requested")
        return
    if not args.rationale.strip():
        parser.error("selected checks need their concrete risk and necessity in --rationale")
    if args.checks == "all" and not args.full_suite_requested:
        parser.error("all requires --full-suite-requested after an explicit user request")
    root = Path(__file__).resolve().parents[1]
    if args.checks in {"schemas", "all"}:
        from jsonschema.validators import validator_for

        schemas = sorted((root / "contracts").glob("*.schema.json"))
        assert len(schemas) == 3, "The three published contracts must be present"
        for path in schemas:
            schema = json.loads(path.read_text(encoding="utf-8"))
            validator_for(schema).check_schema(schema)
        print(f"PASS: {len(schemas)} selected schemas")
    if args.checks in {"fonts", "all"}:
        from fontTools.ttLib import TTFont

        fonts = sorted((root / "fonts").glob("*.ttf")) + sorted((root / "fonts").glob("*.otf"))
        assert fonts, "No font assets found"
        for path in fonts:
            license_path = root / "fonts" / ("Inter-OFL.txt" if path.name.startswith("Inter") else "OFL.txt")
            assert "SIL OPEN FONT LICENSE" in license_path.read_text(encoding="utf-8"), f"Missing font license: {path.name}"
            with TTFont(path, lazy=False, checkChecksums=2) as font:
                assert font.getBestCmap(), f"Missing glyph map: {path.name}"
                for tag in font.keys():
                    font[tag]
        print(f"PASS: {len(fonts)} selected fonts and licenses")


if __name__ == "__main__":
    main()
