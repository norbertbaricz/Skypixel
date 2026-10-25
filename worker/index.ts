import handler from 'vinext/server/fetch-handler';
import { sharedCatalog } from './catalog';
import { jsonResponse, securityHeaders } from './http';
import { createApi } from '../lib/api-core.mjs';
import catalog from '../generated/catalog.mjs';
const api = createApi(catalog);

export default {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/') || url.pathname==='/health') {
      if (!['GET','HEAD'].includes(request.method)) return jsonResponse(request,{ok:false,message:'Method not allowed.'},405);
      const snapshot=await sharedCatalog(env,ctx);
      const query=Object.fromEntries(url.searchParams);
      if(url.pathname==='/health') return jsonResponse(request,{ok:true,service:'skypixel',github:snapshot.sync.state});
      if(url.pathname==='/api/status') return jsonResponse(request,{ok:true,catalog:snapshot.sync},200,0);
      if(url.pathname==='/api/projects') return jsonResponse(request,api.listProjects(snapshot,query));
      if(url.pathname==='/api/releases') return jsonResponse(request,api.listReleases(snapshot,query));
      if(url.pathname.startsWith('/api/projects/')) {
        let name: string;
        try { name=decodeURIComponent(url.pathname.slice('/api/projects/'.length)).toLowerCase(); }
        catch { return jsonResponse(request,{ok:false,message:'Invalid project name.'},400); }
        const project=snapshot.projects.find((p: {name: string})=>p.name.toLowerCase()===name);
        return jsonResponse(request,project?{project,syncedAt:snapshot.syncedAt,sync:snapshot.sync}:{ok:false,message:'Project not found.'},project?200:404);
      }
      return jsonResponse(request,{ok:false,message:'API route not found.'},404);
    }
    const response=await handler.fetch(request,env,ctx);
    const headers=new Headers(response.headers);
    for(const [name,value] of Object.entries(securityHeaders)) headers.set(name,value);
    return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
  }
};
