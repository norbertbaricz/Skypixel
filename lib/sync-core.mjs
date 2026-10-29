// Shared Node / Worker engine. Requests are sequential and reserve budget first.
export const SYNC_DEFAULTS = Object.freeze({
    cacheTtlMs: 10 * 60 * 1000,
    releaseTtlMs: 6 * 60 * 60 * 1000,
    missingReleaseTtlMs: 6 * 60 * 60 * 1000,
    timeoutMs: 7000,
    maxSyncMs: 20000,
    retryDelayMs: 60000,
    maxRetryDelayMs: 60 * 60 * 1000,
    hourlyBudget: 40,
    upstreamReserve: 5,
    maxDetailsPerSync: 5,
    maxLogosPerSync: 2,
    logoTtlMs: 7 * 24 * 60 * 60 * 1000,
    maxConditionalEntries: 500,
    maxDiskBytes: 8 * 1024 * 1024,
    apiRoot: 'https://api.github.com',
    schemaVersion: 2
});
export function createCatalogService(options) {
    const { catalog: C, fallback, storage = null, token = '' } = options;
    const config = { ...SYNC_DEFAULTS, username: C.CONFIG.githubUsername, ...options.config };
    const now = options.now || Date.now;
    const fetcher = options.fetch || globalThis.fetch;
    let snapshot = {
        projects: C.buildCatalog(fallback.repositories, fallback.releases, config.username),
        syncedAt: fallback.fetchedAt, source: 'snapshot',
        contributors: [{ login: config.username, name: C.CONFIG.creatorName, role: 'Creator' }]
    };
    const endpoints = new Map();
    let budget = { attempts: [] };
    let lastAttemptAt = 0, lastSuccessAt = null, retryAt = 0, failures = 0;
    let inFlight = null, refreshing = false, initialized = false, persistent = Boolean(storage), lastError = null;
    let storageReadFailed = false, deadline = Infinity;
    let rateLimit = { remaining: null, limit: null, resetAt: null };
    const ready = (async () => {
        if (!storage) return;
        try {
            const saved = await storage.read();
            if (!saved || saved.schema !== config.schemaVersion || saved.username?.toLowerCase() !== config.username.toLowerCase()) return;
            if (Array.isArray(saved.snapshot?.projects) && saved.snapshot.projects.every(p => typeof p.name === 'string' && typeof p.htmlUrl === 'string')) {
                snapshot = { ...saved.snapshot, projects: saved.snapshot.projects.map(project => C.applyPresentationOverrides(project, config.username)), source: storage.source || 'persistent-cache', contributors: [{ login: config.username, name: C.CONFIG.creatorName, role: 'Creator' }] };
                lastSuccessAt = Number(saved.lastSuccessAt) || null;
            }
            lastAttemptAt = Number(saved.lastAttemptAt) || 0;
            retryAt = Number(saved.retryAt) || 0;
            failures = Number(saved.failures) || 0;
            lastError = typeof saved.lastError === 'string' ? saved.lastError : null;
            if (Array.isArray(saved.budget?.attempts)) budget.attempts = saved.budget.attempts.filter(t => Number.isFinite(t) && t > now() - 3600000 && t <= now());
            if (saved.rateLimit) rateLimit = saved.rateLimit;
            for (const [key, value] of (saved.endpoints || []).slice(-config.maxConditionalEntries)) endpoints.set(key, value);
        } catch { persistent = false; storageReadFailed = true; lastError = 'CACHE_UNAVAILABLE'; }
    })().finally(() => { initialized = true; });
    function exportState() {
        return { schema: config.schemaVersion, username: config.username, snapshot, lastAttemptAt, lastSuccessAt, retryAt, failures, lastError, rateLimit, budget, endpoints: [...endpoints] };
    }
    async function persist(required = false) {
        if (!storage || (storage.strict && storageReadFailed)) return;
        try { await storage.write(exportState()); persistent = true; }
        catch {
            persistent = false;
            // Shared hosted state must never spend unrecorded quota.
            if (required && storage.strict) throw Object.assign(new Error('Cannot reserve shared budget'), { code: 'CACHE_UNAVAILABLE' });
        }
    }
    function pruneBudget() { budget.attempts = budget.attempts.filter(time => time > now() - 3600000); }
    function quotaError(code, until) {
        retryAt = Math.max(retryAt, until);
        return Object.assign(new Error(code), { code });
    }
    async function request(resource) {
        if (storage?.strict && storageReadFailed) throw Object.assign(new Error('Shared state unreadable'), { code: 'CACHE_UNAVAILABLE' });
        if (now() >= deadline) throw Object.assign(new Error('Continue enrichment on the next refresh'), { code: 'GITHUB_SYNC_DEFERRED' });
        if (now() < retryAt) throw Object.assign(new Error('Cooling down'), { code: 'GITHUB_COOLDOWN' });
        pruneBudget();
        if (budget.attempts.length >= config.hourlyBudget) throw quotaError('GITHUB_BUDGET_PAUSED', budget.attempts[0] + 3600000 + 1000);
        const upstreamReset = Date.parse(rateLimit.resetAt) || 0;
        if (upstreamReset > 0 && upstreamReset <= now()) rateLimit.remaining = null;
        if (rateLimit.remaining !== null && rateLimit.remaining <= config.upstreamReserve) throw quotaError('GITHUB_BUDGET_PAUSED', upstreamReset || now() + 3600000);
        budget.attempts.push(now());
        if (rateLimit.remaining !== null) rateLimit.remaining = Math.max(0, rateLimit.remaining - 1);
        await persist(true);
        const cached = endpoints.get(resource);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
        try {
            const response = await fetcher(`${config.apiRoot}${resource}`, {
                headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Skypixel-Framework', 'X-GitHub-Api-Version': '2022-11-28', ...(cached?.etag ? { 'If-None-Match': cached.etag } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                signal: controller.signal
            });
            const header = name => response.headers?.get?.(name);
            const remaining = header('x-ratelimit-remaining'), limit = header('x-ratelimit-limit'), reset = Number(header('x-ratelimit-reset'));
            if (remaining != null && Number.isFinite(Number(remaining))) rateLimit.remaining = Number(remaining);
            if (limit != null && Number.isFinite(Number(limit))) rateLimit.limit = Number(limit);
            if (reset > 0) rateLimit.resetAt = new Date(reset * 1000).toISOString();
            else if (rateLimit.remaining !== null && !rateLimit.resetAt) rateLimit.resetAt = new Date(now() + 3600000).toISOString();
            if (response.status === 304 && cached) { cached.checkedAt = now(); return cached.data; }
            if (response.status === 404) { remember(resource, { data: null, etag: null, checkedAt: now() }); return null; }
            if (!response.ok) {
                const code = response.status === 403 || response.status === 429 ? 'GITHUB_RATE_LIMIT' : 'GITHUB_REQUEST_FAILED';
                if (code === 'GITHUB_RATE_LIMIT') {
                    const retry = header('retry-after');
                    const retryTime = retry ? (Number.isFinite(Number(retry)) ? now() + Number(retry) * 1000 : Date.parse(retry)) : 0;
                    retryAt = Math.max(retryAt, now() + backoff(), retryTime || 0, remaining === '0' && reset ? reset * 1000 + 1000 : 0);
                }
                throw Object.assign(new Error(`GitHub ${response.status}`), { status: response.status, code });
            }
            let data = await response.json();
            // Keep only presentation fields. Raw API payloads are much larger.
            if (resource.startsWith('/users/') && Array.isArray(data)) data = data.map(repo => ({
                id: repo.id, name: repo.name, full_name: repo.full_name, owner: { login: repo.owner?.login },
                private: repo.private, description: repo.description, html_url: repo.html_url,
                homepage: repo.homepage, language: repo.language, stargazers_count: repo.stargazers_count,
                forks_count: repo.forks_count, archived: repo.archived, fork: repo.fork,
                pushed_at: repo.pushed_at, updated_at: repo.updated_at, created_at: repo.created_at,
                topics: repo.topics, default_branch: repo.default_branch, license: repo.license
            }));
            if (resource.endsWith('/releases/latest')) data = C.normalizeRelease(data);
            if (resource.includes('/git/trees/')) {
                const parts = resource.split('/');
                const repo = { owner: { login: decodeURIComponent(parts[2]) }, name: decodeURIComponent(parts[3]), default_branch: decodeURIComponent(parts[6].split('?')[0]) };
                // Never persist entire source trees: only the selected, validated image URL.
                data = { logo: C.chooseRepositoryLogo(repo, data) };
            }
            remember(resource, { data, etag: header('etag'), checkedAt: now() });
            return data;
        } finally { clearTimeout(timeout); }
    }
    function remember(key, value) {
        if (!endpoints.has(key) && endpoints.size >= config.maxConditionalEntries) endpoints.delete(endpoints.keys().next().value);
        endpoints.set(key, value);
    }
    function backoff() { return Math.min(config.maxRetryDelayMs, config.retryDelayMs * 2 ** Math.min(failures, 6)); }
    async function loadRepositories() {
        const repos = new Map();
        for (let page = 1; page <= C.CONFIG.maxPages; page++) {
            const batch = await request(`/users/${encodeURIComponent(config.username)}/repos?type=owner&sort=updated&per_page=${C.CONFIG.pageSize}&page=${page}`);
            if (!Array.isArray(batch)) throw Object.assign(new Error('Invalid repository response'), { code: 'INVALID_GITHUB_RESPONSE' });
            for (const repo of batch) if (!repo.private && repo.owner?.login?.toLowerCase() === config.username.toLowerCase()) repos.set(repo.id ?? repo.full_name ?? repo.name, repo);
            if (batch.length < C.CONFIG.pageSize) return [...repos.values()];
        }
        throw Object.assign(new Error('Pagination limit reached'), { code: 'GITHUB_PAGINATION_LIMIT' });
    }
    function refreshProjects(force = false) {
        if (inFlight) return inFlight;
        inFlight = (async () => {
            await ready;
            if (now() < retryAt || (!force && lastAttemptAt && now() - lastAttemptAt < config.cacheTtlMs)) return;
            lastAttemptAt = now(); refreshing = true; deadline = now() + config.maxSyncMs;
            try {
                const repos = await loadRepositories();
                const previous = new Map(snapshot.projects.map(p => [p.name, p]));
                const releases = Object.fromEntries(snapshot.projects.map(p => [p.name, p.release]));
                const pathFor = repo => `/repos/${encodeURIComponent(config.username)}/${encodeURIComponent(repo.name)}/releases/latest`;
                const due = repos.filter(repo => {
                    const cached = endpoints.get(pathFor(repo));
                    const ttl = cached?.data ? config.releaseTtlMs : config.missingReleaseTtlMs;
                    return !cached || now() - cached.checkedAt >= ttl;
                }).sort((a, b) => (endpoints.get(pathFor(a))?.checkedAt || 0) - (endpoints.get(pathFor(b))?.checkedAt || 0) || Number(previous.has(a.name)) - Number(previous.has(b.name)) || a.name.localeCompare(b.name));
                let detailError = null;
                for (const repo of due.slice(0, config.maxDetailsPerSync)) {
                    try { releases[repo.name] = await request(pathFor(repo)); }
                    catch (error) { detailError = error; break; }
                }
                const logoPath = repo => `/repos/${encodeURIComponent(config.username)}/${encodeURIComponent(repo.name)}/git/trees/${encodeURIComponent(repo.default_branch || 'HEAD')}?recursive=1`;
                const logoDue = repos.filter(repo => !C.configuredLogo({ name: repo.name, fullName: repo.full_name }) && (!endpoints.has(logoPath(repo)) || now() - endpoints.get(logoPath(repo)).checkedAt >= config.logoTtlMs))
                    .sort((a,b) => (endpoints.get(logoPath(a))?.checkedAt || 0) - (endpoints.get(logoPath(b))?.checkedAt || 0) || a.name.localeCompare(b.name));
                if (!detailError) for (const repo of logoDue.slice(0, config.maxLogosPerSync)) {
                    try { await request(logoPath(repo)); }
                    catch (error) { detailError = error; break; }
                }
                const logoResults = new Map(repos.map(repo => [repo.name, endpoints.get(logoPath(repo))]));
                const projects = C.buildCatalog(repos, releases, config.username).map(project => {
                    const result = logoResults.get(project.name);
                    return { ...project, logo: result ? result.data?.logo || null : previous.get(project.name)?.logo || null };
                });
                snapshot = { projects, syncedAt: new Date(now()).toISOString(), source: 'github', contributors: [{ login: config.username, name: C.CONFIG.creatorName, role: 'Creator' }] };
                lastSuccessAt = now();
                lastError = detailError?.code || null;
                if (detailError) { retryAt = Math.max(retryAt, now() + backoff()); failures++; }
                else { failures = 0; retryAt = 0; }
            } catch (error) {
                lastError = error.code || (error.name === 'AbortError' ? 'GITHUB_TIMEOUT' : 'GITHUB_UNAVAILABLE');
                retryAt = Math.max(retryAt, now() + backoff()); failures++;
                snapshot = { ...snapshot, source: 'cached' };
            }
            await persist();
        })().finally(() => { inFlight = null; refreshing = false; });
        inFlight = inFlight.then(() => getSnapshot());
        return inFlight;
    }
    function getStatus() {
        pruneBudget();
        return {
            state: refreshing ? 'syncing' : lastError ? 'degraded' : snapshot.source === 'github' ? 'ready' : 'cached',
            initialized, syncing: refreshing, source: snapshot.source,
            lastAttemptAt: lastAttemptAt ? new Date(lastAttemptAt).toISOString() : null,
            lastSuccessfulSyncAt: lastSuccessAt ? new Date(lastSuccessAt).toISOString() : null,
            nextRefreshAt: new Date(Math.max(retryAt, lastAttemptAt ? lastAttemptAt + config.cacheTtlMs : now())).toISOString(),
            stale: !lastSuccessAt || now() - lastSuccessAt > config.cacheTtlMs,
            error: lastError, rateLimit: { ...rateLimit }, persistentCache: persistent,
            budget: { used: budget.attempts.length, limit: config.hourlyBudget, windowMs: 3600000 },
            refreshIntervalMs: config.cacheTtlMs
        };
    }
    function getSnapshot() { return { ...snapshot, stats: C.getStats(snapshot.projects), releases: C.getReleases(snapshot.projects), sync: getStatus() }; }
    return { ready, refreshProjects, getSnapshot, getStatus, loadRepositories, exportState };
}
