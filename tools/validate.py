#!/usr/bin/env python3
"""Explicit contract/token/plugin-entry checks; no default test run."""
import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
COUNTS = {'core-command': 'commandCount', 'host-request': 'hostRequestCount', 'ui-event': 'eventCount'}


def validate_contract(schema, count_key, schema_check=False):
    if schema_check:
        from jsonschema.validators import validator_for
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
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--checks', choices=['contracts', 'colors', 'plugin-entries', 'all'])
    parser.add_argument('--rationale', default='')
    parser.add_argument('--full-suite-requested', action='store_true')
    parser.add_argument('--schema-check', action='store_true', help='explicitly include the original JSON Schema validity check with contracts')
    args = parser.parse_args()
    if not args.checks:
        print('NOT_RUN: select --checks contracts|colors|plugin-entries|all with --rationale; all also needs --full-suite-requested')
        return
    if not args.rationale.strip():
        parser.error('selected checks need their concrete risk and necessity in --rationale')
    if args.schema_check and args.checks not in {'contracts', 'all'}:
        parser.error('--schema-check is meaningful only with contracts or all')
    if args.checks == 'all' and not args.full_suite_requested:
        parser.error('all requires --full-suite-requested after an explicit user request')
    if args.checks in {'contracts', 'all'}:
        for name, key in COUNTS.items():
            validate_contract(json.loads((ROOT/'contracts'/f'{name}.schema.json').read_text(encoding='utf-8')), key, args.schema_check)
        print('PASS: selected contract enums and counts; JSON Schema validity is a separate schemas check')
    if args.checks in {'colors', 'all'}:
        registry = json.loads((ROOT/'theme/registry.json').read_text(encoding='utf-8'))
        assert registry['schemaVersion'] == 1
        validate_colors(registry)
        print('PASS: selected RGBA tokens')
    if args.checks in {'plugin-entries', 'all'}:
        for manifest in (ROOT/'plugins').glob('*/manifest.json'):
            data = json.loads(manifest.read_text(encoding='utf-8'))
            assert (manifest.parent/data['main']).is_file(), f'missing plugin entry: {manifest}'
        print('PASS: selected plugin entries')


if __name__ == '__main__':
    main()
