'use strict';

// Contributor cards are supplied by the server snapshot; motion uses the shared observer.
const ABOUT_CONFIG = Object.freeze({ contributorSelector: '.contributors a' });
document.querySelectorAll(ABOUT_CONFIG.contributorSelector).forEach(link => {
    link.setAttribute('aria-label', `View ${link.querySelector('strong')?.textContent || 'contributor'} on GitHub`);
});
