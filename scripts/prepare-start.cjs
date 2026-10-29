'use strict';

// Easy-to-tune startup settings. Keep these aligned with package.json engines.
const STARTUP_CONFIG = Object.freeze({
    minimumNodeVersion: [22, 13, 0],
    minimumNpmMajor: 9,
    installFlags: ['--omit=dev', '--no-audit', '--no-fund'],
    markerFile: '.cache/launcher-runtime.json',
    environmentFile: '.env',
    environmentExample: '.env.example'
});

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const childProcess = require('child_process');
const PROJECT_DIRECTORY = path.resolve(__dirname, '..');
const PACKAGE_FILE = path.join(PROJECT_DIRECTORY, 'package.json');
const LOCK_FILE = path.join(PROJECT_DIRECTORY, 'package-lock.json');
const MARKER_FILE = path.join(PROJECT_DIRECTORY, STARTUP_CONFIG.markerFile);
const IS_WINDOWS = process.platform === 'win32';
const CHECK_ONLY = process.argv.includes('--check');

function log(message) { console.log('[Skypixel] ' + message); }
function versionAtLeast(actual, minimum) {
    const parts = actual.split('.').map(Number);
    for (let index = 0; index < minimum.length; index++) {
        if ((parts[index] || 0) !== minimum[index]) return (parts[index] || 0) > minimum[index];
    }
    return true;
}
function runNpm(args, inheritOutput) {
    // Windows npm is a CMD shim. All arguments below are fixed internal flags.
    const command = IS_WINDOWS ? (process.env.ComSpec || 'cmd.exe') : 'npm';
    const commandArgs = IS_WINDOWS ? ['/d', '/s', '/c', 'npm ' + args.join(' ')] : args;
    return childProcess.spawnSync(command, commandArgs, {
        cwd: PROJECT_DIRECTORY,
        stdio: inheritOutput ? 'inherit' : ['ignore', 'pipe', 'pipe'],
        encoding: 'utf8',
        windowsHide: true
    });
}
function signature() {
    const hash = crypto.createHash('sha256');
    hash.update(fs.readFileSync(PACKAGE_FILE));
    hash.update('\0');
    if (fs.existsSync(LOCK_FILE)) hash.update(fs.readFileSync(LOCK_FILE));
    hash.update(JSON.stringify({ nodeAbi: process.versions.modules, platform: process.platform, architecture: process.arch, flags: STARTUP_CONFIG.installFlags }));
    return hash.digest('hex');
}
function readMarker() {
    try { return JSON.parse(fs.readFileSync(MARKER_FILE, 'utf8')); }
    catch { return null; }
}
function saveMarker() {
    try {
        fs.mkdirSync(path.dirname(MARKER_FILE), { recursive: true });
        fs.writeFileSync(MARKER_FILE, JSON.stringify({ signature: signature(), preparedAt: new Date().toISOString() }) + '\n', { mode: 0o600 });
    } catch {
        log('The dependency marker could not be saved. Dependencies will be checked again on the next start.');
    }
}
function runtimeDependenciesPresent(manifest) {
    const resolveFromProject = require('module').createRequire(PACKAGE_FILE);
    return Object.keys(manifest.dependencies || {}).every(function (name) {
        try { resolveFromProject.resolve(name); return true; }
        catch { return false; }
    });
}
function prepareEnvironment() {
    const environment = path.join(PROJECT_DIRECTORY, STARTUP_CONFIG.environmentFile);
    const example = path.join(PROJECT_DIRECTORY, STARTUP_CONFIG.environmentExample);
    if (fs.existsSync(environment) || !fs.existsSync(example)) return;
    try {
        fs.copyFileSync(example, environment, fs.constants.COPYFILE_EXCL);
        if (!IS_WINDOWS) fs.chmodSync(environment, 0o600);
        log('Created .env from .env.example. Existing configuration is never overwritten.');
    } catch (error) {
        if (error.code !== 'EEXIST') throw new Error('Could not create .env. Check the project directory permissions.');
    }
}
function main() {
    if (!versionAtLeast(process.versions.node, STARTUP_CONFIG.minimumNodeVersion)) {
        throw new Error('Node.js ' + STARTUP_CONFIG.minimumNodeVersion.join('.') + ' or newer is required. Current version: ' + process.versions.node + '.');
    }
    if (!fs.existsSync(PACKAGE_FILE) || !fs.existsSync(path.join(PROJECT_DIRECTORY, 'app.js'))) {
        throw new Error('Project files are missing. Extract the complete archive before starting the server.');
    }
    const manifest = JSON.parse(fs.readFileSync(PACKAGE_FILE, 'utf8'));
    const npm = runNpm(['--version'], false);
    if (npm.error || npm.status !== 0) throw new Error('npm is unavailable. Install npm ' + STARTUP_CONFIG.minimumNpmMajor + ' or newer and make sure it is in PATH.');
    const npmVersion = String(npm.stdout).trim();
    if (!/^\d+\./.test(npmVersion) || Number(npmVersion.split('.')[0]) < STARTUP_CONFIG.minimumNpmMajor) {
        throw new Error('npm ' + STARTUP_CONFIG.minimumNpmMajor + ' or newer is required. Current version: ' + npmVersion + '.');
    }
    log('Node.js ' + process.versions.node + ' / npm ' + npmVersion + '.');
    if (CHECK_ONLY) {
        log('Prerequisites are ready. No files were changed and no server was started.');
        return;
    }

    const marker = readMarker();
    const dependenciesPresent = runtimeDependenciesPresent(manifest);
    let dependenciesReady = dependenciesPresent && marker && marker.signature === signature();
    if (dependenciesPresent && !marker) {
        // Adopt a valid existing npm installation instead of reinstalling it.
        const verification = runNpm(['ls', '--omit=dev', '--depth=0', '--json'], false);
        dependenciesReady = !verification.error && verification.status === 0;
    }
    if (!dependenciesReady) {
        const action = fs.existsSync(LOCK_FILE) ? 'ci' : 'install';
        log('Installing runtime dependencies with npm ' + action + '. This may take a moment on the first start.');
        const installation = runNpm([action].concat(STARTUP_CONFIG.installFlags), true);
        if (installation.error || installation.status !== 0) throw new Error('Dependency installation failed. Check the npm output above and try again.');
        if (!runtimeDependenciesPresent(manifest)) throw new Error('Runtime dependencies are still missing after installation.');
    } else {
        log('Runtime dependencies are ready; no installation is needed.');
    }
    saveMarker();
    prepareEnvironment();
    log('Setup complete. Application settings are loaded from .env.');
}

try { main(); }
catch (error) {
    console.error('[Skypixel] ' + error.message);
    process.exitCode = 1;
}
