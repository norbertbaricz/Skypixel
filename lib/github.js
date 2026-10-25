const fs = require('node:fs/promises');
const path = require('node:path');
const catalog = require('../public/js/catalog');
const fallback = require('../repository-snapshot.json');
const { createCatalogService, SYNC_DEFAULTS } = require('./sync-core.mjs');

// Node adapter. Hosted synchronization uses the same engine with D1 storage.
const SYNC_CONFIG = Object.freeze({
    ...SYNC_DEFAULTS,
    username: process.env.GITHUB_USERNAME || catalog.CONFIG.githubUsername,
    cacheTtlMs: Math.max(60000, Number(process.env.PROJECTS_REFRESH_MS) || SYNC_DEFAULTS.cacheTtlMs),
    timeoutMs: Math.max(500, Number(process.env.GITHUB_TIMEOUT_MS) || SYNC_DEFAULTS.timeoutMs),
    hourlyBudget: Math.max(1, Math.min(40, Number(process.env.GITHUB_HOURLY_BUDGET) || SYNC_DEFAULTS.hourlyBudget)),
    retryDelayMs: Math.max(60000, Number(process.env.GITHUB_RETRY_MS) || SYNC_DEFAULTS.retryDelayMs),
    cacheFile: process.env.GITHUB_CACHE_FILE || path.join(__dirname, '../.cache/github-catalog.json')
});
function diskStorage(file) {
    return {
        async read() {
            try {
                if ((await fs.stat(file)).size > SYNC_DEFAULTS.maxDiskBytes) return null;
                return JSON.parse(await fs.readFile(file, 'utf8'));
            } catch (error) { if (error.code !== 'ENOENT') console.warn('GitHub cache unreadable; using the bundled catalog.'); return null; }
        },
        async write(value) {
            const temporary = `${file}.${process.pid}.tmp`;
            await fs.mkdir(path.dirname(file), { recursive: true });
            try {
                await fs.writeFile(temporary, JSON.stringify(value), { mode: 0o600 });
                await fs.rename(temporary, file);
            } finally { await fs.unlink(temporary).catch(() => {}); }
        }, source: 'disk-cache'
    };
}
function createGitHubService(options = {}) {
    const config = { ...SYNC_CONFIG, ...options };
    return createCatalogService({ catalog, fallback, config, token: process.env.GITHUB_TOKEN || '', storage: config.cacheFile ? diskStorage(config.cacheFile) : null, ...options });
}
module.exports = { ...createGitHubService(), createGitHubService, SYNC_CONFIG };
