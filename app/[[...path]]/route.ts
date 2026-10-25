import pages from '../../generated/pages.mjs';
import { securityHeaders } from '../../worker/http';

const pageMap: Record<string, string> = pages;

// EJS remains the page source. No client framework is added to the portfolio UI.
export function GET(request: Request) {
  const pathname = new URL(request.url).pathname.replace(/\/$/, '') || '/';
  const html = pageMap[pathname] || pageMap['404'];
  return new Response(html, {status: pageMap[pathname] ? 200 : 404, headers: {...securityHeaders, 'Content-Type':'text/html; charset=utf-8', 'Cache-Control':'private, no-cache'}});
}
