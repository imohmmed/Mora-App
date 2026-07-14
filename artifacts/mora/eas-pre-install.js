#!/usr/bin/env node
'use strict';
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Use stderr for all debug output — pnpm 11 may suppress stdout of child scripts
const log = (msg) => process.stderr.write('[eas-pre-install] ' + msg + '\n');

log('=== START ===');
log('node: ' + process.version);
log('cwd: ' + process.cwd());

// 1. pnpm version
const pnpmVer = spawnSync('pnpm', ['--version'], { encoding: 'utf8' });
log('pnpm version: ' + (pnpmVer.stdout || '').trim());

// 2. Write only-built-dependencies to ~/.npmrc so the runDepsStatusCheck
//    subprocess (which may ignore project config) still reads approvals.
const APPROVED = [
  '@firebase/util',
  '@swc/core',
  'better-sqlite3',
  'esbuild',
  'msw',
  'protobufjs',
  'unrs-resolver',
];
const homeNpmrc = path.join(os.homedir(), '.npmrc');
try {
  const existing = fs.existsSync(homeNpmrc) ? fs.readFileSync(homeNpmrc, 'utf8') : '';
  log('~/.npmrc before: ' + existing.slice(0, 300));
  if (!existing.includes('only-built-dependencies')) {
    const entries = APPROVED.map(p => 'only-built-dependencies[]=' + p).join('\n');
    fs.appendFileSync(homeNpmrc, '\n# EAS build script approvals\n' + entries + '\n');
    log('Wrote only-built-dependencies entries to ~/.npmrc');
  } else {
    log('~/.npmrc already has only-built-dependencies entries');
  }
  log('~/.npmrc after: ' + fs.readFileSync(homeNpmrc, 'utf8').slice(0, 500));
} catch (e) {
  log('~/.npmrc write error: ' + e.message);
}

// 3. Also write to /etc/npmrc if writable (global fallback)
try {
  fs.appendFileSync('/usr/local/etc/npmrc',
    '\n' + APPROVED.map(p => 'only-built-dependencies[]=' + p).join('\n') + '\n');
  log('Wrote to /usr/local/etc/npmrc');
} catch(e) { log('/usr/local/etc/npmrc not writable: ' + e.message); }

// 4. Show current project config for debugging
try {
  const wsYaml = path.join(__dirname, '..', '..', 'pnpm-workspace.yaml');
  const ws = fs.readFileSync(wsYaml, 'utf8');
  const m = ws.match(/onlyBuiltDependencies[\s\S]{0,300}/);
  log('workspace onlyBuiltDependencies: ' + (m ? m[0].slice(0, 200) : 'NOT FOUND'));
} catch(e) { log('workspace read error: ' + e.message); }

// 5. Try pnpm approve-builds with various non-interactive inputs
log('=== Trying pnpm approve-builds ===');
for (const input of [' \n', 'a\n', '\n']) {
  const res = spawnSync('pnpm', ['approve-builds'], {
    input,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: 15000,
  });
  log('approve-builds (input=' + JSON.stringify(input) + ') exit=' + res.status +
      ' stdout=' + (res.stdout || '').slice(0, 200) +
      ' stderr=' + (res.stderr || '').slice(0, 200));
  if (res.status === 0) break;
}

// 6. Run install
log('=== Running pnpm install --no-frozen-lockfile ===');
const install = spawnSync('pnpm', ['install', '--no-frozen-lockfile'], {
  stdio: 'inherit',
  timeout: 600000,
});
log('install exit: ' + install.status);
process.exit(install.status || 0);
