const test=require('node:test');
const assert=require('node:assert/strict');
const {DatabaseSync}=require('node:sqlite');
const fs=require('node:fs');
const {sharedCatalog}=require('../worker/catalog.ts');

// Real SQL exercises the atomic lease under many simultaneous visitor requests.
function database() {
    const sqlite=new DatabaseSync(':memory:');
    sqlite.exec(fs.readFileSync(require('node:path').join(__dirname,'../drizzle/0000_hot_cammi.sql'),'utf8'));
    return {sqlite,prepare(sql) {
        let values=[];
        const query={bind(...args){values=args;return query;},async first(){return sqlite.prepare(sql).get(...values)||null;},async run(){const r=sqlite.prepare(sql).run(...values);return {meta:{changes:Number(r.changes)}};}};
        return query;
    }};
}
test('fifty hosted visitors share one durable GitHub refresh and zero browser API pollers',async()=>{
    const db=database(),jobs=[],original=global.fetch;
    let requests=0;
    global.fetch=async url=>{
        requests++;
        const data=url.includes('/users/')?[{id:1,name:'New-tool',full_name:'norbertbaricz/New-tool',owner:{login:'norbertbaricz'},html_url:'https://github.com/norbertbaricz/New-tool',language:'Rust',description:'A command line tool'}]:null;
        return {ok:!!data,status:data?200:404,headers:new Headers(),json:async()=>data};
    };
    try {
        const snapshots=await Promise.all(Array.from({length:50},()=>sharedCatalog({DB:db},{waitUntil:p=>jobs.push(p)})));
        await Promise.all(jobs);
        assert.equal(jobs.length,1);
        assert.equal(requests,3); // One catalog, one release, one logo lookup for all 50 visitors.
        const next=await sharedCatalog({DB:db},{waitUntil:p=>jobs.push(p)});
        assert.equal(next.projects.length,1);
        assert.equal(next.projects[0].name,'New-tool');
        assert.equal(next.sync.budget.used,3);
        assert.equal(jobs.length,1);
        assert.ok(snapshots.every(s=>s.projects.length>0));
        const browser=fs.readFileSync(require('node:path').join(__dirname,'../public/js/script.js'),'utf8');
        assert.ok(!browser.includes('api.github.com'));
        assert.ok(!JSON.stringify(next).includes('Norbert Baricz'));
    } finally {global.fetch=original;db.sqlite.close();}
});
test('hosted storage failures retain the fallback catalog without calling GitHub',async()=>{
    let requests=0;const original=global.fetch;
    global.fetch=async()=>{requests++;throw new Error('Unexpected request');};
    try {
        const result=await sharedCatalog({DB:{prepare(){throw new Error('Offline');}}},{waitUntil(){throw new Error('Unexpected background job');}});
        assert.equal(result.projects.length,5);
        assert.equal(requests,0);
        assert.equal(result.sync.error,'CACHE_UNAVAILABLE');
        assert.equal(result.sync.state,'degraded');
        assert.equal(result.sync.persistentCache,false);
    } finally {global.fetch=original;}
});
