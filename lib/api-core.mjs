// Shared API projections; transport adapters own headers and response ETags.
export const API_CONFIG = Object.freeze({ defaultPageSize:24, maxPageSize:100, maxSearchLength:200, cacheSeconds:30 });
export function createApi(catalog) {
    function listProjects(snapshot,query={}) {
        const filtered=catalog.filterProjects(snapshot.projects,{q:String(query.q||'').slice(0,API_CONFIG.maxSearchLength),category:query.category,sort:query.sort});
        const paginate=query.limit!==undefined||query.page!==undefined;
        const limit=Math.max(1,Math.min(API_CONFIG.maxPageSize,parseInt(query.limit,10)||API_CONFIG.defaultPageSize));
        const page=Math.max(1,parseInt(query.page,10)||1);
        return {...snapshot,projects:paginate?filtered.slice((page-1)*limit,page*limit):filtered,total:filtered.length,page:paginate?page:1,pageSize:paginate?limit:filtered.length,totalPages:paginate?Math.ceil(filtered.length/limit):filtered.length?1:0,stats:catalog.getStats(snapshot.projects),categories:[...new Set(snapshot.projects.map(p=>p.category))]};
    }
    function listReleases(snapshot,query={}) {
        const limit=Math.max(1,Math.min(API_CONFIG.maxPageSize,parseInt(query.limit,10)||API_CONFIG.defaultPageSize));
        const releases=catalog.getReleases(snapshot.projects).filter(r=>!query.project||r.projectName.toLowerCase()===String(query.project).toLowerCase());
        return {releases:releases.slice(0,limit),total:releases.length,syncedAt:snapshot.syncedAt,sync:snapshot.sync};
    }
    return {listProjects,listReleases};
}
