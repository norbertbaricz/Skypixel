const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');
const catalog = require('../public/js/catalog');
const { viewData } = require('../lib/render');
const source = require('../repository-snapshot.json');

// One set of EJS views for Express, the hosted Worker, and optional static hosting.
const ROOT = path.resolve(__dirname, '..');
const HOSTED = process.argv.includes('--hosted');
const OUTPUT_DIRECTORY = path.join(ROOT, HOSTED ? '.cache/page-export' : 'dist-static');
const PAGES = ['index','projects','updates','about'];
const SNAPSHOT = {
    projects: catalog.buildCatalog(source.repositories, source.releases, process.env.GITHUB_USERNAME || catalog.CONFIG.githubUsername),
    syncedAt: source.fetchedAt, source: 'snapshot',
    contributors: [{ login: catalog.CONFIG.githubUsername, name: catalog.CONFIG.creatorName, role: 'Creator' }]
};
async function build() {
    fs.rmSync(OUTPUT_DIRECTORY, { recursive: true, force: true });
    fs.mkdirSync(OUTPUT_DIRECTORY, { recursive: true });
    if (!HOSTED) fs.cpSync(path.join(ROOT,'public'), OUTPUT_DIRECTORY, { recursive: true });
    const pages = {};
    for (const page of PAGES) {
        const html = await ejs.renderFile(path.join(ROOT,'views',`${page}.ejs`), { ...viewData(page, SNAPSHOT, !HOSTED), contactEnabled: false });
        const url = page === 'index' ? '/' : '/' + page;
        pages[url] = html;
        const target = path.join(OUTPUT_DIRECTORY, page === 'index' ? 'index.html' : `${page}/index.html`);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target,html);
    }
    const error = await ejs.renderFile(path.join(ROOT,'views/error.ejs'), { ...viewData('error', SNAPSHOT, !HOSTED), code:'404', errorTitle:'This path is still unexplored.', errorMessage:'The page you are looking for could not be found.' });
    pages['404'] = error;
    fs.writeFileSync(path.join(OUTPUT_DIRECTORY,'404.html'),error);
    fs.mkdirSync(path.join(ROOT,'public/data'), { recursive:true });
    fs.writeFileSync(path.join(ROOT,'public/data/projects.json'),JSON.stringify(SNAPSHOT));
    if (HOSTED) {
        fs.mkdirSync(path.join(ROOT,'generated'), { recursive:true });
        fs.writeFileSync(path.join(ROOT,'generated/pages.mjs'),'// Generated from views/. Run npm run build or npm run dev after editing EJS.\nexport default '+JSON.stringify(pages)+';\n');
        const shared = fs.readFileSync(path.join(ROOT,'public/js/catalog.js'),'utf8');
        const body = shared.slice(shared.indexOf("    'use strict';"),shared.lastIndexOf('}));'));
        fs.writeFileSync(path.join(ROOT,'generated/catalog.mjs'),'// Generated from public/js/catalog.js.\nconst catalog = (function () {\n'+body+'})();\nexport default catalog;\n');
    } else {
        fs.mkdirSync(path.join(OUTPUT_DIRECTORY,'data'),{recursive:true});
        fs.writeFileSync(path.join(OUTPUT_DIRECTORY,'data/projects.json'),JSON.stringify(SNAPSHOT));
    }
    const siteUrl = (process.env.SITE_URL || '').replace(/\/$/,'');
    const robots = `User-agent: *\nAllow: /\n${siteUrl ? `Sitemap: ${siteUrl}/sitemap.xml\n` : ''}`;
    fs.writeFileSync(path.join(ROOT,'public/robots.txt'),robots);
    if (siteUrl) fs.writeFileSync(path.join(ROOT,'public/sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${Object.keys(pages).filter(p=>p!=='404').map(p=>`<url><loc>${catalog.escapeHtml(siteUrl+p)}</loc></url>`).join('')}</urlset>`);
    if (!siteUrl) fs.rmSync(path.join(ROOT,'public/sitemap.xml'),{force:true});
    if (!HOSTED) {
        fs.copyFileSync(path.join(ROOT,'public/robots.txt'),path.join(OUTPUT_DIRECTORY,'robots.txt'));
        if (siteUrl) fs.copyFileSync(path.join(ROOT,'public/sitemap.xml'),path.join(OUTPUT_DIRECTORY,'sitemap.xml'));
        else fs.rmSync(path.join(OUTPUT_DIRECTORY,'sitemap.xml'),{force:true});
        fs.writeFileSync(path.join(OUTPUT_DIRECTORY,'_headers'), "/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://avatars.githubusercontent.com https://raw.githubusercontent.com; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'\n");
    }
    console.log(`Prepared ${PAGES.length} pages and ${SNAPSHOT.projects.length} fallback projects (${HOSTED?'hosted backend':'static snapshot'}).`);
}
build().catch(error=>{console.error(error);process.exitCode=1;});
