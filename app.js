// Importăm modulele necesare
const express = require('express');
const path = require('path');
const fs = require('fs');
const morgan = require('morgan');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Inițializăm aplicația Express
const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

// Opțional: permite configurarea trust proxy în producție (ex: dacă rulează în spatele unui proxy/revers-proxy)
if (process.env.TRUST_PROXY) {
    app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : Number(process.env.TRUST_PROXY) || 0);
}

// Folosim morgan pentru a loga cererile HTTP în consolă
if (!isProd) {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// Basic hardening & securitate
app.disable('x-powered-by');

// Helmet pentru header-e de securitate
app.use(
    helmet({
        crossOriginResourcePolicy: { policy: 'same-origin' },
        hsts: isProd ? undefined : false
    })
);

// Content Security Policy (relaxat pentru a nu rupe UI-ul existent)
{
    const cspDirectives = {
        defaultSrc: ["'self'"],
        scriptSrc: [
            "'self'",
            'https://cdnjs.cloudflare.com',
            // permite onerror handlers inline din <img>, etc. (poate fi înăsprit ulterior)
            "'unsafe-inline'"
        ],
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: [
            "'self'",
            'https://fonts.googleapis.com',
            'https://cdnjs.cloudflare.com',
            // există atribute style inline în markup
            "'unsafe-inline'"
        ],
        imgSrc: [
            "'self'",
            'data:',
            'https://placehold.co',
            // pentru background aleator Unsplash
            'https://source.unsplash.com',
            'https://images.unsplash.com'
        ],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"]
    };
    // Upgrade-Insecure-Requests doar în producție
    if (isProd) cspDirectives.upgradeInsecureRequests = [];
    else cspDirectives.upgradeInsecureRequests = null;

    app.use(
        helmet.contentSecurityPolicy({
            useDefaults: true,
            directives: cspDirectives
        })
    );
}

// Alte header-e utile
app.use(helmet.referrerPolicy({ policy: 'strict-origin-when-cross-origin' }));
app.use(helmet.frameguard({ action: 'sameorigin' }));
app.use(helmet.crossOriginOpenerPolicy({ policy: 'same-origin' }));

// Permissions-Policy minimal (dezactivăm capabilități nefolosite)
app.use((req, res, next) => {
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    next();
});

// Activează HSTS doar în producție (necesită HTTPS)
if (isProd) {
    app.use(
        helmet.hsts({
            maxAge: 15552000, // ~180 zile
            includeSubDomains: true,
            preload: false
        })
    );
}

// Compresie pentru răspunsuri text (HTML, CSS, JS, JSON)
app.use(compression({ threshold: 1024 }));

// Rate limiting simplu pentru a atenua abuzuri
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false
});
app.use(limiter);

// Setăm directorul 'public' pentru a servi fișiere statice (CSS, JS, imagini)
// Serverul va căuta fișierele cerute la căi precum '/css/style.css' în directorul 'public/css/style.css'
app.use(express.static(path.join(__dirname, 'public'), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache');
        } else if (/\.(css|js)$/.test(filePath)) {
            // Nu marcăm immutable deoarece fișierele nu sunt fingerprinted (nume cu hash)
            res.setHeader('Cache-Control', 'public, max-age=604800'); // 7 days
        } else if (/\.(png|jpe?g|gif|svg|webp|ico)$/.test(filePath)) {
            res.setHeader('Cache-Control', 'public, max-age=2592000, immutable'); // 30 days
        }
    }
}));

// Setăm EJS ca motor de template
app.set('view engine', 'ejs');
// Setăm directorul unde se găsesc fișierele .ejs
app.set('views', path.join(__dirname, 'views'));

// Versiune asset pentru busting cache (din package.json)
try {
    const pkg = require('./package.json');
    app.locals.assetVersion = (pkg && pkg.version) ? pkg.version : Date.now().toString();
} catch {
    app.locals.assetVersion = Date.now().toString();
}

// --- Rutele aplicației ---

// Ruta pentru pagina principală (Home)
app.get('/', (req, res) => {
    // Randează fișierul 'views/index.ejs' și îi trimite o variabilă 'title'
    res.render('index', { title: 'Welcome to Skypixel!' });
});

// Ruta pentru pagina de proiecte (Projects)
app.get('/projects', (req, res) => {
    // Randează fișierul 'views/projects.ejs'
    res.render('projects', { title: 'Our Projects - Skypixel' });
});

// Ruta pentru pagina despre noi (About Us)
app.get('/about', (req, res) => {
    // Randează fișierul 'views/about.ejs'
    res.render('about', { title: 'About Us - Skypixel' });
});

app.get('/serverlauncher', (req, res) => {
    const filePath = path.join(__dirname, 'views', 'serverlauncher.html');
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send('Server Launcher page not found.');
    }
});

// Handler generic 404
app.use((req, res) => {
    res.status(404).send('Not Found');
});

// Handler erori (fără a expune stack în producție)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    if (process.env.NODE_ENV !== 'production') {
        console.error(err);
    }
    res.status(500).send('Internal Server Error');
});


// --- Pornirea serverului ---
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
