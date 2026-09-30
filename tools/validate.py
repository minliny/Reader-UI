#!/usr/bin/env python3
"""Validate the published contract snapshots and design-token data."""
import json
from pathlib import Path
from jsonschema.validators import validator_for

ROOT = Path(__file__).resolve().parent.parent
COUNTS = {'core-command': 'commandCount', 'host-request': 'hostRequestCount', 'ui-event': 'eventCount'}

def validate_contract(schema, count_key):
    validator_for(schema).check_schema(schema)
    names = schema['properties']['type']['enum']
    assert len(names) == len(set(names)), 'duplicate contract type'
    assert all(isinstance(name, str) and name.strip() == name and name for name in names)
    assert schema['x-reader-ui-contract'][count_key] == len(names), 'stale contract count'

def validate_colors(value):
    if isinstance(value, dict):
        if {'r', 'g', 'b', 'a'} <= value.keys():
            assert all(isinstance(value[k], (int, float)) and 0 <= value[k] <= 255 for k in ('r', 'g', 'b'))
            assert isinstance(value['a'], (int, float)) and 0 <= value['a'] <= 1
        for child in value.values():
            validate_colors(child)
    elif isinstance(value, list):
        for child in value:
            validate_colors(child)

def main():
    for name, key in COUNTS.items():
        validate_contract(json.loads((ROOT/'contracts'/f'{name}.schema.json').read_text()), key)
    registry = json.loads((ROOT/'theme/registry.json').read_text())
    assert registry['schemaVersion'] == 1
    validate_colors(registry)
    for manifest in (ROOT/'plugins').glob('*/manifest.json'):
        data = json.loads(manifest.read_text())
        assert (manifest.parent/data['main']).is_file(), f'missing plugin entry: {manifest}'
    print('PASS: three JSON Schemas, contract counts, RGBA tokens and plugin entries')

if __name__ == '__main__':
    main()
