import assert from 'node:assert/strict';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

assert.equal(ts.version, '5.9.3', 'Use the compiler pinned by package-lock.json');
const check = process.argv.includes('--check');
for (const entry of readdirSync(new URL('../plugins/', import.meta.url), { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const directory = new URL(`../plugins/${entry.name}/`, import.meta.url);
  if (!readdirSync(directory).includes('code.ts')) continue;
  const source = new URL('code.ts', directory);
  const result = ts.transpileModule(readFileSync(source, 'utf8'), {
    fileName: fileURLToPath(source),
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.None,
      newLine: ts.NewLineKind.LineFeed,
    },
  });
  const errors = result.diagnostics.filter(item => item.category === ts.DiagnosticCategory.Error);
  assert.equal(errors.length, 0, errors.map(item => ts.flattenDiagnosticMessageText(item.messageText, '\n')).join('\n'));
  const output = '// Generated from code.ts with TypeScript 5.9.3; run npm run build:plugins.\n' + result.outputText;
  const destination = new URL('code.js', directory);
  if (check) assert.equal(readFileSync(destination, 'utf8'), output, `Stale plugin entry: ${entry.name}`);
  else writeFileSync(destination, output);
  console.log(`PASS: ${entry.name} ${check ? 'generated entry matches source' : 'JavaScript generated'}`);
}
