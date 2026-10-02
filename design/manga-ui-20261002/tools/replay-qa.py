#!/usr/bin/env python3
"""Replay exact original QA with URL/browser/output adapted in memory only."""
from pathlib import Path
import argparse

parser = argparse.ArgumentParser()
parser.add_argument('--url', default='http://127.0.0.1:4197/')
parser.add_argument('--output', type=Path, required=True, help='Separate writable replay results; never this archive')
parser.add_argument('--browser', type=Path, help='Optional Chromium executable; omit to use Playwright installed browser')
parser.add_argument('--scripts', nargs='+', choices=['qa_demo.py', 'qa_boundaries.py', 'qa_final_visuals.py', 'qa_recon.py'],
                    default=['qa_demo.py', 'qa_boundaries.py', 'qa_final_visuals.py'])
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
output = args.output.expanduser().resolve()
if output == root or root in output.parents:
    parser.error('output must be outside the immutable design archive')
output.mkdir(parents=True, exist_ok=True)
(output / 'screenshots').mkdir(exist_ok=True)
original_browser = '/Users/minliny/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell'
for name in args.scripts:
    original = root / 'records' / 'qa-scripts' / name
    code = original.read_text().replace('http://127.0.0.1:4197/', args.url)
    # Original scripts have one explicit executable keyword; leave app and assertions exact.
    for quote in ['\"', "'"]:
        old = ',executable_path=' + quote + original_browser + quote
        new = ',executable_path=' + repr(str(args.browser.resolve())) if args.browser else ''
        code = code.replace(old, new)
    print('REPLAY ' + name, flush=True)
    namespace = {'__name__': '__main__', '__file__': str(output / name)}
    exec(compile(code, str(original), 'exec'), namespace)
