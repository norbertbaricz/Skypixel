'use strict';

// Easy-to-tune settings. Effects remain bounded and respect device preferences.
const UI_CONFIG = Object.freeze({
    revealThreshold: 0.06,
    revealMargin: '0px 0px -12px 0px',
    revealStaggerMs: 50,
    toastMs: 2800,
    serverFollowUpMs: 20000,
    cacheKeyPrefix: 'skypixel-hub-v6:'
});

(function () {
    const C = window.SkypixelCatalog;
    if (!C) return;
    const { icon, escapeHtml: esc, safeUrl, formatDate } = C;
    const root = document.documentElement;
    const username = document.body.dataset.username || C.CONFIG.githubUsername;
    const isStatic = document.body.dataset.static === 'true';
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const cacheKey = UI_CONFIG.cacheKeyPrefix + username + ':' + document.body.dataset.version;
    const dialog = document.getElementById('project-dialog');
    const nativeDialog = typeof dialog?.showModal === 'function';
    let fallbackBackdrop = null;
    let snapshot;
    try { snapshot = JSON.parse(document.getElementById('catalog-data').textContent); }
    catch { snapshot = { projects: [], syncedAt: null, source: 'snapshot' }; }
    let lastTrigger = null;
    let toastTimer;
    let syncing = false;
    let lastAttempt = 0;
    let followUpTimer;

    function toast(message) {
        const element = document.querySelector('.toast');
        clearTimeout(toastTimer);
        element.textContent = message;
        element.classList.add('visible');
        toastTimer = setTimeout(() => element.classList.remove('visible'), UI_CONFIG.toastMs);
    }
    const observer = 'IntersectionObserver' in window && !reducedMotion.matches ? new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
        });
    }, { threshold: UI_CONFIG.revealThreshold, rootMargin: UI_CONFIG.revealMargin }) : null;
    function reveal(scope = document) {
        scope.querySelectorAll('.reveal:not(.will-reveal)').forEach((element,index) => {
            if (observer && !reducedMotion.matches) {
                element.classList.add('will-reveal');
                element.style.transitionDelay = `${Math.min(index % 3, 2) * UI_CONFIG.revealStaggerMs}ms`;
                observer.observe(element);
            } else element.classList.add('is-visible');
        });
    }
    reveal();
    if (navigator.connection?.saveData || (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4)) root.classList.add('effects-lite');
    reducedMotion.addEventListener?.('change', event => {
        if (event.matches) document.querySelectorAll('.will-reveal').forEach(element => { observer?.unobserve(element); element.classList.add('is-visible'); });
    });
    function disposeReveals(scope) { scope.querySelectorAll('.reveal').forEach(element => observer?.unobserve(element)); }

    function projectSymbol(project) { return C.projectIdentity(project, true); }
    function renderCard(project) {
        const name = esc(project.name), title = esc(project.title);
        return `<article class="project-card reveal" data-project-card="${name}" data-category="${esc(project.category)}"><div class="card-heading">${C.projectIdentity(project)}<div><span class="card-category">${esc(project.category)}${project.archived ? ' · Archived' : project.fork ? ' · Fork' : ''}</span><h3>${title}</h3></div></div><p class="card-description">${esc(project.summary)}</p><div class="card-meta"><span>${esc(project.language)}</span>${project.release ? `<span>${esc(project.release.tag)}</span>` : ''}</div><div class="card-actions"><button class="button button-card" type="button" data-open-project="${name}" aria-label="View ${title} details">View details ${icon('right')}</button><a class="card-source icon-button" href="${esc(safeUrl(project.htmlUrl))}" target="_blank" rel="noopener noreferrer" aria-label="View ${title} on GitHub">${icon('github')}</a></div></article>`;
    }
    function recoverProjectImage(image) {
        if (image?.tagName !== 'IMG' || !image.classList.contains('project-logo-image')) return;
        image.hidden = true;
        const fallback = image.parentElement.querySelector('.project-logo-fallback');
        if (fallback) fallback.hidden = false;
    }
    document.addEventListener('error', event => recoverProjectImage(event.target), true);
    document.querySelectorAll('.project-logo-image').forEach(image => { if (image.complete && !image.naturalWidth) recoverProjectImage(image); });
    function formatBytes(value) {
        if (value < 1024) return `${value} B`;
        if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
        return `${(value / (1024 * 1024)).toFixed(1)} MB`;
    }
    function projectLinks(project) {
        return `<div class="dialog-actions"><a class="button button-gold" href="${esc(safeUrl(project.htmlUrl))}" target="_blank" rel="noopener noreferrer">${icon('github')} View repository ${icon('arrow')}</a><a class="button button-outline" href="${esc(safeUrl(project.release?.url || project.releasesUrl))}" target="_blank" rel="noopener noreferrer">${icon('download')}${project.release ? 'Release ' + esc(project.release.tag) : 'Browse releases'}</a>${project.homepage ? `<a class="button button-outline" href="${esc(safeUrl(project.homepage))}" target="_blank" rel="noopener noreferrer">Website ${icon('arrow')}</a>` : ''}</div>`;
    }
    function openProject(name, trigger) {
        const project = snapshot.projects.find(p => p.name === name);
        if (!project || !dialog || root.classList.contains('is-loading')) return;
        lastTrigger = trigger || document.activeElement;
        const clone = `git clone https://github.com/${username}/${project.name}.git`;
        const release = project.release;
        const assets = release?.assets || [];
        document.getElementById('dialog-content').innerHTML = `<div class="dialog-banner"><span class="dialog-badge">${esc(project.category)} / ${project.archived ? 'Archived repository' : project.fork ? 'Public fork' : 'Public repository'}</span><div class="dialog-project-heading"><span class="dialog-symbol">${projectSymbol(project)}</span><div><h2 id="dialog-title">${esc(project.title)}</h2><p>${esc(project.tagline)}</p></div></div><div class="dialog-stats"><span>${icon('code')}${esc(project.language)}</span><span>${icon('star')}${Number(project.stars) || 0} stars</span><span>${icon('fork')}${Number(project.forks) || 0} forks</span>${release ? `<span class="dialog-release">${esc(release.tag)}</span>` : ''}</div></div><div class="dialog-body"><div class="dialog-tabs" role="tablist" aria-label="Project details"><button id="overview-tab" type="button" role="tab" aria-selected="true" aria-controls="overview-panel" data-dialog-tab="overview">Overview</button><button id="setup-tab" type="button" role="tab" aria-selected="false" aria-controls="setup-panel" tabindex="-1" data-dialog-tab="setup">Getting started</button><button id="release-tab" type="button" role="tab" aria-selected="false" aria-controls="release-panel" tabindex="-1" data-dialog-tab="release">Release</button></div><div class="dialog-panel" id="overview-panel" role="tabpanel" aria-labelledby="overview-tab" tabindex="0"><p>${esc(project.overview)}</p>${project.features.length ? `<h3>What it brings</h3><ul class="feature-list">${project.features.map(feature => `<li>${icon('check')}${esc(feature)}</li>`).join('')}</ul>` : ''}<div class="stack-tags">${project.stack.map(item => `<span>${esc(item)}</span>`).join('')}</div><dl class="repository-facts"><div><dt>Last code update</dt><dd>${esc(formatDate(project.updatedAt))}</dd></div><div><dt>Default branch</dt><dd>${esc(project.branch || 'main')}</dd></div><div><dt>Repository type</dt><dd>${project.archived ? 'Archived' : project.fork ? 'Public fork' : 'Public source'}</dd></div><div><dt>License</dt><dd>${esc(project.license && project.license !== 'NOASSERTION' ? project.license : 'See repository terms')}</dd></div></dl></div><div class="dialog-panel" id="setup-panel" role="tabpanel" aria-labelledby="setup-tab" tabindex="0" hidden><p>${esc(project.gettingStarted)}</p><div class="clone-box"><code>${esc(clone)}</code><button class="icon-button" type="button" data-copy="${esc(clone)}" aria-label="Copy clone command">${icon('copy')}</button></div><a class="text-link dialog-readme" href="${esc(safeUrl(project.htmlUrl))}#readme" target="_blank" rel="noopener noreferrer">Read the documentation ${icon('arrow')}</a></div><div class="dialog-panel" id="release-panel" role="tabpanel" aria-labelledby="release-tab" tabindex="0" hidden>${release ? `<p><strong>${esc(release.title || release.tag)}</strong><br>Published ${esc(formatDate(release.publishedAt))}</p>${release.body ? `<div class="release-notes">${C.renderReleaseNotes(release.body, release.title)}</div>` : '<p class="dialog-updated">Read the full release notes on GitHub.</p>'}${assets.length ? `<h3>Release files</h3><div class="release-assets">${assets.map(asset => `<a href="${esc(safeUrl(asset.url))}" target="_blank" rel="noopener noreferrer">${icon('download')}<span>${esc(asset.name)}</span><small>${esc(formatBytes(asset.size || 0))} · ${Number(asset.downloads) || 0} downloads</small></a>`).join('')}</div>` : ''}` : '<p>No release information is available in this catalog. Check the repository for the latest published versions.</p>'}</div>${projectLinks(project)}<p class="dialog-updated">Repository updated ${esc(formatDate(project.updatedAt))}${snapshot.syncedAt ? ' · Catalog synced ' + esc(formatDate(snapshot.syncedAt)) : ''}</p></div>`;
        if (nativeDialog) {
            if (!dialog.open) dialog.showModal();
        } else {
            if (!fallbackBackdrop) {
                fallbackBackdrop = document.createElement('div');
                fallbackBackdrop.className = 'dialog-fallback-backdrop';
                fallbackBackdrop.addEventListener('click', closeProject);
                dialog.before(fallbackBackdrop);
            }
            fallbackBackdrop.hidden = false;
            dialog.classList.add('is-fallback');
            dialog.setAttribute('open', '');
            dialog.setAttribute('role', 'dialog');
            dialog.setAttribute('aria-modal', 'true');
            dialog.querySelector('button')?.focus();
        }
        dialog.querySelector('#dialog-content').scrollTop = 0;
        root.classList.add('dialog-open');
        document.body.classList.add('dialog-open');
    }
    function restoreDialogFocus() {
        root.classList.remove('dialog-open');
        document.body.classList.remove('dialog-open');
        if (lastTrigger?.isConnected) lastTrigger.focus({ preventScroll: true });
    }
    function closeProject() {
        if (!dialog?.hasAttribute('open')) return;
        if (nativeDialog) dialog.close();
        else {
            dialog.removeAttribute('open');
            if (fallbackBackdrop) fallbackBackdrop.hidden = true;
            restoreDialogFocus();
        }
    }
    dialog?.addEventListener('close', restoreDialogFocus);
    dialog?.addEventListener('click', event => {
        if (event.target !== dialog) return;
        const bounds = dialog.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeProject();
    });
    function selectDialogTab(tab, focus = false) {
        dialog.querySelectorAll('[data-dialog-tab]').forEach(button => {
            const active = button === tab;
            button.setAttribute('aria-selected', String(active)); button.tabIndex = active ? 0 : -1;
            document.getElementById(button.getAttribute('aria-controls')).hidden = !active;
        });
        if (focus) tab.focus();
    }
    dialog?.addEventListener('keydown', event => {
        if (!event.target.matches('[data-dialog-tab]') || !['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
        event.preventDefault();
        const tabs = [...dialog.querySelectorAll('[data-dialog-tab]')], index = tabs.indexOf(event.target);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowLeft' ? -1 : 1) + tabs.length) % tabs.length;
        selectDialogTab(tabs[next], true);
    });

    document.addEventListener('click', async event => {
        const opener = event.target.closest('[data-open-project]');
        if (opener) {
            openProject(opener.dataset.openProject, opener);
            if (opener.dataset.openTab === 'release' && dialog?.open) selectDialogTab(dialog.querySelector('[data-dialog-tab="release"]'));
            return;
        }
        if (event.target.closest('.dialog-close')) { closeProject(); return; }
        const tab = event.target.closest('[data-dialog-tab]');
        if (tab) { selectDialogTab(tab); return; }
        const copy = event.target.closest('[data-copy]');
        if (copy) {
            try { await navigator.clipboard.writeText(copy.dataset.copy); toast('Clone command copied.'); }
            catch {
                const range = document.createRange(); range.selectNodeContents(copy.previousElementSibling);
                const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
                toast('The command is selected. Copy it with your keyboard.');
            }
        }
    });
    const menuButton = document.querySelector('.menu-toggle'), mobileNav = document.getElementById('mobile-nav');
    function closeMenu(restoreFocus = false) {
        if (!menuButton || !mobileNav) return;
        const open = menuButton.getAttribute('aria-expanded') === 'true';
        menuButton.setAttribute('aria-expanded', 'false'); menuButton.setAttribute('aria-label', 'Open navigation'); mobileNav.hidden = true;
        if (restoreFocus && open) menuButton.focus();
    }
    menuButton?.addEventListener('click', () => {
        const expanded = menuButton.getAttribute('aria-expanded') !== 'true';
        menuButton.setAttribute('aria-expanded', String(expanded)); menuButton.setAttribute('aria-label', expanded ? 'Close navigation' : 'Open navigation'); mobileNav.hidden = !expanded;
    });
    document.addEventListener('click', event => {
        if (!event.target.closest('.site-header')) closeMenu();

    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            if (!nativeDialog) closeProject();
            closeMenu(true);

        }
    });
    const desktopMedia = window.matchMedia('(min-width: 851px)');
    if (desktopMedia.addEventListener) desktopMedia.addEventListener('change', () => closeMenu());
    else if (desktopMedia.addListener) desktopMedia.addListener(() => closeMenu());
    document.addEventListener('keydown', event => {
        if (nativeDialog || !dialog?.hasAttribute('open') || event.key !== 'Tab') return;
        const focusable = [...dialog.querySelectorAll('a[href],button:not([disabled]),[tabindex]')].filter(element => element.tabIndex >= 0 && element.getClientRects().length);
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (!first) return;
        if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    });

    function applySnapshot(next) {
        if (!next || !Array.isArray(next.projects)) return;
        const changed = JSON.stringify(snapshot.projects) !== JSON.stringify(next.projects);
        snapshot = next;
        const live = next.source === 'github' || (next.sync?.lastSuccessfulSyncAt && !next.sync.stale);
        document.querySelectorAll('[data-sync-status]').forEach(element => {
            element.classList.toggle('is-cached', !live);
            element.textContent = `${live ? 'Synced with GitHub' : 'Saved catalog'}${next.syncedAt ? ' · ' + formatDate(next.syncedAt) : ''}`;
        });
        window.Skypixel.snapshot = next;
        if (changed) document.dispatchEvent(new CustomEvent('skypixel:catalog', { detail: next }));
    }
    async function fetchJson(url) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), C.CONFIG.requestTimeoutMs);
        try {
            const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/vnd.github+json' } });
            if (!response.ok) { const error = new Error(`Request failed (${response.status})`); error.status = response.status; throw error; }
            return await response.json();
        } finally { clearTimeout(timeout); }
    }
    async function sync() {
        if (syncing || document.hidden || Date.now() - lastAttempt < C.CONFIG.refreshMs) return;
        syncing = true; lastAttempt = Date.now();
        try {
            const next = await fetchJson(document.body.dataset.api);
            applySnapshot(next);
            try { sessionStorage.setItem(cacheKey, JSON.stringify({ at: Date.now(), snapshot: next })); } catch { /* Storage may be unavailable. */ }
            if (!isStatic && next.sync?.syncing) {
                clearTimeout(followUpTimer);
                followUpTimer = setTimeout(() => { lastAttempt = 0; sync(); }, UI_CONFIG.serverFollowUpMs);
            }
        } catch { applySnapshot({ ...snapshot, source: 'cached' }); }
        finally { syncing = false; }
    }
    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
        const params = new URLSearchParams(location.search);
        if (params.has('sent') || params.has('error')) contactForm.querySelector('.contact-status').textContent = params.has('sent') ? 'Message sent successfully.' : 'Your message could not be delivered. Please try again.';
        contactForm.addEventListener('submit', async event => {
            event.preventDefault();
            const button = contactForm.querySelector('[type="submit"]'), status = contactForm.querySelector('.contact-status');
            button.disabled = true; status.textContent = 'Sending your message…';
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 25000);
                let response;
                try { response = await fetch('/contact', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, body: JSON.stringify(Object.fromEntries(new FormData(contactForm))), signal: controller.signal }); }
                finally { clearTimeout(timeout); }
                const data = await response.json(); status.textContent = data.message;
                if (data.ok) contactForm.reset();
            } catch { status.textContent = 'The message could not be sent. Please try again.'; }
            finally { button.disabled = false; }
        });
    }

    window.Skypixel = { snapshot, renderCard, openProject, reveal, disposeReveals, toast };
    try {
        const cached = JSON.parse(sessionStorage.getItem(cacheKey));
        if (cached?.snapshot?.projects && Date.now() - cached.at < C.CONFIG.refreshMs) { applySnapshot(cached.snapshot); lastAttempt = cached.at; }
        else applySnapshot(snapshot);
    } catch { applySnapshot(snapshot); }
    if (root.classList.contains('is-ready')) sync();
    else document.addEventListener('skypixel:ready', sync, { once: true });
    setInterval(sync, C.CONFIG.refreshMs);
    document.addEventListener('visibilitychange', () => { if (!document.hidden && root.classList.contains('is-ready')) sync(); });
}());
