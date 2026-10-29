// Transport settings. Live status must bypass the normal short API cache.
const HTTP_CONFIG = Object.freeze({ jsonCacheSeconds: 30 });
export const securityHeaders = {
  'X-Content-Type-Options':'nosniff',
  'Referrer-Policy':'strict-origin-when-cross-origin',
  'Permissions-Policy':'geolocation=(), microphone=(), camera=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://avatars.githubusercontent.com https://raw.githubusercontent.com; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'"
};
export async function jsonResponse(request: Request, data: unknown, status = 200, cacheSeconds: number = HTTP_CONFIG.jsonCacheSeconds) {
  const serialized = JSON.stringify(data);
  const hash = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(serialized));
  const etag = '"'+[...new Uint8Array(hash)].map(n=>n.toString(16).padStart(2,'0')).join('')+'"';
  const cacheable = status === 200 && cacheSeconds > 0;
  const headers = {...securityHeaders,'Content-Type':'application/json; charset=utf-8','Cache-Control':cacheable?`private, max-age=${cacheSeconds}, must-revalidate`:'no-store','ETag':etag};
  const match = cacheable && (request.headers.get('If-None-Match')||'').split(',').some(value=>value.trim().replace(/^W\//,'')===etag);
  return new Response(match||request.method==='HEAD'?null:serialized,{status:match?304:status,headers});
}
