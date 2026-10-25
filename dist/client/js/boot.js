'use strict';

// Automatic recovery if the dedicated loading controller cannot be downloaded.
const BOOT_CONFIG = Object.freeze({ safetyTimeoutMs: 8000 });
document.documentElement.classList.add('js', 'is-loading');
window.SkypixelBootTimer = window.setTimeout(() => {
    document.documentElement.classList.remove('is-loading');
    document.documentElement.classList.add('is-ready');
    const loader = document.getElementById('loader-wrapper');
    if (loader) { loader.hidden = true; loader.setAttribute('aria-hidden', 'true'); }
    document.querySelectorAll('.site-header, #main-content, .site-footer, .skip-link').forEach(element => { element.inert = false; });
}, BOOT_CONFIG.safetyTimeoutMs);
