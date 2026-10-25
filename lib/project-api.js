const { createHash } = require('node:crypto');
const { API_CONFIG, createApi } = require('./api-core.mjs');
const { listProjects, listReleases } = createApi(require('../public/js/catalog'));

function sendCatalogJson(req, res, data) {
    const serialized = JSON.stringify(data);
    const etag = `"${createHash('sha256').update(serialized).digest('hex')}"`;
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', `private, max-age=${API_CONFIG.cacheSeconds}, must-revalidate`);
    if (String(req.get('If-None-Match') || '').split(',').map(value => value.trim().replace(/^W\//, '')).includes(etag)) return res.status(304).end();
    return res.type('json').send(serialized);
}
module.exports = { API_CONFIG, listProjects, listReleases, sendCatalogJson };
