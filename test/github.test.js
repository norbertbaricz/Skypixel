const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createGitHubService } = require('../lib/github');

// No live network calls. Each service has its own cache and request state.
const OWNER = 'norbertbaricz';
function repos(count = 2) { return Array.from({ length: count }, (_, index) => ({ id: index, name: `Project-${index}`, full_name: `${OWNER}/Project-${index}`, owner: { login: OWNER }, html_url: `https://github.com/${OWNER}/Project-${index}`, private: false, updated_at: '2020-01-01T00:00:00Z' })); }
function response(data, options = {}) { return { ok: true, status: 200, headers: { get: key => options.headers?.[key] ?? null }, json: async () => data, ...options }; }
function dataFor(url, projects) {
    const target = new URL(url);
    if (target.pathname.endsWith('/repos')) { const page = Number(target.searchParams.get('page')); return projects.slice((page - 1) * 100, page * 100); }
    if (target.pathname.endsWith('/contributors')) return [{ login: OWNER, type: 'User' }];
    return { tag_name: 'v1', html_url: `https://github.com/${OWNER}/Project-0/releases/tag/v1`, published_at: '2026-01-01T00:00:00Z' };
}

test('pagination includes 101 repositories, deduplicates refresh jobs, and bounds request concurrency', async () => {
    const projects = repos(101), requested = [];
    let active = 0, maximum = 0;
    const service = createGitHubService({ cacheFile: false, concurrency: 3, fetch: async url => {
        requested.push(url); active++; maximum = Math.max(maximum, active);
        await new Promise(resolve => setImmediate(resolve)); active--;
        return response(dataFor(url, projects));
    } });
    const first = service.refreshProjects(true), second = service.refreshProjects(true);
    assert.strictEqual(first, second);
    const synced = await first;
    assert.equal(synced.projects.length, 101);
    assert.ok(synced.projects.every(project => !project.archived));
    assert.ok(requested.some(url => url.includes('page=2')));
    assert.ok(maximum <= 3);
    assert.equal(service.getStatus().syncing, false);
});

test('a successful catalog survives restart and a later GitHub outage', async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'skypixel-cache-test-'));
    const cacheFile = path.join(directory, 'catalog.json');
    try {
        const initial = createGitHubService({ cacheFile, fetch: async url => response(dataFor(url, repos())) });
        const synced = await initial.refreshProjects(true);
        assert.equal(synced.projects.length, 2);
        const restored = createGitHubService({ cacheFile, fetch: async () => { throw new Error('Unavailable'); } });
        await restored.ready;
        assert.equal(restored.getSnapshot().source, 'disk-cache');
        const cached = await restored.refreshProjects(true);
        assert.equal(cached.projects.length, 2);
        assert.equal(cached.syncedAt, synced.syncedAt);
        assert.equal(cached.source, 'cached');
        assert.equal(restored.getStatus().error, 'GITHUB_UNAVAILABLE');
        assert.deepEqual(await fs.readdir(directory), ['catalog.json']);
    } finally { await fs.rm(directory, { recursive: true, force: true }); }
});

test('conditional GitHub requests reuse cached bodies on 304', async () => {
    let conditionalRequests = 0;
    const service = createGitHubService({ cacheFile: false, fetch: async (url, options) => {
        if (options.headers['If-None-Match']) {
            conditionalRequests++;
            return response(null, { ok: false, status: 304, json: async () => { throw new Error('304 has no JSON body'); } });
        }
        return response(dataFor(url, repos()), { headers: { get: name => name === 'etag' ? '"v1"' : null } });
    } });
    await service.refreshProjects(true);
    const second = await service.refreshProjects(true);
    assert.equal(second.projects.length, 2);
    assert.equal(second.source, 'github');
    assert.equal(conditionalRequests, 1);
});

test('GitHub rate limits impose a cooldown while keeping the saved catalog', async () => {
    let calls = 0;
    const service = createGitHubService({ cacheFile: false, fetch: async () => {
        calls++;
        return response(null, { ok: false, status: 429, headers: { get: name => ({ 'retry-after': '60', 'x-ratelimit-remaining': '0' }[name] ?? null) } });
    } });
    const first = await service.refreshProjects(true);
    await service.refreshProjects(true);
    assert.equal(calls, 1);
    assert.equal(first.projects.length, 5);
    assert.equal(service.getStatus().error, 'GITHUB_RATE_LIMIT');
    assert.ok(Date.parse(service.getStatus().nextRefreshAt) > Date.now() + 50000);
});

test('a warm refresh spends only repository discovery; missing releases are negatively cached', async () => {
    let time=Date.now(), calls=0, detailCalls=0;
    let projects=repos(2);
    const service=createGitHubService({cacheFile:false,now:()=>time,fetch:async url=>{
        calls++;
        if(url.includes('/releases/')) {detailCalls++;return response(null,{ok:false,status:404});}
        return response(dataFor(url,projects));
    }});
    await service.refreshProjects();
    assert.equal(calls,5); // Discovery, two releases, and two cached logo lookups.
    time+=600001; projects=[...projects,...repos(3).slice(2)];
    const next=await service.refreshProjects();
    assert.equal(next.projects.length,3);
    assert.equal(calls,8); // One discovery + the new project's release and logo.
    assert.equal(detailCalls,3);
    time+=600001; await service.refreshProjects();
    assert.equal(calls,9);
    assert.equal(detailCalls,3);
});

test('the hourly budget survives restart and pauses before another fetch', async () => {
    let state=null,calls=0,time=Date.now();
    const storage={strict:true,source:'shared-cache',read:async()=>state,write:async value=>{state=JSON.parse(JSON.stringify(value));}};
    const options={cacheFile:false,storage,hourlyBudget:3,now:()=>time,fetch:async url=>{
        calls++;
        assert.equal(state.budget.attempts.at(-1),time,'reserve is durable before network work');
        assert.ok(state.budget.attempts.length<=3);
        return response(dataFor(url,repos(10)));
    }};
    const first=createGitHubService(options);
    await first.refreshProjects(true);
    assert.equal(calls,3);
    assert.equal(first.getSnapshot().projects.length,10,'all repositories appear even if detail enrichment pauses');
    const restarted=createGitHubService(options);
    await restarted.ready;
    await restarted.refreshProjects(true);
    assert.equal(calls,3);
    assert.equal(restarted.getStatus().budget.used,3);
    assert.equal(restarted.getStatus().error,'GITHUB_BUDGET_PAUSED');
    time+=3601001;
    await restarted.refreshProjects();
    assert.ok(calls>3,'synchronization resumes after the budget window');
});

test('low upstream quota stops enrichment while keeping newly discovered repositories', async () => {
    let calls=0;
    const reset=Math.floor(Date.now()/1000)+3600;
    const service=createGitHubService({cacheFile:false,fetch:async url=>{
        calls++; return response(dataFor(url,repos(3)),{headers:{get:name=>({'x-ratelimit-remaining':'5','x-ratelimit-reset':String(reset)}[name]??null)}});
    }});
    await service.refreshProjects(true);await service.refreshProjects(true);
    assert.equal(calls,1);
    assert.equal(service.getSnapshot().projects.length,3);
    assert.equal(service.getStatus().error,'GITHUB_BUDGET_PAUSED');
});

test('an unwritable shared budget fails closed without sending GitHub requests',async()=>{
    let calls=0;
    const service=createGitHubService({cacheFile:false,storage:{strict:true,read:async()=>null,write:async()=>{throw new Error('D1 unavailable');}},fetch:async()=>{calls++;return response([]);}});
    await service.refreshProjects();
    assert.equal(calls,0);
    assert.equal(service.getStatus().error,'CACHE_UNAVAILABLE');
    assert.equal(service.getSnapshot().projects.length,5);
});

test('an unreadable shared quota does not get reset or overwritten',async()=>{
    let calls=0,writes=0;
    const service=createGitHubService({cacheFile:false,storage:{strict:true,read:async()=>{throw new Error('Unavailable');},write:async()=>{writes++;}},fetch:async()=>{calls++;return response([]);}});
    await service.refreshProjects();
    assert.equal(calls,0);
    assert.equal(writes,0);
    assert.equal(service.getStatus().error,'CACHE_UNAVAILABLE');
});

test('a slow sync commits repository discovery and defers enrichment before starting more requests',async()=>{
    let calls=0,time=Date.now();
    const service=createGitHubService({cacheFile:false,now:()=>time,fetch:async url=>{calls++;time+=21000;return response(dataFor(url,repos(3)));}});
    await service.refreshProjects();
    assert.equal(calls,1);
    assert.equal(service.getSnapshot().projects.length,3);
    assert.equal(service.getStatus().error,'GITHUB_SYNC_DEFERRED');
});

test('restored catalogs use current editorial text without fetching or changing GitHub metadata',async()=>{
    let state=null,calls=0;
    const C=require('../public/js/catalog');
    const storage={strict:true,read:async()=>state,write:async value=>{state=JSON.parse(JSON.stringify(value));}};
    const project={...repos(1)[0],name:'Skypixel',full_name:'norbertbaricz/Skypixel',stargazers_count:17};
    const initial=createGitHubService({cacheFile:false,storage,fetch:async url=>{calls++;return response(dataFor(url,[project]));}});
    await initial.refreshProjects();
    state.snapshot.projects[0].gettingStarted='Outdated installation instructions';
    const before=calls;
    const restored=createGitHubService({cacheFile:false,storage,fetch:async()=>{calls++;throw new Error('No request expected');}});
    await restored.ready;
    const result=restored.getSnapshot().projects[0];
    assert.equal(calls,before);
    assert.equal(result.gettingStarted,C.DETAILS.Skypixel.gettingStarted);
    assert.equal(result.stars,17);
    assert.equal(result.release.tag,'v1');
    assert.equal(restored.getStatus().budget.used,2);
});
