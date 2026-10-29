import 'dotenv/config';
import { fileURLToPath } from 'node:url';
import express from 'express';
import path from 'path';
import morgan from 'morgan';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import nodemailer from 'nodemailer';
import github from './lib/github.js';
const { ready, refreshProjects, getSnapshot, getStatus } = github;
import projectApi from './lib/project-api.js';
const { listProjects, listReleases, sendCatalogJson } = projectApi;
import rendering from './lib/render.js';
const { viewData } = rendering;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Easy-to-tune server configuration. Secrets belong only in .env.
const PORT_ARGUMENT_INDEX = process.argv.indexOf('--port');
const PORT = Number(process.env.PORT) || (PORT_ARGUMENT_INDEX >= 0 ? Number(process.argv[PORT_ARGUMENT_INDEX + 1]) : 0) || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const REFRESH_MS = Number(process.env.PROJECTS_REFRESH_MS) || 10 * 60 * 1000;
const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_MAX_REQUESTS = 300;
const CONTACT_MAX_REQUESTS = 5;
const CONTACT_MAX_MESSAGE_LENGTH = 5000;
const CONTACT_RECIPIENT = process.env.CONTACT_TO || process.env.SMTP_USER;
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
const SHUTDOWN_TIMEOUT_MS = 10000;
const ASSET_CACHE_SECONDS = 86400;

const app = express();
app.disable('x-powered-by');
if (process.env.TRUST_PROXY) app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : Number(process.env.TRUST_PROXY) || 0);
app.use(morgan(IS_PRODUCTION ? 'combined' : 'dev'));
app.use(helmet({
    hsts: IS_PRODUCTION ? undefined : false,
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"], scriptSrc: ["'self'"], scriptSrcAttr: ["'none'"],
            styleSrc: ["'self'", "'unsafe-inline'"], fontSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https://avatars.githubusercontent.com', 'https://raw.githubusercontent.com'],
            connectSrc: ["'self'"], objectSrc: ["'none'"],
            upgradeInsecureRequests: IS_PRODUCTION ? [] : null
        }
    }
}));
app.use((_req, res, next) => {
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    next();
});
app.use(compression({ threshold: 1024 }));
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: IS_PRODUCTION ? ASSET_CACHE_SECONDS * 1000 : 0,
    setHeaders: res => { if (!IS_PRODUCTION) res.setHeader('Cache-Control', 'no-store'); }
}));
app.use(rateLimit({ windowMs: RATE_WINDOW_MS, limit: RATE_MAX_REQUESTS, standardHeaders: 'draft-8', legacyHeaders: false }));
app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: false, limit: '20kb' }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

for (const [route, page] of [['/', 'index'], ['/projects', 'projects'], ['/updates', 'updates'], ['/about', 'about']]) {
    app.get(route, (_req, res) => {
        refreshProjects().catch(() => {});
        res.render(page, viewData(page, getSnapshot()));
    });
}


// Serve cached data immediately; all refreshes share one bounded background job.
app.get('/api/projects', async (req, res, next) => {
    try {
        await ready;
        refreshProjects().catch(() => {});
        return sendCatalogJson(req, res, listProjects(getSnapshot(), req.query));
    } catch (error) { next(error); }
});
app.get('/api/projects/:name', async (req, res, next) => {
    try {
        await ready;
        refreshProjects().catch(() => {});
        const snapshot = getSnapshot();
        const project = snapshot.projects.find(item => item.name.toLowerCase() === req.params.name.toLowerCase());
        if (!project) return res.status(404).json({ ok: false, message: 'Project not found.' });
        return sendCatalogJson(req, res, { project, syncedAt: snapshot.syncedAt, sync: snapshot.sync });
    } catch (error) { next(error); }
});
app.get('/api/releases', async (req, res, next) => {
    try { await ready; refreshProjects().catch(() => {}); return sendCatalogJson(req, res, listReleases(getSnapshot(), req.query)); }
    catch (error) { next(error); }
});
app.get('/api/status', async (_req, res) => { await ready; res.setHeader('Cache-Control', 'no-store'); res.json({ ok: true, catalog: getStatus() }); });
app.get('/health', (_req, res) => res.json({ ok: true, service: 'skypixel', github: getStatus().state }));

const contactLimiter = rateLimit({ windowMs: RATE_WINDOW_MS, limit: CONTACT_MAX_REQUESTS, standardHeaders: 'draft-8', legacyHeaders: false, message: { ok: false, message: 'Please wait before sending another message.' } });
app.post('/contact', contactLimiter, async (req, res) => {
    const { name, email, message, website } = req.body || {};
    const wantsJson = req.accepts(['html', 'json']) === 'json' || req.get('x-requested-with') === 'XMLHttpRequest';
    function reply(status, ok, text) {
        if (wantsJson) return res.status(status).json({ ok, message: text });
        return res.redirect(`/?${ok ? 'sent=1' : 'error=1'}#contact`);
    }
    if (website) return reply(200, true, 'Message sent successfully.');
    if (typeof name !== 'string' || !name.trim() || name.length > 100 || /[\r\n]/.test(name) || typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof message !== 'string' || !message.trim() || message.length > CONTACT_MAX_MESSAGE_LENGTH) {
        return reply(400, false, 'Enter a name, valid email, and a message of up to 5,000 characters.');
    }
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return reply(503, false, 'Email is unavailable. Please contact us through GitHub.');
    try {
        const transport = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: SMTP_PORT, secure: SMTP_PORT === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }, connectionTimeout: 10000, socketTimeout: 15000 });
        await transport.sendMail({ from: process.env.SMTP_USER, to: CONTACT_RECIPIENT, replyTo: email.trim(), subject: `Skypixel Contact: ${name.trim()}`, text: `From: ${name.trim()} <${email.trim()}>\n\n${message.trim()}` });
        return reply(200, true, 'Message sent successfully.');
    } catch (error) {
        console.error('Contact delivery failed:', error.message);
        return reply(502, false, 'Your message could not be delivered. Please try again later.');
    }
});

app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ ok: false, message: 'API route not found.' });
    next();
});
app.use((_req, res) => res.status(404).render('error', { ...viewData('error', getSnapshot()), code: '404', errorTitle: 'This path is still unexplored.', errorMessage: 'The page you are looking for could not be found.' }));
app.use((error, req, res, _next) => {
    console.error('Server error:', error.message);
    if (req.path.startsWith('/api/')) return res.status(error.status || 500).json({ ok: false, message: 'The request could not be completed.' });
    res.status(error.status || 500).render('error', { ...viewData('error', getSnapshot()), code: String(error.status || 500), errorTitle: 'A small detour.', errorMessage: 'Something went wrong. Please try again in a moment.' });
});

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] || '')) {
    refreshProjects().catch(() => {});
    const refreshTimer = setInterval(() => refreshProjects(true).catch(() => {}), REFRESH_MS);
    refreshTimer.unref();
    const server = app.listen(PORT, '0.0.0.0', () => console.log(`Skypixel Framework is running on port ${PORT}`));
    function shutdown() {
        clearInterval(refreshTimer);
        server.close(() => process.exit(0));
        setTimeout(() => process.exit(1), SHUTDOWN_TIMEOUT_MS).unref();
    }
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
}
export default app;
