const express = require('express');
const path = require('path');
const morgan = require('morgan');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

if (typeof fetch !== 'function') {
    throw new Error('Global fetch API is unavailable. Upgrade Node.js to v18 or newer.');
}

const projectReleaseRepos = {
    puro: 'norbertbaricz/Puro',
    serverLauncher: 'norbertbaricz/Server-Launcher',
    skypixelWebsite: 'norbertbaricz/Skypixel',
    dakotaAc: 'norbertbaricz/DakotaAC'
};

const GITHUB_USERNAME = process.env.GITHUB_USERNAME || 'norbertbaricz';

const releaseCache = new Map();
const repoImageCache = new Map();
const userBioCache = new Map();
const userDisplayNameCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes cache
const GITHUB_TIMEOUT_MS = Number(process.env.GITHUB_TIMEOUT_MS) || 7000;
const RELEASE_REFRESH_MS = Number(process.env.RELEASE_REFRESH_MS) || CACHE_TTL;
const PROJECTS_REFRESH_MS = Number(process.env.PROJECTS_REFRESH_MS) || CACHE_TTL;
const NEW_UPDATE_DAYS = Number(process.env.NEW_UPDATE_DAYS) || 30;
const EOL_UPDATE_DAYS = Number(process.env.EOL_UPDATE_DAYS) || 180;

// Keep a simple in-memory snapshot so the /projects page renders quickly without waiting on GitHub
const releaseSnapshot = {
    data: null,
    fetchedAt: 0,
    inFlight: null
};

const projectsSnapshot = {
    data: null,
    fetchedAt: 0,
    inFlight: null
};

const teamSnapshot = {
    data: null,
    fetchedAt: 0,
    inFlight: null
};

function buildGitHubHeaders() {
    const headers = {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Skypixel-App'
    };

    if (process.env.GITHUB_TOKEN) {
        headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    return headers;
}

function normalizeRepo(repo, index, imagePool, ogImageUrl) {
    const image = ogImageUrl
        || repo.open_graph_image_url
        || (repo.full_name ? `https://opengraph.githubassets.com/1/${repo.full_name}` : null)
        || imagePool[index % imagePool.length];
    return {
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description || 'No description provided yet.',
        htmlUrl: repo.html_url,
        homepage: repo.homepage || '',
        language: repo.language || 'Unknown',
        stars: repo.stargazers_count || 0,
        forks: repo.forks_count || 0,
        updatedAt: repo.updated_at,
        pushedAt: repo.pushed_at,
        createdAt: repo.created_at,
        archived: Boolean(repo.archived),
        disabled: Boolean(repo.disabled),
        fork: Boolean(repo.fork),
        topics: Array.isArray(repo.topics) ? repo.topics : [],
        image
    };
}

function buildProjectCategories(projects) {
    const active = projects.filter((repo) => !repo.archived && !repo.disabled);
    const archived = projects.filter((repo) => repo.archived);

    const now = Date.now();
    const toLastUpdate = (repo) => new Date(repo.pushedAt || repo.updatedAt || repo.createdAt).getTime();
    const daysSinceUpdate = (repo) => Math.floor((now - toLastUpdate(repo)) / (1000 * 60 * 60 * 24));

    const eol = [...archived, ...active.filter((repo) => daysSinceUpdate(repo) >= EOL_UPDATE_DAYS)];
    const eolIds = new Set(eol.map((repo) => repo.id));

    const activeNonEol = active.filter((repo) => !eolIds.has(repo.id));

    const popular = [...activeNonEol]
        .sort((a, b) => (b.stars - a.stars) || (toLastUpdate(b) - toLastUpdate(a)))
        .slice(0, 2);

    const popularIds = new Set(popular.map((repo) => repo.id));

    const newReleases = [...activeNonEol]
        .filter((repo) => !popularIds.has(repo.id) && daysSinceUpdate(repo) <= NEW_UPDATE_DAYS)
        .sort((a, b) => toLastUpdate(b) - toLastUpdate(a))
        .slice(0, 4);

    return {
        popular,
        newReleases,
        archived: eol
    };
}

async function fetchFromGitHub(url) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GITHUB_TIMEOUT_MS);

    try {
        const response = await fetch(url, {
            headers: buildGitHubHeaders(),
            signal: controller.signal
        });

        if (!response.ok) {
            const error = new Error(`GitHub responded with status ${response.status}`);
            error.statusCode = response.status;
            error.body = await response.text();
            throw error;
        }

        const rawData = await response.text();
        return rawData ? JSON.parse(rawData) : {};
    } catch (error) {
        if (error.name === 'AbortError') {
            const timeoutError = new Error('GitHub request timed out');
            timeoutError.code = 'GITHUB_TIMEOUT';
            throw timeoutError;
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}

async function fetchHtml(url) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GITHUB_TIMEOUT_MS);

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Skypixel-App',
                Accept: 'text/html'
            },
            signal: controller.signal
        });

        if (!response.ok) {
            const error = new Error(`GitHub responded with status ${response.status}`);
            error.statusCode = response.status;
            error.body = await response.text();
            throw error;
        }

        return await response.text();
    } catch (error) {
        if (error.name === 'AbortError') {
            const timeoutError = new Error('GitHub request timed out');
            timeoutError.code = 'GITHUB_TIMEOUT';
            throw timeoutError;
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}

async function getRepoOpenGraphImage(fullName) {
    if (!fullName) return null;

    const cached = repoImageCache.get(fullName);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.url;
    }

    try {
        const html = await fetchHtml(`https://github.com/${fullName}`);
        const match = html.match(/property="og:image" content="([^"]+)"/);
        const url = match ? match[1] : null;
        repoImageCache.set(fullName, { url, timestamp: Date.now() });
        return url;
    } catch (error) {
        if (!isProd) {
            console.error(`Failed to load og:image for ${fullName}:`, error.message || error);
        }
        return null;
    }
}

    function stripHtml(text) {
        return text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    }

    function parseReposFromHtml(html) {
        const blocks = html.match(/<li[^>]*itemprop="owns"[\s\S]*?<\/li>/g) || [];
        return blocks.map((block) => {
            const nameMatch = block.match(/itemprop="name codeRepository"[^>]*>\s*([\s\S]*?)<\/a>/);
            const descriptionMatch = block.match(/itemprop="description">([\s\S]*?)<\/p>/);
            const languageMatch = block.match(/itemprop="programmingLanguage">([\s\S]*?)<\/span>/);
            const starsMatch = block.match(/href="\/[^\"]+\/stargazers"[\s\S]*?>\s*([\d,]+)\s*</);
            const updatedMatch = block.match(/<relative-time datetime="([^"]+)"/);
            const topicMatches = [...block.matchAll(/class="topic-tag[^\"]*"[^>]*>\s*([\s\S]*?)<\/a>/g)];

            const name = nameMatch ? stripHtml(nameMatch[1]) : 'Unknown';
            const description = descriptionMatch ? stripHtml(descriptionMatch[1]) : 'No description provided yet.';
            const language = languageMatch ? stripHtml(languageMatch[1]) : 'Unknown';
            const stars = starsMatch ? Number(starsMatch[1].replace(/,/g, '')) : 0;
            const updatedAt = updatedMatch ? updatedMatch[1] : null;
            const topics = topicMatches.map((match) => stripHtml(match[1])).filter(Boolean);

            return {
                id: name,
                name,
                fullName: `${GITHUB_USERNAME}/${name}`,
                description,
                htmlUrl: `https://github.com/${GITHUB_USERNAME}/${name}`,
                homepage: '',
                language,
                stars,
                forks: 0,
                updatedAt,
                pushedAt: updatedAt,
                createdAt: updatedAt,
                archived: false,
                disabled: false,
                fork: false,
                topics,
                image: null
            };
        });
    }

async function getLatestRelease(repo) {
    if (!repo) return null;

    // Check cache first
    const cached = releaseCache.get(repo);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.version;
    }

    const url = `https://api.github.com/repos/${repo}/releases/latest`;
    try {
        const release = await fetchFromGitHub(url);
        const version = release?.tag_name || release?.name || null;
        
        // Store in cache
        releaseCache.set(repo, {
            version,
            timestamp: Date.now()
        });
        
        return version;
    } catch (error) {
        if (error.statusCode === 403) {
            releaseCache.set(repo, {
                version: null,
                timestamp: Date.now()
            });
            return null;
        }
        if (error.statusCode === 404) {
            return null;
        }
        if (!isProd) {
            console.error(`Failed to load release for ${repo}:`, error.message || error);
        }
        return null;
    }
}

function parseContributorsFromHtml(html) {
    const matches = [...html.matchAll(/data-hovercard-url="\/users\/([^\/\"]+)\/hovercard"/g)];
    return [...new Set(matches.map((match) => match[1]))];
}

function parseUserBioFromHtml(html) {
    const bioMatch = html.match(/class="p-note"[\s\S]*?>\s*([\s\S]*?)<\/div>/)
        || html.match(/itemprop="description"[\s\S]*?>\s*([\s\S]*?)<\/div>/);
    return bioMatch ? stripHtml(bioMatch[1]) : '';
}

function parseUserDisplayNameFromHtml(html) {
    const nameMatch = html.match(/itemprop="name"[\s\S]*?>\s*([\s\S]*?)<\/span>/)
        || html.match(/class="p-name"[\s\S]*?>\s*([\s\S]*?)<\/span>/);
    return nameMatch ? stripHtml(nameMatch[1]) : '';
}

async function getUserBio(login) {
    if (!login) return '';

    const cached = userBioCache.get(login);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.bio;
    }

    try {
        const html = await fetchHtml(`https://github.com/${login}`);
        const bio = parseUserBioFromHtml(html);
        userBioCache.set(login, { bio, timestamp: Date.now() });
        return bio;
    } catch (error) {
        if (!isProd) {
            console.error(`Failed to load bio for ${login}:`, error.message || error);
        }
        return '';
    }
}

async function getUserDisplayName(login) {
    if (!login) return '';

    const cached = userDisplayNameCache.get(login);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.name;
    }

    try {
        const html = await fetchHtml(`https://github.com/${login}`);
        const name = parseUserDisplayNameFromHtml(html);
        userDisplayNameCache.set(login, { name, timestamp: Date.now() });
        return name;
    } catch (error) {
        if (!isProd) {
            console.error(`Failed to load display name for ${login}:`, error.message || error);
        }
        return '';
    }
}

async function getRepoContributors(fullName) {
    if (!fullName) return [];
    try {
        const html = await fetchHtml(`https://github.com/${fullName}/contributors`);
        return parseContributorsFromHtml(html);
    } catch (error) {
        if (!isProd) {
            console.error(`Failed to load contributors for ${fullName}:`, error.message || error);
        }
        return [];
    }
}

async function loadTeamMembers() {
    const projectsData = await refreshProjectsSnapshot();
    const repoFullNames = projectsData?.all?.map((repo) => repo.fullName).filter(Boolean) || [];

    const contributorResults = await Promise.allSettled(
        repoFullNames.map((repoFullName) => getRepoContributors(repoFullName))
    );

    const contributors = new Set();
    contributorResults.forEach((result) => {
        if (result.status === 'fulfilled') {
            result.value.forEach((login) => contributors.add(login));
        }
    });

    contributors.add(GITHUB_USERNAME);

    const logins = [...contributors];
    const bios = await Promise.allSettled(logins.map((login) => getUserBio(login)));
    const displayNames = await Promise.allSettled(logins.map((login) => getUserDisplayName(login)));

    const members = logins.map((login, index) => {
        const bio = bios[index]?.status === 'fulfilled' ? bios[index].value : '';
        const displayName = displayNames[index]?.status === 'fulfilled' ? displayNames[index].value : '';
        return {
            login,
            name: displayName || login,
            avatar: `https://avatars.githubusercontent.com/${login}?s=200`,
            profileUrl: `https://github.com/${login}`,
            role: login === GITHUB_USERNAME ? 'Creator' : 'Contributor',
            description: bio || (login === GITHUB_USERNAME
                ? 'Creator and lead for the Skypixel projects.'
                : 'Contributor across the Skypixel repositories.')
        };
    });

    const categories = {
        creator: members.filter((member) => member.login === GITHUB_USERNAME),
        contributors: members.filter((member) => member.login !== GITHUB_USERNAME)
    };

    return { members, categories };
}

async function loadProjectReleases() {
    const releases = await Promise.all(
        Object.entries(projectReleaseRepos).map(async ([key, repo]) => {
            const version = await getLatestRelease(repo);
            return [key, version];
        })
    );
    return Object.fromEntries(releases);
}

async function loadGitHubProjects() {
    const url = `https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100&sort=updated&type=public`;
    try {
        const repos = await fetchFromGitHub(url);
        const imagePool = [
            '/images/project1.jpg',
            '/images/project2.jpg',
            '/images/project3.jpg',
            '/images/project4.jpg',
            '/images/project5.jpg'
        ];

        const filtered = (Array.isArray(repos) ? repos : []).filter((repo) => !repo.fork);
        const ogImages = await Promise.allSettled(
            filtered.map((repo) => getRepoOpenGraphImage(repo.full_name))
        );
        const normalized = filtered.map((repo, index) => {
            const ogImage = ogImages[index]?.status === 'fulfilled' ? ogImages[index].value : null;
            return normalizeRepo(repo, index, imagePool, ogImage);
        });

        const categories = buildProjectCategories(normalized);
        return {
            all: normalized,
            categories
        };
    } catch (error) {
            let fallbackRepos = [];
            try {
                const html = await fetchHtml(`https://github.com/${GITHUB_USERNAME}?tab=repositories`);
                fallbackRepos = parseReposFromHtml(html);
            } catch {
                fallbackRepos = [];
            }

            if (fallbackRepos.length) {
                const imagePool = [
                    '/images/project1.jpg',
                    '/images/project2.jpg',
                    '/images/project3.jpg',
                    '/images/project4.jpg',
                    '/images/project5.jpg'
                ];

                const ogImages = await Promise.allSettled(
                    fallbackRepos.map((repo) => getRepoOpenGraphImage(repo.fullName))
                );
                const normalizedFallback = fallbackRepos.map((repo, index) => {
                    const ogImage = ogImages[index]?.status === 'fulfilled' ? ogImages[index].value : null;
                    return {
                        ...repo,
                        image: ogImage || (repo.fullName ? `https://opengraph.githubassets.com/1/${repo.fullName}` : null) || imagePool[index % imagePool.length]
                    };
                });

                const categories = buildProjectCategories(normalizedFallback);
                return {
                    all: normalizedFallback,
                    categories
                };
            }

        if (!isProd) {
            console.error('Failed to load GitHub repositories:', error.message || error);
        }
        return {
            all: [],
            categories: { popular: [], newReleases: [], archived: [] }
        };
    }
}

async function refreshReleaseSnapshot(force = false) {
    const isFresh = Date.now() - releaseSnapshot.fetchedAt < CACHE_TTL;
    if (!force && isFresh && releaseSnapshot.data) {
        return releaseSnapshot.data;
    }

    if (releaseSnapshot.inFlight) {
        return releaseSnapshot.inFlight;
    }

    releaseSnapshot.inFlight = loadProjectReleases()
        .then((data) => {
            releaseSnapshot.data = data;
            releaseSnapshot.fetchedAt = Date.now();
            return data;
        })
        .catch((error) => {
            if (!isProd) {
                console.error('Failed to refresh release snapshot:', error.message || error);
            }
            return releaseSnapshot.data;
        })
        .finally(() => {
            releaseSnapshot.inFlight = null;
        });

    return releaseSnapshot.inFlight;
}

async function refreshProjectsSnapshot(force = false) {
    const isFresh = Date.now() - projectsSnapshot.fetchedAt < CACHE_TTL;
    if (!force && isFresh && projectsSnapshot.data) {
        return projectsSnapshot.data;
    }

    if (projectsSnapshot.inFlight) {
        return projectsSnapshot.inFlight;
    }

    projectsSnapshot.inFlight = loadGitHubProjects()
        .then((data) => {
            projectsSnapshot.data = data;
            projectsSnapshot.fetchedAt = Date.now();
            return data;
        })
        .catch((error) => {
            if (!isProd) {
                console.error('Failed to refresh projects snapshot:', error.message || error);
            }
            return projectsSnapshot.data || { all: [], categories: { popular: [], newReleases: [], archived: [] } };
        })
        .finally(() => {
            projectsSnapshot.inFlight = null;
        });

    return projectsSnapshot.inFlight;
}

async function refreshTeamSnapshot(force = false) {
    const isFresh = Date.now() - teamSnapshot.fetchedAt < CACHE_TTL;
    if (!force && isFresh && teamSnapshot.data) {
        return teamSnapshot.data;
    }

    if (teamSnapshot.inFlight) {
        return teamSnapshot.inFlight;
    }

    teamSnapshot.inFlight = loadTeamMembers()
        .then((data) => {
            teamSnapshot.data = data;
            teamSnapshot.fetchedAt = Date.now();
            return data;
        })
        .catch((error) => {
            if (!isProd) {
                console.error('Failed to refresh team snapshot:', error.message || error);
            }
            return teamSnapshot.data || { members: [], categories: { creator: [], contributors: [] } };
        })
        .finally(() => {
            teamSnapshot.inFlight = null;
        });

    return teamSnapshot.inFlight;
}

function scheduleReleaseRefresh() {
    if (RELEASE_REFRESH_MS <= 0) return;
    setInterval(() => {
        refreshReleaseSnapshot(true).catch(() => {});
    }, RELEASE_REFRESH_MS).unref();
}

function scheduleProjectsRefresh() {
    if (PROJECTS_REFRESH_MS <= 0) return;
    setInterval(() => {
        refreshProjectsSnapshot(true).catch(() => {});
    }, PROJECTS_REFRESH_MS).unref();
}

function scheduleTeamRefresh() {
    if (PROJECTS_REFRESH_MS <= 0) return;
    setInterval(() => {
        refreshTeamSnapshot(true).catch(() => {});
    }, PROJECTS_REFRESH_MS).unref();
}

if (process.env.TRUST_PROXY) {
    app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : Number(process.env.TRUST_PROXY) || 0);
}

if (!isProd) {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

app.disable('x-powered-by');

app.use(
    helmet({
        crossOriginResourcePolicy: { policy: 'same-origin' },
        hsts: isProd ? undefined : false
    })
);

{
    const cspDirectives = {
        defaultSrc: ["'self'"],
        scriptSrc: [
            "'self'",
            'https://cdnjs.cloudflare.com',
            "'unsafe-inline'"
        ],
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: [
            "'self'",
            'https://fonts.googleapis.com',
            'https://cdnjs.cloudflare.com',
            "'unsafe-inline'"
        ],
        imgSrc: [
            "'self'",
            'data:',
            'https://placehold.co',
            'https://source.unsplash.com',
            'https://images.unsplash.com',
            'https://opengraph.githubassets.com',
            'https://avatars.githubusercontent.com',
            'https://repository-images.githubusercontent.com',
            'https://githubusercontent.com',
            'https://user-images.githubusercontent.com'
        ],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"]
    };
    if (isProd) cspDirectives.upgradeInsecureRequests = [];
    else cspDirectives.upgradeInsecureRequests = null;

    app.use(
        helmet.contentSecurityPolicy({
            useDefaults: true,
            directives: cspDirectives
        })
    );
}

app.use(helmet.referrerPolicy({ policy: 'strict-origin-when-cross-origin' }));
app.use(helmet.frameguard({ action: 'sameorigin' }));
app.use(helmet.crossOriginOpenerPolicy({ policy: 'same-origin' }));

app.use((req, res, next) => {
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    next();
});

if (isProd) {
    app.use(
        helmet.hsts({
            maxAge: 15552000,
            includeSubDomains: true,
            preload: false
        })
    );
}

app.use(compression({ threshold: 1024 }));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false
});
app.use(limiter);

app.use(express.static(path.join(__dirname, 'public'), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache');
        } else if (/\.(css|js)$/.test(filePath)) {
            res.setHeader('Cache-Control', 'public, max-age=604800');
        } else if (/\.(png|jpe?g|gif|svg|webp|ico)$/.test(filePath)) {
            res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
        }
    }
}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

try {
    const pkg = require('./package.json');
    app.locals.assetVersion = (pkg && pkg.version) ? pkg.version : Date.now().toString();
} catch {
    app.locals.assetVersion = Date.now().toString();
}

// Pre-warm release data so the first /projects render is fast, then keep it fresh on an interval
refreshReleaseSnapshot(true).catch(() => {});
scheduleReleaseRefresh();
refreshProjectsSnapshot(true).catch(() => {});
scheduleProjectsRefresh();
refreshTeamSnapshot(true).catch(() => {});
scheduleTeamRefresh();

app.get('/', (req, res) => {
    res.render('index', { title: 'Welcome to Skypixel!' });
});

app.get('/projects', async (req, res, next) => {
    try {
        const [releaseVersions, projectsData] = await Promise.all([
            refreshReleaseSnapshot(),
            refreshProjectsSnapshot()
        ]);
        res.render('projects', {
            title: 'Our Projects - Skypixel',
            releaseVersions,
            projectsData,
            githubUsername: GITHUB_USERNAME
        });
    } catch (error) {
        next(error);
    }
});

app.get('/about', (req, res) => {
    refreshTeamSnapshot()
        .then((teamData) => {
            res.render('about', {
                title: 'About Us - Skypixel',
                teamData
            });
        })
        .catch(() => {
            res.render('about', {
                title: 'About Us - Skypixel',
                teamData: { members: [], categories: { creator: [], contributors: [] } }
            });
        });
});

app.use((req, res) => {
    res.status(404).send('Not Found');
});

app.use((err, req, res, _next) => {
    console.error('Server Error:', {
        message: err.message,
        stack: isProd ? undefined : err.stack,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
    });
    res.status(err.status || 500).send(isProd ? 'Internal Server Error' : err.message);
});

const server = app.listen(PORT, () => {
    console.log(`
🚀 Skypixel Server Started Successfully`);
    console.log(`📍 Environment: ${isProd ? 'Production' : 'Development'}`);
    console.log(`🌐 Server: http://localhost:${PORT}`);
    console.log(`⏰ Started at: ${new Date().toISOString()}\n`);
});

process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing server gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
