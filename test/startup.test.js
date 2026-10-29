const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

// Isolated fixtures exercise installation and startup without contacting npm/GitHub.
const ROOT = path.resolve(__dirname, '..');
const POSIX_ONLY = process.platform === 'win32' ? 'POSIX launcher checks run on Linux/macOS.' : false;
function fixture() {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'skypixel startup '));
    const root = path.join(directory, 'project with spaces');
    const bin = path.join(directory, 'bin');
    fs.mkdirSync(path.join(root, 'scripts'), { recursive: true });
    fs.mkdirSync(bin);
    fs.copyFileSync(path.join(ROOT, 'start.sh'), path.join(root, 'start.sh'));
    fs.chmodSync(path.join(root, 'start.sh'), 0o755);
    fs.copyFileSync(path.join(ROOT, 'scripts/prepare-start.cjs'), path.join(root, 'scripts/prepare-start.cjs'));
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'launcher-fixture', version: '1.0.0', type: 'module', dependencies: { 'fixture-runtime': '1.0.0' } }));
    fs.writeFileSync(path.join(root, 'package-lock.json'), '{"lockfileVersion":3}\n');
    fs.writeFileSync(path.join(root, '.env.example'), 'PORT=3000\nNODE_ENV=development\n');
    fs.writeFileSync(path.join(root, 'app.js'), "import fs from 'node:fs'; fs.writeFileSync('booted.json',JSON.stringify(process.argv.slice(2)));\n");
    const npmScript = path.join(bin, 'npm.cjs');
    fs.writeFileSync(npmScript, `const fs=require('fs'),path=require('path');
const args=process.argv.slice(2);
fs.appendFileSync('npm-calls.jsonl',JSON.stringify(args)+'\\n');
if(args[0]==='--version'){console.log('11.0.0');process.exit(0);}
if(args[0]==='ls'){process.exit(fs.existsSync('node_modules/fixture-runtime/index.js')?0:1);}
if(process.env.SKYPIXEL_TEST_INSTALL_FAIL==='1'){process.exit(42);}
fs.mkdirSync('node_modules/fixture-runtime',{recursive:true});
fs.writeFileSync('node_modules/fixture-runtime/package.json',JSON.stringify({name:'fixture-runtime',version:'1.0.0',main:'index.js'}));
fs.writeFileSync('node_modules/fixture-runtime/index.js','module.exports = {};');
`);
    const quote = value => "'" + value.replace(/'/g, "'\\''") + "'";
    fs.writeFileSync(path.join(bin, 'npm'), '#!/bin/sh\nexec ' + quote(process.execPath) + ' ' + quote(npmScript) + ' "$@"\n', { mode: 0o755 });
    const env = { ...process.env, PATH: bin + path.delimiter + process.env.PATH, SKYPIXEL_NODE_BIN: process.execPath };
    return {
        root,
        run(args = [], changes = {}) { return spawnSync('sh', [path.join(root, 'start.sh'), ...args], { cwd: os.tmpdir(), env: { ...env, ...changes }, encoding: 'utf8', timeout: 20000 }); },
        installs() { return fs.readFileSync(path.join(root, 'npm-calls.jsonl'), 'utf8').trim().split('\n').map(line => JSON.parse(line)).filter(args => args[0] === 'ci' || args[0] === 'install'); },
        close() { fs.rmSync(directory, { recursive: true, force: true }); }
    };
}

test('launcher check is read-only and a missing Node executable fails clearly', { skip: POSIX_ONLY }, () => {
    const f = fixture();
    try {
        const checked = f.run(['--check']);
        assert.equal(checked.status, 0, checked.stderr);
        assert.equal(fs.existsSync(path.join(f.root, '.env')), false);
        assert.equal(fs.existsSync(path.join(f.root, 'node_modules')), false);
        assert.equal(fs.existsSync(path.join(f.root, 'booted.json')), false);
        assert.equal(f.installs().length, 0);
        const missing = f.run([], { SKYPIXEL_NODE_BIN: '/nonexistent/skypixel-node' });
        assert.equal(missing.status, 127);
        assert.match(missing.stderr, /Node.js 22\.13\.0/);
    } finally { f.close(); }
});

test('first launch installs locked runtime dependencies, creates private config, and preserves arguments', { skip: POSIX_ONLY }, () => {
    const f = fixture();
    try {
        const started = f.run(['--port', '4300', 'argument with spaces']);
        assert.equal(started.status, 0, started.stdout + started.stderr);
        assert.deepEqual(f.installs(), [['ci', '--omit=dev', '--no-audit', '--no-fund']]);
        assert.equal(fs.readFileSync(path.join(f.root, '.env'), 'utf8'), fs.readFileSync(path.join(f.root, '.env.example'), 'utf8'));
        assert.equal(fs.statSync(path.join(f.root, '.env')).mode & 0o777, 0o600);
        assert.deepEqual(JSON.parse(fs.readFileSync(path.join(f.root, 'booted.json'), 'utf8')), ['--port', '4300', 'argument with spaces']);
    } finally { f.close(); }
});

test('later starts preserve config and skip installation until package inputs or dependencies change', { skip: POSIX_ONLY }, () => {
    const f = fixture();
    try {
        assert.equal(f.run().status, 0);
        const configuration = 'PORT=4300\nCUSTOM_KEEP=unchanged\n';
        fs.writeFileSync(path.join(f.root, '.env'), configuration);
        assert.equal(f.run().status, 0);
        assert.equal(f.installs().length, 1);
        assert.equal(fs.readFileSync(path.join(f.root, '.env'), 'utf8'), configuration);
        fs.appendFileSync(path.join(f.root, 'package-lock.json'), '\n');
        assert.equal(f.run().status, 0);
        assert.equal(f.installs().length, 2);
        fs.rmSync(path.join(f.root, 'node_modules/fixture-runtime'), { recursive: true });
        assert.equal(f.run().status, 0);
        assert.equal(f.installs().length, 3);
        assert.equal(fs.readFileSync(path.join(f.root, '.env'), 'utf8'), configuration);
    } finally { f.close(); }
});

test('failed dependency installation stops startup before creating config or running the server', { skip: POSIX_ONLY }, () => {
    const f = fixture();
    try {
        const result = f.run([], { SKYPIXEL_TEST_INSTALL_FAIL: '1' });
        assert.equal(result.status, 1);
        assert.match(result.stderr, /Dependency installation failed/);
        assert.equal(fs.existsSync(path.join(f.root, 'booted.json')), false);
        assert.equal(fs.existsSync(path.join(f.root, '.env')), false);
    } finally { f.close(); }
});
