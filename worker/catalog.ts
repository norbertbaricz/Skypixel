import catalog from '../generated/catalog.mjs';
import fallback from '../repository-snapshot.json' with { type: 'json' };
import { createCatalogService, SYNC_DEFAULTS } from '../lib/sync-core.mjs';

// One durable refresh lease covers all isolates and visitors for the same owner.
const LEASE_MS = 90000;
const OWNER = catalog.CONFIG.githubUsername;
function createService(storage: unknown, env: Cloudflare.Env) {
  return createCatalogService({catalog,fallback,storage,token:env.GITHUB_TOKEN||'',config:{...SYNC_DEFAULTS,username:OWNER}});
}
async function unavailableCatalog(env: Cloudflare.Env) {
  const service=createService(null,env);
  await service.ready;
  return {...service.getSnapshot(),sync:{...service.getStatus(),state:'degraded',error:'CACHE_UNAVAILABLE',persistentCache:false}};
}
// Read-only visitors share one durable state row and one atomic refresh lease.
export async function sharedCatalog(env: Cloudflare.Env, ctx: ExecutionContext) {
  const db = env.DB;
  if (!db) return unavailableCatalog(env);
  try {
    const saved = await db.prepare('SELECT payload, lease_until FROM catalog_state WHERE owner = ?').bind(OWNER).first<{payload:string|null;lease_until:number}>();
    const state = saved?.payload ? JSON.parse(saved.payload) : null;
    const readOnly = createService({read:async()=>state,write:async()=>{},source:'shared-cache'},env);
    await readOnly.ready;
    const snapshot = readOnly.getSnapshot();
    const now = Date.now();
    const due = !saved || (saved.lease_until <= now && Date.parse(snapshot.sync.nextRefreshAt) <= now);
    if (due) {
      const lease = crypto.randomUUID();
      const acquired = await db.prepare('INSERT INTO catalog_state (owner, payload, lease_owner, lease_until) VALUES (?, NULL, ?, ?) ON CONFLICT(owner) DO UPDATE SET lease_owner = excluded.lease_owner, lease_until = excluded.lease_until WHERE catalog_state.lease_until <= ?').bind(OWNER,lease,now+LEASE_MS,now).run();
      if (acquired.meta.changes===1) {
        ctx.waitUntil(refreshShared(db,env,lease));
        snapshot.sync.syncing=true;
      }
    } else if (saved && saved.lease_until > now) snapshot.sync.syncing=true;
    return snapshot;
  } catch {
    // A storage outage must not create independent upstream pollers.
    return unavailableCatalog(env);
  }
}
async function refreshShared(db: D1Database, env: Cloudflare.Env, lease: string) {
  try {
    const storage={
      strict:true, source:'shared-cache',
      async read() {
        const row=await db.prepare('SELECT payload FROM catalog_state WHERE owner = ?').bind(OWNER).first<{payload:string|null}>();
        return row?.payload?JSON.parse(row.payload):null;
      },
      async write(state: unknown) {
        const now=Date.now();
        const result=await db.prepare('UPDATE catalog_state SET payload = ?, lease_until = ? WHERE owner = ? AND lease_owner = ? AND lease_until > ?').bind(JSON.stringify(state),now+LEASE_MS,OWNER,lease,now).run();
        if(result.meta.changes!==1) throw new Error('Shared refresh lease lost');
      }
    };
    const service=createService(storage,env);
    await service.ready;
    await service.refreshProjects();
  } finally {
    await db.prepare('UPDATE catalog_state SET lease_until = 0, lease_owner = NULL WHERE owner = ? AND lease_owner = ?').bind(OWNER,lease).run();
  }
}
