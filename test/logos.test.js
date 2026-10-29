const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../public/js/catalog');
const { createGitHubService } = require('../lib/github');

const OWNER = 'norbertbaricz';
const makeRepo = name => ({ id: name, name, full_name: `${OWNER}/${name}`, owner: { login: OWNER }, html_url: `https://github.com/${OWNER}/${name}`, default_branch: 'main', private: false });
const image = (path, size = 4000) => ({ path, size, type: 'blob', mode: '100644', sha: 'a'.repeat(40) });
const response = (data, status = 200) => ({ ok: status === 200, status, headers: new Headers(), json: async () => data });

test('logo discovery finds nested, project-specific assets and ignores screenshots and oversized files', () => {
    const logo = C.chooseRepositoryLogo(makeRepo('FutureTool'), { tree: [image('docs/screenshot.png'), image('node_modules/library/logo.svg'), image('setup/icon.png', 800000), image('public/assets/FutureTool-icon-192.png'), image('public/favicon.ico')] });
    assert.equal(logo, `https://raw.githubusercontent.com/${OWNER}/FutureTool/main/public/assets/FutureTool-icon-192.png?v=${'a'.repeat(40)}`);
    assert.equal(C.chooseRepositoryLogo(makeRepo('FutureTool'), { tree: [image('screenshots/logo.png'), image('../logo.png'), { ...image('logo.png'), mode: '120000' }] }), null);
    assert.equal(C.chooseRepositoryLogo(makeRepo('FutureTool'), { truncated: true, tree: [] }), null);
});
test('image URLs are restricted to the owning repository and every project has a distinct fallback', () => {
    const project = C.normalizeRepo(makeRepo('FutureTool'));
    for (const logo of ['javascript:alert(1)', 'https://example.com/logo.png', 'https://raw.githubusercontent.com/other/repo/main/logo.png', 'https://raw.githubusercontent.com:444/norbertbaricz/FutureTool/main/logo.png']) assert.equal(C.safeProjectLogo({ ...project, logo }), '');
    const markup = C.projectIdentity(project);
    assert.match(markup, /project-monogram/); assert.match(markup, />FU</);
    assert.doesNotMatch(markup, /<img/);
    assert.match(C.projectIdentity({ ...project, logo: `https://raw.githubusercontent.com/${OWNER}/FutureTool/main/logo.png` }), /referrerpolicy="no-referrer"/);
    assert.match(C.projectIdentity(C.normalizeRepo(makeRepo('ServerLauncher'))), /server-launcher\.png/);
});
test('new projects acquire logos automatically and positive and missing logos survive warm refreshes and restart', async () => {
    let now = Date.now(), state = null;
    const urls = [];
    const projects = [makeRepo('FutureTool'), makeRepo('NoArtwork')];
    const storage = { strict: true, read: async () => state, write: async value => { state = structuredClone(value); } };
    const fetch = async url => {
        urls.push(url);
        if (url.includes('/users/')) return response(projects);
        if (url.includes('/git/trees/')) return response({ tree: url.includes('/FutureTool/') ? [image('src/resources/logo.png')] : [] });
        return response(null, 404);
    };
    const options = { cacheFile: false, storage, now: () => now, fetch };
    const service = createGitHubService(options);
    await service.refreshProjects();
    assert.equal(urls.filter(url => url.includes('/git/trees/')).length, 2);
    assert.match(service.getSnapshot().projects.find(p => p.name === 'FutureTool').logo, /src\/resources\/logo\.png/);
    assert.equal(service.getSnapshot().projects.find(p => p.name === 'NoArtwork').logo, null);
    assert.ok(state.endpoints.every(([,entry]) => !entry.data?.tree), 'full source trees are not persisted');
    now += 600001;
    const restarted = createGitHubService(options); await restarted.ready; await restarted.refreshProjects();
    assert.equal(urls.filter(url => url.includes('/git/trees/')).length, 2, 'positive and negative lookups use the shared cache');
    assert.match(restarted.getSnapshot().projects[0].logo, /logo\.png/);
    assert.equal(restarted.getStatus().budget.used, 6);
});
test('logo enrichment obeys the same durable hourly budget and concurrency limit as catalog discovery', async () => {
    let state = null, active = 0, maximum = 0;
    const urls = [];
    const storage = { strict: true, read: async () => state, write: async value => { state = structuredClone(value); } };
    const service = createGitHubService({ cacheFile: false, storage, hourlyBudget: 4, maxDetailsPerSync: 0, fetch: async url => {
        urls.push(url); active++; maximum = Math.max(maximum, active);
        assert.equal(state.budget.attempts.length, urls.length);
        await new Promise(resolve => setImmediate(resolve)); active--;
        return url.includes('/users/') ? response([makeRepo('One'), makeRepo('Two'), makeRepo('Three')]) : response({ tree: [image('assets/icon.png')] });
    } });
    await service.refreshProjects(true);
    assert.equal(urls.length, 3, 'two logo lookups per refresh at most');
    await service.refreshProjects(true);
    assert.equal(urls.length, 4, 'quota stops the remaining logo lookup');
    assert.equal(maximum, 1); assert.equal(service.getSnapshot().projects.length, 3);
    assert.equal(service.getStatus().error, 'GITHUB_BUDGET_PAUSED');
});
