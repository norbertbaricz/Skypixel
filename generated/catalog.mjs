// Generated from public/js/catalog.js.
const catalog = (function () {
    'use strict';

    const CONFIG = Object.freeze({
        githubUsername: 'norbertbaricz',
        creatorName: 'MaxUltimat3',
        brandName: 'Skypixel Framework',
        brandLogo: '/images/logo-256.webp', // Optimized for the header, loader, and small emblems.
        brandLogoLarge: '/images/logo-512.webp', // High-density screens and the About profile.
        brandLogoSource: '/images/logo-hd.png', // Full restoration; the original logo.png is retained.
        refreshMs: 10 * 60 * 1000, // Cache lifetime and background refresh interval.
        requestTimeoutMs: 7000, // Maximum duration of an individual GitHub request.
        pageSize: 100, // GitHub's maximum repository page size.
        maxPages: 100, // Fail explicitly instead of silently truncating a large account.
        recentDays: 30, // Informational only; old projects are never marked EOL.
        featuredNames: ['DakotaAC', 'BoosterX', 'Puro'],
        categories: ['All projects', 'Minecraft', 'Windows', 'Discord', 'Web'],
        snapshotPath: '/data/projects.json',
        maxReleaseAssets: 20, // Keep release responses small.
        maxReleaseBodyLength: 12000, // Plain text; never render GitHub HTML.
        apiPageSize: 24
    });

    // Editorial fields can evolve independently of GitHub metadata and quota.
    const PRESENTATION_FIELDS = Object.freeze(['title','category','theme','icon','tagline','summary','overview','features','stack','gettingStarted']);
    const LOGO_CONFIG = Object.freeze({ maxBytes: 512 * 1024, maxPathLength: 300 });
    const PROJECT_ALIASES = Object.freeze({ ServerLauncher: 'Server-Launcher' });
    const LOCAL_LOGOS = Object.freeze({ Nexus: '/images/projects/nexus.png' });
    const detailsFor = name => DETAILS[name] || DETAILS[PROJECT_ALIASES[name]];

    const DETAILS = Object.freeze({
        DakotaAC: {
            title: 'DakotaAC', category: 'Minecraft', theme: 'red', icon: 'shield',
            tagline: 'Fair play starts here.',
            summary: 'A Minecraft anti-cheat built to keep your server a fair place to play.',
            overview: 'DakotaAC monitors player behavior and suspicious packets to help server owners detect unfair advantages. Combat, movement, world interactions, and exploit checks live in one configurable Java plugin.',
            features: ['Combat & movement checks', 'Packet & exploit monitoring', 'Staff violation alerts', 'Configurable checks & messages'],
            stack: ['Java', 'Paper', 'ProtocolLib'],
            gettingStarted: 'Read the repository documentation for supported server versions and dependencies. Download a release, place the JAR in your plugins folder, and configure the generated files.'
        },
        BoosterX: {
            title: 'BoosterX', category: 'Windows', theme: 'amber', icon: 'bolt',
            logo: '/images/projects/boosterx.png',
            tagline: 'Give your PC room to breathe.',
            summary: 'A Windows utility that brings performance tweaks and cleanup into one place.',
            overview: 'BoosterX brings Windows optimization options into a desktop interface. Explore performance tweaks and cleanup tools without hunting through system settings.',
            features: ['Windows performance options', 'System cleanup tools', 'Desktop control panel', 'Configurable optimization choices'],
            stack: ['C#', '.NET', 'Windows'],
            gettingStarted: 'Check the repository for build instructions and available releases. Review the effect of each system setting before applying it.'
        },
        Puro: {
            title: 'Puro', category: 'Discord', theme: 'violet', icon: 'bot',
            tagline: 'A little more life in your server.',
            summary: 'Your Discord companion for moderation, games, economy, and community.',
            overview: 'Puro is a Node.js and Discord.js bot for active communities. It combines moderation, interactive games, economy commands, activity tools, and temporary voice rooms in one companion.',
            features: ['Moderation & announcements', 'Interactive games & economy', 'Temporary voice rooms', 'Community activity tools'],
            stack: ['JavaScript', 'Node.js', 'Discord.js'],
            gettingStarted: 'Create a Discord application, configure your bot token and application ID in the environment file, install dependencies, and follow the repository setup guide.'
        },
        'Server-Launcher': {
            title: 'Server Launcher', category: 'Minecraft', theme: 'green', icon: 'cube',
            logo: '/images/projects/server-launcher.png',
            tagline: 'Your world. Your server.',
            summary: 'Create and manage Minecraft servers from a Windows desktop interface.',
            overview: 'Server Launcher simplifies hosting Minecraft at home. Create Vanilla, Bedrock, or modded servers, manage Java and memory settings, and follow live server logs from a desktop dashboard.',
            features: ['Vanilla, Bedrock & modded', 'Automatic Java setup', 'Memory allocation controls', 'Live console & server management'],
            stack: ['C#', '.NET', 'Minecraft'],
            gettingStarted: 'Read the release instructions, extract the launcher into an empty folder, then choose your server type and version. Configure memory before starting your server.'
        },
        Skypixel: {
            title: 'Skypixel', category: 'Web', theme: 'blue', icon: 'spark',
            logo: CONFIG.brandLogo,
            tagline: 'The place where it all connects.',
            summary: 'The home of the Skypixel ecosystem. Every project, one place to explore.',
            overview: 'Skypixel Framework is the presentation layer for this collection of projects. Built with Express, EJS, and vanilla JavaScript, it connects the portfolio to public GitHub repositories and releases.',
            features: ['GitHub repository discovery', 'Search & category filters', 'Project details & release links', 'Responsive, accessible interface'],
            stack: ['JavaScript', 'Express', 'EJS'],
            gettingStarted: 'Clone the repository, run npm install, copy .env.example to .env, and start the Express application with npm start. Use npm run build for hosted output or npm run build:static for a saved snapshot.'
        }
    });

    const PATHS = {
        arrow: '<path d="M7 17 17 7M7 7h10v10"/>',
        right: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
        down: '<path d="M12 4v16m-6-6 6 6 6-6"/>',
        github: '<path d="M9 19c-4.3 1.3-4.3-2.2-6-2.7m12 5v-3.8a3.3 3.3 0 0 0-.9-2.6c3-.3 6.2-1.5 6.2-6.8A5.3 5.3 0 0 0 18.8 4a4.8 4.8 0 0 0-.1-3S17.5.6 15 2.5a13.4 13.4 0 0 0-6 0C6.5.6 5.3 1 5.3 1a4.8 4.8 0 0 0-.1 3 5.3 5.3 0 0 0-1.5 4.1c0 5.3 3.2 6.5 6.2 6.8a3.3 3.3 0 0 0-.9 2.6v3.8"/>',
        shield: '<path d="m12 3 8 3v6c0 4-4 7-8 9-4-2-8-5-8-9V6z"/><path d="m8 12 3 3 5-6"/>',
        bolt: '<path d="M13 2 4 14h7l-1 8 10-13h-7z"/>',
        bot: '<rect x="3" y="6" width="18" height="14" rx="5"/><path d="M12 3v3M7 3h10M8 15h8"/><path d="M8 10v1m8-1v1"/>',
        cube: '<path d="m12 2 9 5v10l-9 5-9-5V7zM3 7l9 5 9-5m-9 5v10m-5-18 10 6"/>',
        spark: '<path d="M12 2 15 9l7 3-7 3-3 7-3-7-7-3 7-3z"/>',
        search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
        star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z"/>',
        fork: '<circle cx="6" cy="4" r="2"/><circle cx="18" cy="4" r="2"/><circle cx="6" cy="20" r="2"/><path d="M6 6v12m12-12v3a3 3 0 0 1-3 3H6"/>',
        code: '<path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18"/>',
        close: '<path d="m6 6 12 12M6 18 18 6"/>',
        check: '<path d="m5 12 4 4L19 6"/>',
        copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
        download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
        clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
        grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
        list: '<path d="M8 5h13M8 12h13M8 19h13M3 5h.1M3 12h.1M3 19h.1"/>',
        mail: '<rect x="2" y="4" width="20" height="16" rx="3"/><path d="m2 5 10 8L22 5"/>',
        globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>'
    };

    function icon(name, className = '') {
        return `<svg class="icon ${className}" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name] || PATHS.code}</svg>`;
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
    }

    function safeUrl(value) {
        try {
            const url = new URL(value);
            return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
        } catch { return ''; }
    }



    function configuredLogo(project) {
        const owner = String(project.fullName || '').split('/')[0];
        return !owner || owner.toLowerCase() === CONFIG.githubUsername.toLowerCase() ? (detailsFor(project.name)?.logo || LOCAL_LOGOS[project.name] || '') : '';
    }
    function safeProjectLogo(project) {
        const local = configuredLogo(project);
        if (local) return local;
        try {
            const url = new URL(project.logo);
            const [owner, name] = String(project.fullName || '').split('/');
            const prefix = `/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/`;
            return owner && name && url.protocol === 'https:' && url.hostname === 'raw.githubusercontent.com' && !url.username && !url.password && !url.port && url.pathname.toLowerCase().startsWith(prefix.toLowerCase()) && /\.(png|webp|svg|ico|jpe?g)$/i.test(url.pathname) ? url.href : '';
        } catch { return ''; }
    }
    function logoScore(entry, repositoryName) {
        const path = String(entry?.path || '');
        if (entry?.type !== 'blob' || entry.mode === '120000' || !path || path.length > LOGO_CONFIG.maxPathLength || /(^|\/)\.\.?($|\/)|[\\\x00-\x1f]/.test(path) || !/\.(png|webp|svg|ico|jpe?g)$/i.test(path) || !Number.isFinite(entry.size) || entry.size < 1 || entry.size > LOGO_CONFIG.maxBytes) return -1;
        if (/(^|\/)(node_modules|vendor|packages|tests?|screenshots?)(\/|$)|notification|badge|splash|background|banner|screenshot/i.test(path)) return -1;
        const filename = path.split('/').at(-1).replace(/\.[^.]+$/, '').toLowerCase();
        const compactName = String(repositoryName).replace(/[^a-z0-9]/gi, '').toLowerCase();
        const compactFile = filename.replace(/[^a-z0-9]/gi, '');
        const named = compactName.length > 1 && compactFile.includes(compactName);
        if (!named && !/(?:^|[-_.])(logo|icon|favicon|mark)(?:$|[-_.0-9])/.test(filename)) return -1;
        let score = named ? 90 : 0;
        score += /logo/.test(filename) ? 120 : /favicon/.test(filename) ? 35 : /icon/.test(filename) ? 85 : 50;
        score += /(?:192|256|512)/.test(filename) ? 15 : 0;
        score += /\.(png|webp)$/i.test(path) ? 10 : /\.svg$/i.test(path) ? 8 : 0;
        score += /(^|\/)(public|assets|images|resources)(\/|$)/i.test(path) ? 8 : 0;
        return score - path.split('/').length * 2;
    }
    function chooseRepositoryLogo(repo, response) {
        if (!Array.isArray(response?.tree)) return null;
        let candidate = null, bestScore = -1;
        for (const entry of response.tree) {
            const score = logoScore(entry, repo.name);
            if (score >= 0 && (score > bestScore || (score === bestScore && entry.path.localeCompare(candidate.path) < 0))) { candidate = entry; bestScore = score; }
        }
        if (!candidate) return null;
        const owner = repo.owner?.login;
        if (!/^[a-z0-9-]+$/i.test(owner || '') || !/^[a-z0-9_.-]+$/i.test(repo.name || '')) return null;
        const branch = repo.default_branch || 'HEAD';
        const path = candidate.path.split('/').map(encodeURIComponent).join('/');
        const version = /^[a-f0-9]{40,64}$/i.test(candidate.sha || '') ? `?v=${candidate.sha}` : '';
        return `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo.name)}/${encodeURIComponent(branch)}/${path}${version}`;
    }
    function projectIdentity(project, eager = false) {
        const logo = safeProjectLogo(project);
        const initials = String(project.title || project.name || 'SP').replace(/[^a-z0-9]/gi, '').slice(0,2).toUpperCase();
        const fallback = `<span class="project-monogram">${escapeHtml(initials)}</span><span class="project-type-icon">${icon(project.icon)}</span>`;
        return `<span class="project-logo" aria-hidden="true">${logo ? `<img class="project-logo-image" src="${escapeHtml(logo)}"${logo === CONFIG.brandLogo ? ` srcset="${escapeHtml(CONFIG.brandLogo)} 256w, ${escapeHtml(CONFIG.brandLogoLarge)} 512w" sizes="64px"` : ''} width="64" height="64" alt="" loading="${eager ? 'eager' : 'lazy'}" decoding="async" referrerpolicy="no-referrer">` : ''}<span class="project-logo-fallback"${logo ? ' hidden' : ''}>${fallback}</span></span>`;
    }

    function normalizeRelease(release) {
        if (!release) return null;
        return {
            tag: String(release.tag_name || release.tag || ''),
            title: String(release.name || release.title || release.tag_name || release.tag || ''),
            url: safeUrl(release.html_url || release.url),
            publishedAt: release.published_at || release.publishedAt || null,
            body: String(release.body || '').slice(0, CONFIG.maxReleaseBodyLength),
            assets: (Array.isArray(release.assets) ? release.assets : []).slice(0, CONFIG.maxReleaseAssets).map(asset => ({
                name: String(asset.name || 'Download'),
                url: safeUrl(asset.browser_download_url || asset.url),
                size: Math.max(0, Number(asset.size) || 0),
                downloads: Math.max(0, Number(asset.download_count ?? asset.downloads) || 0)
            })).filter(asset => asset.url)
        };
    }

    function getReleases(projects) {
        return projects.filter(project => project.release?.tag).map(project => ({
            ...project.release, projectName: project.name, projectTitle: project.title, icon: project.icon, category: project.category
        })).sort((a, b) => (Date.parse(b.publishedAt) || 0) - (Date.parse(a.publishedAt) || 0));
    }

    function filterProjects(projects, options = {}) {
        const query = String(options.q || '').trim().toLowerCase();
        const category = String(options.category || 'All projects');
        const allowedSorts = ['featured', 'updated', 'stars', 'name'];
        const sort = allowedSorts.includes(options.sort) ? options.sort : 'featured';
        const order = [...CONFIG.featuredNames, 'Server-Launcher', 'Skypixel'];
        const rank = name => { const index = order.indexOf(name); return index < 0 ? order.length : index; };
        return projects.filter(project => (category === 'All projects' || project.category === category) && (!query || [project.name, project.title, project.summary, project.language, ...(project.topics || []), ...(project.stack || [])].join(' ').toLowerCase().includes(query)))
            .sort((a, b) => sort === 'name' ? a.title.localeCompare(b.title) : sort === 'stars' ? b.stars - a.stars || a.title.localeCompare(b.title) : sort === 'updated' ? (Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0) : rank(a.name) - rank(b.name) || a.title.localeCompare(b.title));
    }

    function classifyRepository(repo) {
        const keywords = [repo.name, repo.description, ...(repo.topics || [])].join(' ').toLowerCase();
        if (/minecraft|paper(?:mc)?|spigot|bukkit|fabricmc|bedrock/.test(keywords)) return 'Minecraft';
        if (/discord|discordjs|discord\.js/.test(keywords)) return 'Discord';
        if (/windows|winui|wpf|winforms|desktop|powershell/.test(keywords)) return 'Windows';
        if (/website|webapp|frontend|nextjs|react|vue|svelte/.test(keywords) || ['JavaScript','TypeScript','HTML','CSS'].includes(repo.language)) return 'Web';
        return 'Developer tools';
    }
    function applyPresentationOverrides(project, username = CONFIG.githubUsername) {
        const owner = String(project.fullName || '').split('/')[0] || username;
        const curated = owner.toLowerCase() === CONFIG.githubUsername.toLowerCase() ? detailsFor(project.name) : null;
        if (!curated) return project;
        const current = { ...project };
        for (const key of PRESENTATION_FIELDS) if (curated[key] !== undefined) current[key] = curated[key];
        return current;
    }

    function normalizeRepo(repo, releases = {}) {
        const curated = repo.owner?.login?.toLowerCase() === CONFIG.githubUsername.toLowerCase() ? detailsFor(repo.name) : null;
        const category = curated?.category || classifyRepository(repo);
        const release = releases[repo.name] || null;
        return {
            id: repo.id, name: repo.name, title: curated?.title || repo.name.replace(/[-_]/g, ' '),
            fullName: repo.full_name, category, theme: curated?.theme || 'gold', icon: curated?.icon || ({ Minecraft: 'cube', Discord: 'bot', Windows: 'bolt', Web: 'globe' }[category] || 'code'),
            tagline: curated?.tagline || 'Another idea, brought to life.',
            summary: curated?.summary || repo.description || 'Explore the code and documentation on GitHub.',
            overview: curated?.overview || repo.description || 'Visit the repository to learn about this project and its latest developments.',
            features: curated?.features || (repo.topics || []).slice(0, 6),
            stack: curated?.stack || [repo.language || 'Code'],
            gettingStarted: curated?.gettingStarted || 'Read the repository README for setup, usage, and contribution information.',
            htmlUrl: safeUrl(repo.html_url), homepage: safeUrl(repo.homepage),
            sourceUrl: safeUrl(repo.html_url), releasesUrl: safeUrl(repo.html_url + '/releases'),
            language: repo.language || 'Other', stars: Number(repo.stargazers_count) || 0,
            forks: Number(repo.forks_count) || 0, archived: Boolean(repo.archived), fork: Boolean(repo.fork),
            updatedAt: repo.pushed_at || repo.updated_at || repo.created_at,
            topics: Array.isArray(repo.topics) ? repo.topics : [],
            branch: repo.default_branch || 'main', license: repo.license?.spdx_id || null,
            release: normalizeRelease(release)
        };
    }

    function buildCatalog(repositories, releases = {}, username = CONFIG.githubUsername) {
        return repositories.filter(repo => !repo.private && repo.owner?.login?.toLowerCase() === username.toLowerCase()).map(repo => normalizeRepo(repo, releases));
    }

    function getStats(projects) {
        return { projects: projects.length, stars: projects.reduce((sum, p) => sum + p.stars, 0), languages: new Set(projects.map(p => p.language).filter(p => p !== 'Other')).size };
    }

    function formatDate(value) {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? 'Date unavailable' : new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
    }

    function releaseExcerpt(body, maxLength = 240) {
        const text = String(body || '').replace(/(^|\n)\s{0,3}#{1,6}\s+/g, '$1').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[`*]/g, '').replace(/\s+/g, ' ').trim();
        return text.slice(0, maxLength) + (text.length > maxLength ? '…' : '');
    }

    // A small, escaped subset of Markdown. GitHub HTML and embedded media stay inert.
    function renderReleaseNotes(body, title = '') {
        const inline = value => {
            const tokens = /`([^`]+)`|\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^\s)]+)\)/g;
            let html = '', cursor = 0;
            for (const match of value.matchAll(tokens)) {
                html += escapeHtml(value.slice(cursor, match.index));
                if (match[1] !== undefined) html += `<code>${escapeHtml(match[1])}</code>`;
                else if (match[2] !== undefined) html += `<strong>${escapeHtml(match[2])}</strong>`;
                else {
                    const url = safeUrl(match[4]);
                    html += url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(match[3])}</a>` : escapeHtml(match[3]);
                }
                cursor = match.index + match[0].length;
            }
            return html + escapeHtml(value.slice(cursor));
        };
        const lines = String(body || '').slice(0, CONFIG.maxReleaseBodyLength).replace(/\r/g, '').split('\n');
        const output = []; let paragraph = [], list = null, code = null;
        const flush = () => { if (paragraph.length) { output.push(`<p>${inline(paragraph.join(' '))}</p>`); paragraph = []; } };
        const endList = () => { if (list) { output.push(`</${list}>`); list = null; } };
        for (const [index, line] of lines.entries()) {
            if (/^\s*```/.test(line)) {
                flush(); endList();
                if (code) { output.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`); code = null; } else code = [];
                continue;
            }
            if (code) { code.push(line); continue; }
            if (!line.trim()) { flush(); endList(); continue; }
            const heading = line.match(/^\s{0,3}#{1,6}\s+(.+)$/);
            const item = line.match(/^\s*(?:([-*+])|\d+[.)])\s+(.+)$/);
            if (heading) {
                flush(); endList();
                if (index !== 0 || heading[1].trim() !== title.trim()) output.push(`<h3>${inline(heading[1])}</h3>`);
            } else if (item) {
                flush(); const type = item[1] ? 'ul' : 'ol';
                if (list !== type) { endList(); output.push(`<${type}>`); list = type; }
                output.push(`<li>${inline(item[2])}</li>`);
            } else { endList(); paragraph.push(line); }
        }
        flush(); endList();
        if (code) output.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
        return output.join('');
    }

    return { CONFIG, DETAILS, LOGO_CONFIG, icon, escapeHtml, safeUrl, projectIdentity, configuredLogo, safeProjectLogo, logoScore, chooseRepositoryLogo, normalizeRelease, normalizeRepo, applyPresentationOverrides, classifyRepository, buildCatalog, getStats, getReleases, filterProjects, formatDate, releaseExcerpt, renderReleaseNotes };
})();
export default catalog;
