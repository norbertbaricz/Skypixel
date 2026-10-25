/* The page-loading controller is independent from the portfolio interactions. */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.SkypixelLoading = factory().mount(root);
}(typeof window !== 'undefined' ? window : globalThis, function () {
    'use strict';

    // Easy-to-tune timings. Completion depends on window.load, never on a user action.
    const LOADER_CONFIG = Object.freeze({
        text: 'Skypixel',
        minimumMs: 400, // Avoid flickering on fast local loads.
        maximumMs: 7000, // Automatic recovery for a stalled resource.
        fadeMs: 300,
        typingMs: 150,
        erasingMs: 90,
        typingHoldMs: 2000,
        erasedHoldMs: 500
    });

    function mount(env, options = {}) {
        const config = { ...LOADER_CONFIG, ...options };
        const doc = env.document;
        const rootElement = doc.documentElement;
        const loader = doc.getElementById('loader-wrapper');
        const text = doc.getElementById('loading-text-animation');
        const content = doc.querySelectorAll('.site-header, #main-content, .site-footer, .skip-link');
        const reduced = env.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const startedAt = env.performance.now();
        const timers = new Set();
        let active = true;
        let loaded = doc.readyState === 'complete';
        let position = 0;
        let erasing = false;

        function later(callback, delay) {
            const timer = env.setTimeout(() => { timers.delete(timer); callback(); }, delay);
            timers.add(timer);
        }
        function restoreContent() {
            content.forEach(element => { element.inert = false; });
            rootElement.classList.remove('is-loading');
            rootElement.classList.add('is-ready');
        }
        function complete(automaticRecovery = false) {
            if (!active || (!automaticRecovery && (!loaded || env.performance.now() - startedAt < config.minimumMs))) return;
            active = false;
            timers.forEach(timer => env.clearTimeout(timer)); timers.clear();
            env.removeEventListener('load', onLoad);
            if (text) text.textContent = config.text;
            if (loader) loader.classList.add('is-leaving');
            restoreContent();
            env.setTimeout(() => { if (loader) { loader.hidden = true; loader.setAttribute('aria-hidden', 'true'); } }, reduced ? 0 : config.fadeMs);
            doc.dispatchEvent(new env.CustomEvent('skypixel:ready'));
        }
        function onLoad() { loaded = true; complete(); }
        function type() {
            if (!active || !text || reduced) return;
            if (erasing) {
                if (position > 0) { position--; text.textContent = config.text.slice(0, position); later(type, config.erasingMs); }
                else { erasing = false; later(type, config.erasedHoldMs); }
            } else if (position < config.text.length) {
                position++; text.textContent = config.text.slice(0, position); later(type, config.typingMs);
            } else { erasing = true; later(type, config.typingHoldMs); }
        }

        rootElement.classList.add('is-loading');
        rootElement.classList.remove('is-ready');
        content.forEach(element => { element.inert = true; });
        if (loader) { loader.hidden = false; loader.setAttribute('aria-hidden', 'false'); }
        if (text) text.textContent = reduced ? config.text : '';
        env.addEventListener('load', onLoad, { once: true });
        type();
        later(() => complete(), config.minimumMs);
        later(() => complete(true), config.maximumMs);
        env.clearTimeout(env.SkypixelBootTimer);

        // Read-only status for diagnostics. No skip, replay, or manual completion API.
        return Object.freeze({ isLoading: () => active });
    }
    return { LOADER_CONFIG, mount };
}));
