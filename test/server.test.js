const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

// Isolated cache and no SMTP credentials: these tests cannot send messages.
const ORIGINAL_FETCH = global.fetch;
const ENV_KEYS = ['SMTP_HOST','SMTP_USER','SMTP_PASS','GITHUB_CACHE_FILE'];
const ORIGINAL_ENV = Object.fromEntries(ENV_KEYS.map(key => [key, process.env[key]]));
function request(server, route, body, headers = {}) {
    return new Promise((resolve, reject) => {
        const req = http.request({ port: server.address().port, host: '127.0.0.1', path: route, method: body ? 'POST' : 'GET', headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers } }, res => {
            let text = ''; res.setEncoding('utf8'); res.on('data', chunk => { text += chunk; });
            res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, text }));
        });
        req.on('error', reject); req.end(body ? JSON.stringify(body) : undefined);
    });
}

test('pages retain the original logo and intro; project APIs filter, paginate, and return release details', async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'skypixel-http-test-'));
    ['SMTP_HOST','SMTP_USER','SMTP_PASS'].forEach(key => { delete process.env[key]; });
    process.env.GITHUB_CACHE_FILE = path.join(directory, 'catalog.json');
    global.fetch = async () => { throw new Error('Simulated unavailable GitHub'); };
    const app = require('../app.js').default;
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    try {
        for (const route of ['/', '/projects', '/updates', '/about']) {
            const result = await request(server, route);
            assert.equal(result.status, 200);
            assert.ok(result.text.includes('loading-text-animation'));
            assert.ok(!result.text.includes('data-skip-intro'));
            assert.ok(!result.text.includes('data-replay-intro'));
            assert.ok(result.text.includes('/images/logo-256.webp'));
            assert.ok(result.text.includes('MaxUltimat3'));
            assert.ok(!/Norbert Baricz/i.test(result.text));
            if (route === '/') assert.ok(!result.text.includes('data-project-card='));
            assert.ok(!result.text.includes('/images/mark.svg'));
            assert.ok(result.headers['content-security-policy']);
            assert.ok(!result.text.includes('href="/guide"'));
            assert.ok(!result.text.includes('Start here'));
            if (route === '/about') assert.ok(result.text.includes('The thinking behind the work.'));
        }
        const catalog = JSON.parse((await request(server, '/api/projects')).text);
        assert.equal(catalog.projects.length, 5);
        const windows = JSON.parse((await request(server, '/api/projects?category=Windows&q=booster')).text);
        assert.deepEqual(windows.projects.map(project => project.name), ['BoosterX']);
        const page = JSON.parse((await request(server, '/api/projects?sort=name&limit=2&page=2')).text);
        assert.equal(page.projects.length, 2); assert.equal(page.total, 5); assert.equal(page.totalPages, 3);
        const detail = JSON.parse((await request(server, '/api/projects/dakotaac')).text);
        assert.equal(detail.project.release.tag, 'v0.17');
        const feed = JSON.parse((await request(server, '/api/releases?project=Puro')).text);
        assert.equal(feed.releases.length, 1); assert.equal(feed.releases[0].tag, 'v1.2.16');
        const status = await request(server, '/api/status');
        assert.equal(JSON.parse(status.text).ok, true);
        assert.ok(!status.text.includes(directory));
        const missing = await request(server, '/api/projects/unknown');
        assert.equal(missing.status, 404); assert.equal(JSON.parse(missing.text).ok, false);
        assert.equal((await request(server, '/not-a-page')).status, 404);
        assert.equal((await request(server, '/guide')).status, 404);
        const first = await request(server, '/api/releases?project=Puro');
        const cached = await request(server, '/api/releases?project=Puro', null, { 'If-None-Match': first.headers.etag });
        assert.equal(cached.status, 304);
        assert.equal((await request(server, '/contact', { name: 'Example', email: 'invalid', message: 'Hello' })).status, 400);
        assert.equal((await request(server, '/contact', { name: 'Example', email: 'example@example.com', message: 'Hello' })).status, 503);
    } finally {
        await new Promise(resolve => server.close(resolve)); global.fetch = ORIGINAL_FETCH;
        ENV_KEYS.forEach(key => { if (ORIGINAL_ENV[key] === undefined) delete process.env[key]; else process.env[key] = ORIGINAL_ENV[key]; });
        await fs.rm(directory, { recursive: true, force: true });
    }
});
