#!/usr/bin/env node
'use strict';
const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function log(msg) { console.log('[eas-pre-install]', msg); }
function tryExec(cmd) { try { return execSync(cmd, { encoding: 'utf8' }).trim(); } catch(e) { return null; } }

log('============================================================');

// 1. pnpm version
const ver = tryExec('pnpm --version');
log('pnpm version: ' + ver);

// 2. Find pnpm.mjs and extract runDepsStatusCheck source
try {
  const pnpmBin = tryExec('which pnpm');
  const realBin = pnpmBin ? fs.realpathSync(pnpmBin) : null;
  log('pnpm binary: ' + realBin);

  const candidates = realBin ? [
    path.join(path.dirname(realBin), '..', 'dist', 'pnpm.mjs'),
    path.join(path.dirname(realBin), 'pnpm.mjs'),
    realBin.replace(/\/bin\/pnpm(\.cjs)?$/, '/dist/pnpm.mjs'),
  ] : [];

  let mjsContent = null, mjsPath = null;
  for (const c of candidates) {
    try { const r = fs.realpathSync(c); if (fs.existsSync(r)) { mjsPath = r; mjsContent = fs.readFileSync(r, 'utf8'); break; } } catch(e) {}
  }

  if (mjsPath) {
    log('pnpm.mjs: ' + mjsPath + ' (' + (mjsContent.length / 1024 / 1024).toFixed(1) + 'MB)');
    const lines = mjsContent.split('\n');
    log('total lines: ' + lines.length);

    // Find runDepsStatusCheck
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('runDepsStatusCheck')) {
        log('runDepsStatusCheck at line ' + (i+1) + ':');
        log(lines.slice(i, i + 15).join('\n').slice(0, 2000));
        log('---');
        break;
      }
    }

    // Show lines 248860-248890 (from stack trace)
    if (lines.length > 248870) {
      log('Lines 248860-248890:');
      log(lines.slice(248858, 248890).join('\n').slice(0, 3000));
    }
  } else {
    log('pnpm.mjs not found. Candidates tried: ' + candidates.join(', '));
    if (realBin) {
      const distDir = path.join(path.dirname(realBin), '..', 'dist');
      if (fs.existsSync(distDir)) log('dist dir: ' + fs.readdirSync(distDir).slice(0, 10).join(', '));
    }
  }
} catch (e) { log('source inspection error: ' + e.message); }

// 3. Show current config
try {
  const wsYaml = path.join(__dirname, '..', '..', 'pnpm-workspace.yaml');
  const ws = fs.readFileSync(wsYaml, 'utf8');
  const match = ws.match(/onlyBuiltDependencies[\s\S]*?(?=\n[a-z])/);
  log('pnpm-workspace.yaml onlyBuiltDependencies: ' + (match ? match[0] : 'NOT FOUND'));
} catch(e) {}

// 4. Try pnpm approve-builds non-interactively (select-all 'a' + Enter)
log('============================================================');
log('Trying pnpm approve-builds with select-all input...');
const approveResult = spawnSync('pnpm', ['approve-builds'], {
  input: 'a\n',
  encoding: 'utf8',
  stdio: ['pipe', 'pipe', 'pipe'],
  timeout: 30000,
});
log('approve-builds exit: ' + approveResult.status);
log('approve-builds stdout: ' + (approveResult.stdout || '').slice(0, 500));
log('approve-builds stderr: ' + (approveResult.stderr || '').slice(0, 500));

// 5. Run pnpm install
log('============================================================');
log('Running: pnpm install --no-frozen-lockfile');
const install = spawnSync('pnpm', ['install', '--no-frozen-lockfile'], {
  stdio: 'inherit',
  timeout: 600000,
});
log('install exit: ' + install.status);
process.exit(install.status || 0);
