const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');
const C = require('../public/js/catalog');
const { viewData } = require('../lib/render');
const source = require('../repository-snapshot.json');

// Regression targets: the first document paint and the installed app launch.
const ROOT = path.resolve(__dirname, '..');
const DARK_BACKGROUND = '#090909';
const snapshot = { projects: C.buildCatalog(source.repositories, source.releases), syncedAt: source.fetchedAt, source: 'snapshot' };

test('every page paints a dark canvas before external CSS or JavaScript, including errors', async () => {
    for (const page of ['index', 'projects', 'updates', 'about', 'error']) {
        const html = await ejs.renderFile(path.join(ROOT, 'views', `${page}.ejs`), { ...viewData(page, snapshot), code: '404', errorTitle: 'Page not found', errorMessage: 'Try another page.' });
        const critical = html.match(/<style id="critical-theme">([\s\S]*?)<\/style>/);
        assert.ok(critical, page);
        assert.ok(critical[1].includes(`--bg: ${DARK_BACKGROUND}`));
        assert.match(critical[1], /html,body[^}]+background-color: var\(--bg\)/);
        assert.match(critical[1], /color-scheme: dark/);
        assert.ok(html.indexOf(critical[0]) < html.indexOf('rel="stylesheet"'));
        assert.ok(html.indexOf(critical[0]) < html.indexOf('<script'));
        assert.match(html, /rel="manifest"[^>]+crossorigin="use-credentials"/);
        assert.match(html, /apple-mobile-web-app-status-bar-style" content="black-translucent"/);
    }
});
test('PWA launch colors match the document canvas and the original local icons exist', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/manifest.webmanifest'), 'utf8'));
    assert.equal(manifest.background_color, DARK_BACKGROUND);
    assert.equal(manifest.theme_color, DARK_BACKGROUND);
    assert.equal(manifest.display, 'standalone');
    assert.equal(manifest.start_url, '/');
    assert.equal(manifest.scope, '/');
    assert.equal(manifest.lang, 'en');
    assert.ok(manifest.icons.some(icon => icon.sizes === '192x192'));
    assert.ok(manifest.icons.some(icon => icon.sizes === '512x512'));
    for (const icon of manifest.icons) assert.ok(fs.statSync(path.join(ROOT, 'public', icon.src)).size > 0);
});
