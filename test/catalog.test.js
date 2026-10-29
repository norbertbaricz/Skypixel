const test = require('node:test');
const assert = require('node:assert/strict');
const { buildCatalog, safeUrl, escapeHtml } = require('../public/js/catalog');
const snapshot = require('../repository-snapshot.json');
const { viewData } = require('../lib/render');

// Regressions: every repository stays visible and status never depends on age.
const USERNAME = 'norbertbaricz';
const makeRepo = (changes = {}) => ({ id: 1, name: 'Fresh-idea', full_name: `${USERNAME}/Fresh-idea`, owner: { login: USERNAME }, html_url: `https://github.com/${USERNAME}/Fresh-idea`, updated_at: '2020-01-01T00:00:00Z', private: false, ...changes });

test('every public repository is included, including old projects and forks', () => {
    const repos = [makeRepo(), makeRepo({ id: 2, name: 'Forked', fork: true }), makeRepo({ id: 3, name: 'Private', private: true }), makeRepo({ id: 4, owner: { login: 'other' } })];
    const projects = buildCatalog(repos);
    assert.equal(projects.length, 2);
    assert.equal(projects[0].archived, false);
    assert.equal(projects[1].fork, true);
});
test('all five verified projects retain descriptions and their release destinations', () => {
    const projects = buildCatalog(snapshot.repositories, snapshot.releases);
    assert.equal(projects.length, 5);
    assert.equal(projects.find(p => p.name === 'BoosterX').category, 'Windows');
    assert.equal(projects.find(p => p.name === 'DakotaAC').release.tag, 'v0.17');
    assert.equal(projects.find(p => p.name === 'Puro').release.tag, 'v1.2.16');
    assert.ok(projects.every(p => p.overview && p.gettingStarted && p.htmlUrl));
});
test('untrusted text and unsafe URL schemes are handled safely', () => {
    assert.equal(safeUrl('javascript:alert(1)'), '');
    assert.equal(safeUrl('data:text/html,x'), '');
    assert.equal(escapeHtml('<script>"&'), '&lt;script&gt;&quot;&amp;');
});
test('JSON embedded in a page cannot terminate its script element', () => {
    const data = viewData('index', { projects: buildCatalog([makeRepo({ description: '</script><img src=x onerror=alert(1)>' })]), source: 'snapshot' });
    assert.ok(!data.bootstrap.includes('</script>'));
    assert.doesNotThrow(() => JSON.parse(data.bootstrap));
});

test('new public repositories classify and appear without any curated entry', () => {
    const repo = { id:999, name:'My-new-discord-helper', full_name:'norbertbaricz/My-new-discord-helper', owner:{login:'norbertbaricz'}, private:false, language:'Python', description:'Moderation utilities for a Discord community', html_url:'https://github.com/norbertbaricz/My-new-discord-helper', topics:['discord','moderation'] };
    const C=require('../public/js/catalog');
    assert.equal(C.DETAILS[repo.name],undefined);
    const projects=C.buildCatalog([repo,{...repo,id:1000,name:'Private',private:true}]);
    assert.equal(projects.length,1);
    assert.equal(projects[0].category,'Discord');
    assert.equal(projects[0].icon,'bot');
    assert.equal(projects[0].summary,repo.description);
    assert.equal(C.filterProjects(projects,{q:'moderation',category:'Discord'}).length,1);
});

test('release notes format headings, lists, links, and code while keeping HTML and unsafe links inert', () => {
    const { renderReleaseNotes } = require('../public/js/catalog');
    const html = renderReleaseNotes('# Version 2\n\n## Changes\n- **Faster** startup\n- Use `start.sh`\n\n[Docs](https://example.com/docs)\n\n<script>alert(1)</script>\n[Bad](javascript:alert(1))\n\n```html\n<img src=x onerror=alert(1)>\n```', 'Version 2');
    assert.match(html, /<h3>Changes<\/h3>/);
    assert.match(html, /<ul><li><strong>Faster<\/strong>/);
    assert.match(html, /<code>start.sh<\/code>/);
    assert.match(html, /href="https:\/\/example.com\/docs"/);
    assert.match(html, /&lt;script&gt;/);
    assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
    assert.doesNotMatch(html, /<script|<img|href="javascript:|<h3>Version 2/);
});
