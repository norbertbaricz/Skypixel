'use strict';
(function () {
    const app = window.Skypixel, C = window.SkypixelCatalog;
    const select = document.getElementById('release-project'), feed = document.getElementById('release-feed');
    if (!app || !select || !feed) return;
    const esc = C.escapeHtml;
    function render() {
        const releases = C.getReleases(app.snapshot.projects).filter(release => !select.value || release.projectName === select.value);
        feed.innerHTML = releases.map(release => {
            const project = app.snapshot.projects.find(p => p.name === release.projectName);
            const excerpt = C.releaseExcerpt(release.body);
            return `<article class="release-entry reveal"><div class="release-identity">${C.projectIdentity(project)}<div><p class="card-category">${esc(project.category)}</p><h2>${esc(project.title)}</h2></div></div><div class="release-content"><div class="release-meta"><span class="release-tag">${esc(release.tag)}</span><time datetime="${esc(release.publishedAt || '')}">${esc(C.formatDate(release.publishedAt))}</time></div><h3>${esc(release.title || release.tag)}</h3><p class="release-excerpt">${excerpt ? esc(excerpt) : 'Release details and available files are in the project.'}</p><div class="release-entry-actions"><button class="text-link" type="button" data-open-project="${esc(project.name)}" data-open-tab="release">Notes & downloads ${C.icon('right')}</button><a class="text-link muted-link" href="${esc(C.safeUrl(project.releasesUrl))}" target="_blank" rel="noopener noreferrer">Release history ${C.icon('arrow')}</a></div></div></article>`;
        }).join('');
        document.getElementById('release-empty').hidden = releases.length > 0;
        app.reveal(feed);
    }
    function refresh() {
        const selected = select.value;
        select.innerHTML = '<option value="">All projects</option>' + app.snapshot.projects.filter(p => p.release).sort((a,b) => a.title.localeCompare(b.title)).map(p => `<option value="${esc(p.name)}">${esc(p.title)}</option>`).join('');
        if ([...select.options].some(option => option.value === selected)) select.value = selected;
        render();
    }
    select.addEventListener('change', render);
    document.addEventListener('skypixel:catalog', refresh);
    refresh();
}());
