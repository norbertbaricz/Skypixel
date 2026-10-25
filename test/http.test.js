const test=require('node:test');
const assert=require('node:assert/strict');
const {jsonResponse}=require('../worker/http.ts');

test('hosted JSON transport validates cached catalogs while status stays fresh and HEAD is empty',async()=>{
    const data={ok:true,catalog:{state:'ready'}};
    const first=await jsonResponse(new Request('https://example.test/api/projects'),data);
    const etag=first.headers.get('etag');
    const cached=await jsonResponse(new Request('https://example.test/api/projects',{headers:{'If-None-Match':etag}}),data);
    assert.equal(cached.status,304);
    assert.equal(await cached.text(),'');
    const status=await jsonResponse(new Request('https://example.test/api/status',{headers:{'If-None-Match':etag}}),data,200,0);
    assert.equal(status.status,200);
    assert.equal(status.headers.get('cache-control'),'no-store');
    assert.deepEqual(await status.json(),data);
    const head=await jsonResponse(new Request('https://example.test/api/projects',{method:'HEAD'}),data);
    assert.equal(head.status,200);
    assert.equal(await head.text(),'');
    assert.ok(head.headers.get('content-security-policy').includes("connect-src 'self'"));
});
