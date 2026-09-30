"""Validate existing assets using upstream schema and font parsers."""
import json
from pathlib import Path

from fontTools.ttLib import TTFont
from jsonschema.validators import validator_for

root = Path(__file__).resolve().parents[1]
schemas = sorted((root / "contracts").glob("*.schema.json"))
assert len(schemas) == 3, "The three published contracts must be present"
for path in schemas:
    schema = json.loads(path.read_text())
    validator_for(schema).check_schema(schema)

fonts = sorted((root / "fonts").glob("*.ttf")) + sorted((root / "fonts").glob("*.otf"))
assert fonts, "No font assets found"
for path in fonts:
    license_path = root / "fonts" / ("Inter-OFL.txt" if path.name.startswith("Inter") else "OFL.txt")
    assert "SIL OPEN FONT LICENSE" in license_path.read_text(), f"Missing font license: {path.name}"
    with TTFont(path, lazy=False, checkChecksums=2) as font:
        assert font.getBestCmap(), f"Missing glyph map: {path.name}"
        for tag in font.keys():
            font[tag]  # Decode tables now so malformed data does not pass lazy loading.
print(f"PASS: {len(schemas)} schemas; {len(fonts)} fonts and licenses")
