const express = require('express');
const path = require('path');
const https = require('https');
const morgan = require('morgan');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

const projectReleaseRepos = {
    puro: 'norbertbaricz/Puro',
    serverLauncher: 'norbertbaricz/Server-Launcher',
    skypixelWebsite: 'norbertbaricz/Skypixel',
    dakotaAc: 'norbertbaricz/DakotaAC'
};

const releaseCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes cache
function fetchFromGitHub(url) {
    return new Promise((resolve, reject) => {
        const request = https.request(
            url,
            {
                method: 'GET',
                headers: {
                    Accept: 'application/vnd.github.v3+json',
                    'User-Agent': 'Skypixel-App'
                },
                timeout: 7000
            },
            res => {
                let rawData = '';
                res.setEncoding('utf8');
                res.on('data', chunk => {
                    rawData += chunk;
                });
                res.on('end', () => {
                    if (res.statusCode && res.statusCode >= 400) {
                        const error = new Error(`GitHub responded with status ${res.statusCode}`);
                        error.statusCode = res.statusCode;
                        error.body = rawData;
                        reject(error);
                        return;
                    }
                    try {
                        const data = rawData ? JSON.parse(rawData) : {};
                        resolve(data);
                    } catch (parseError) {
                        reject(parseError);
                    }
                });
            }
        );

        request.on('timeout', () => {
            request.destroy(new Error('GitHub request timed out'));
        });
        request.on('error', reject);
        request.end();
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
        if (error.statusCode === 404) {
            return null;
        }
        if (!isProd) {
            console.error(`Failed to load release for ${repo}:`, error.message || error);
        }
        return null;
    }
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
            'https://images.unsplash.com'
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

app.get('/', (req, res) => {
    res.render('index', { title: 'Welcome to Skypixel!' });
});

app.get('/projects', async (req, res, next) => {
    try {
        const releaseVersions = await loadProjectReleases();
        res.render('projects', {
            title: 'Our Projects - Skypixel',
            releaseVersions
        });
    } catch (error) {
        next(error);
    }
});

app.get('/about', (req, res) => {
    res.render('about', { title: 'About Us - Skypixel' });
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
