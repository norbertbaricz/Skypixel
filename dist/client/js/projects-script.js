'use strict';

// Easy-to-tune catalog defaults. Filtering uses the same function as the backend.
const PROJECT_FILTER_CONFIG = Object.freeze({
    defaultSort: 'featured', defaultCategory: 'All projects', searchShortcut: '/',
    allowedSorts: ['featured', 'updated', 'stars', 'name'], allowedViews: ['grid', 'list']
});
(function () {
    const app = window.Skypixel, C = window.SkypixelCatalog;
    const grid = document.getElementById('project-grid');
    if (!app || !grid) return;
    const filters = document.querySelector('.category-filters'), search = document.getElementById('project-search'), sort = document.getElementById('project-sort');
    const params = new URLSearchParams(location.search);
    let category = params.get('category') || PROJECT_FILTER_CONFIG.defaultCategory;
    let view = PROJECT_FILTER_CONFIG.allowedViews.includes(params.get('view')) ? params.get('view') : 'grid';
    search.value = params.get('q') || '';
    sort.value = PROJECT_FILTER_CONFIG.allowedSorts.includes(params.get('sort')) ? params.get('sort') : PROJECT_FILTER_CONFIG.defaultSort;
    function categories() { return [...new Set(['All projects', ...app.snapshot.projects.map(project => project.category)])]; }
    function updateCategories() {
        if (!categories().includes(category)) category = PROJECT_FILTER_CONFIG.defaultCategory;
        filters.innerHTML = categories().map(name => `<button class="category-filter ${name === category ? 'active' : ''}" type="button" data-category-filter="${C.escapeHtml(name)}" aria-pressed="${name === category}">${C.escapeHtml(name)}<span>${name === 'All projects' ? app.snapshot.projects.length : app.snapshot.projects.filter(project => project.category === name).length}</span></button>`).join('');
    }
    function saveUrl() {
        const next = new URL(location.href);
        ['q','category','sort','view'].forEach(key => next.searchParams.delete(key));
        if (search.value.trim()) next.searchParams.set('q', search.value.trim());
        if (category !== PROJECT_FILTER_CONFIG.defaultCategory) next.searchParams.set('category', category);
        if (sort.value !== PROJECT_FILTER_CONFIG.defaultSort) next.searchParams.set('sort', sort.value);
        if (view !== 'grid') next.searchParams.set('view', view);
        try { history.replaceState({}, '', next); } catch { /* Some file previews disable history updates. */ }
    }
    function render(updateUrl = true) {
        const projects = C.filterProjects(app.snapshot.projects, { q: search.value, category, sort: sort.value });
        app.disposeReveals(grid);
        grid.innerHTML = projects.map(app.renderCard).join('');
        grid.classList.toggle('is-list', view === 'list');
        document.getElementById('empty-state').hidden = projects.length > 0;
        document.getElementById('results-count').textContent = `${projects.length} project${projects.length === 1 ? '' : 's'}`;
        filters.querySelectorAll('[data-category-filter]').forEach(button => { const active = button.dataset.categoryFilter === category; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
        document.querySelectorAll('[data-view]').forEach(button => { const active = button.dataset.view === view; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
        app.reveal(grid);
        window.SkypixelSelect?.refresh(sort);
        if (updateUrl) saveUrl();
    }
    document.getElementById('project-filters').addEventListener('submit', event => event.preventDefault());
    search.addEventListener('input', () => render()); sort.addEventListener('change', () => render());
    filters.addEventListener('click', event => { const button = event.target.closest('[data-category-filter]'); if (button) { category = button.dataset.categoryFilter; render(); } });
    document.querySelector('.view-switch').addEventListener('click', event => { const button = event.target.closest('[data-view]'); if (button) { view = button.dataset.view; render(); } });
    document.getElementById('reset-filters').addEventListener('click', () => { category = PROJECT_FILTER_CONFIG.defaultCategory; search.value = ''; sort.value = PROJECT_FILTER_CONFIG.defaultSort; render(); search.focus(); });
    document.addEventListener('keydown', event => {
        if (event.key === PROJECT_FILTER_CONFIG.searchShortcut && !event.ctrlKey && !event.metaKey && !event.altKey && !document.documentElement.classList.contains('is-loading') && !event.target.closest('input,textarea,select,[role="combobox"],[contenteditable="true"],dialog')) { event.preventDefault(); search.focus(); }
    });
    document.addEventListener('skypixel:catalog', () => { updateCategories(); render(false); });
    updateCategories(); render(false);
}());
