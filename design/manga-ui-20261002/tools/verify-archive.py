#!/usr/bin/env python3
"""Verify this immutable design archive without npm or third-party packages."""
from pathlib import Path
import argparse
import hashlib
import json

parser = argparse.ArgumentParser()
parser.add_argument('--source-root', type=Path, help='Override the original demo root for optional source comparison')
parser.add_argument('--require-source', action='store_true')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / 'INPUT_MANIFEST.json').read_text())
archive = json.loads((root / 'ARCHIVE_SHA256.json').read_text())
source = args.source_root or Path(manifest['sourceRoot'])
failures = []

def check(path, expected, label):
    if not path.is_file() or path.is_symlink():
        failures.append(f'{label}: missing, non-file or symlink')
    elif hashlib.sha256(path.read_bytes()).hexdigest() != expected:
        failures.append(f'{label}: SHA-256 mismatch')

for item in manifest['files']:
    archived = root / item['archivePath']
    check(archived, item['sha256'], item['archivePath'])
    if archived.is_file() and archived.stat().st_size != item['bytes']:
        failures.append(f"{item['archivePath']}: byte count mismatch")
    if source.is_dir():
        check(source / item['sourcePath'], item['sha256'], 'source/' + item['sourcePath'])
if args.require_source and not source.is_dir():
    failures.append('source root is unavailable')
for name, sha in archive['files'].items():
    check(root / name, sha, name)
locked = json.loads((root / 'prototype/mobile-runtime.lock.json').read_text())
for name, sha in locked.items():
    check(root / 'prototype' / name, sha, 'protected-runtime/' + name)
for name in archive['files']:
    parts = Path(name).parts
    if any(p in {'.git', 'node_modules', 'dist', '.reader-local', 'harmony-signing'} for p in parts):
        failures.append('forbidden archive path: ' + name)
    if Path(name).suffix.lower() in {'.p12', '.pfx', '.jks', '.keystore', '.pem', '.cer', '.p7b'}:
        failures.append('signing material is forbidden: ' + name)
if failures:
    raise SystemExit('\n'.join(failures))
print(json.dumps({'archiveFiles': len(archive['files']), 'exactDemoInputs': len(manifest['files']),
                  'protectedRuntimeFiles': len(locked),
                  'sourceComparison': 'PASS' if source.is_dir() else 'NOT_AVAILABLE',
                  'sha256': 'PASS'}, ensure_ascii=False))
