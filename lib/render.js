const catalog = require('../public/js/catalog');
const packageJson = require('../package.json');

// The same views are used by Express and the static export.
function viewData(page, snapshot, staticExport = false) {
    const projects = snapshot.projects;
    return {
        page, projects, snapshot, staticExport, ...catalog,
        username: process.env.GITHUB_USERNAME || catalog.CONFIG.githubUsername,
        creatorName: process.env.CREATOR_ALIAS || catalog.CONFIG.creatorName,
        stats: catalog.getStats(projects),
        releases: catalog.getReleases(projects),
        featured: catalog.CONFIG.featuredNames.map(name => projects.find(p => p.name === name)).filter(Boolean),
        assetVersion: packageJson.version,
        title: ({ projects: 'Projects', about: 'About', updates: 'Updates', error: 'Page not found' }[page] || 'Home') + ' — Skypixel Framework',
        contactEnabled: !staticExport && Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
        siteUrl: process.env.SITE_URL || '',
        year: new Date().getFullYear(),
        bootstrap: JSON.stringify(snapshot).replace(/</g, '\\u003c')
    };
}
module.exports = { viewData };
