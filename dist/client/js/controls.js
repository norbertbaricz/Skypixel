'use strict';

// Shared select controls. Keep native selects as the form and no-JavaScript fallback.
const SELECT_CONFIG = Object.freeze({ typeaheadMs: 700, viewportGap: 12, maxHeight: 320 });
(function () {
    const instances = new WeakMap();
    let opened = null;
    function enhance(select) {
        if (instances.has(select)) return instances.get(select);
        const wrapper = document.createElement('div');
        wrapper.className = 'select-control';
        select.before(wrapper); wrapper.append(select);
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'select-trigger';
        button.id = `${select.id}-trigger`;
        button.setAttribute('role', 'combobox');
        button.setAttribute('aria-haspopup', 'listbox');
        button.setAttribute('aria-expanded', 'false');
        button.setAttribute('aria-controls', `${select.id}-listbox`);
        const label = document.querySelector(`label[for="${select.id}"]`);
        if (label) {
            label.id ||= `${select.id}-label`;
            button.setAttribute('aria-labelledby', `${label.id} ${select.id}-value`);
            label.addEventListener('click', event => { event.preventDefault(); button.focus(); });
        } else button.setAttribute('aria-label', select.getAttribute('aria-label') || 'Choose an option');
        const value = document.createElement('span'); value.id = `${select.id}-value`; value.className = 'select-value';
        const chevron = document.createElement('span'); chevron.className = 'select-chevron'; chevron.setAttribute('aria-hidden', 'true');
        button.append(value, chevron);
        const list = document.createElement('div');
        list.className = 'select-menu'; list.id = `${select.id}-listbox`; list.hidden = true;
        list.setAttribute('role', 'listbox'); list.setAttribute('aria-labelledby', label?.id || button.id);
        wrapper.append(button, list); select.hidden = true;
        let active = 0, typed = '', typedAt = 0;
        const options = () => [...select.options];
        const isOpen = () => !list.hidden;
        function mark(index) {
            const items = options();
            active = Math.max(0, Math.min(index, items.length - 1));
            [...list.children].forEach((item, i) => item.classList.toggle('is-active', i === active));
            const current = list.children[active];
            if (current && isOpen()) {
                button.setAttribute('aria-activedescendant', current.id);
                // Scroll the menu only: scrollIntoView can also move the whole page.
                if (current.offsetTop < list.scrollTop) list.scrollTop = current.offsetTop;
                else if (current.offsetTop + current.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = current.offsetTop + current.offsetHeight - list.clientHeight;
            }
        }
        function close(commit = false) {
            if (commit && isOpen()) choose(active, false);
            list.hidden = true; button.setAttribute('aria-expanded', 'false'); button.removeAttribute('aria-activedescendant');
            wrapper.classList.remove('is-open');
            if (opened === api) opened = null;
        }
        function refresh() {
            value.textContent = select.selectedOptions[0]?.textContent || 'Choose an option';
            button.disabled = select.disabled || !select.options.length;
            list.replaceChildren(...options().map((option, index) => {
                const item = document.createElement('button'); item.type = 'button'; item.tabIndex = -1; item.className = 'select-option'; item.id = `${select.id}-option-${index}`;
                item.setAttribute('role', 'option'); item.setAttribute('aria-selected', String(option.selected));
                item.dataset.index = index; item.textContent = option.textContent;
                if (option.disabled) { item.disabled = true; item.setAttribute('aria-disabled', 'true'); }
                return item;
            }));
            mark(Math.max(0, select.selectedIndex));
        }
        function choose(index, collapse = true) {
            const option = select.options[index];
            if (!option || option.disabled) return;
            const changed = select.selectedIndex !== index;
            select.selectedIndex = index; refresh();
            if (collapse) { close(); button.focus({ preventScroll: true }); }
            if (changed) select.dispatchEvent(new Event('change', { bubbles: true }));
        }
        function open() {
            if (button.disabled) return;
            opened?.close(); opened = api;
            const bounds = button.getBoundingClientRect();
            const viewportHeight = window.visualViewport?.height || window.innerHeight;
            const below = viewportHeight - bounds.bottom - SELECT_CONFIG.viewportGap;
            const headerBottom = document.querySelector('.site-header')?.getBoundingClientRect().bottom || 0;
            const above = bounds.top - Math.max(0, headerBottom) - SELECT_CONFIG.viewportGap;
            const upward = below < 180 && above > below;
            wrapper.classList.toggle('opens-up', upward);
            list.style.maxHeight = `${Math.max(60, Math.min(SELECT_CONFIG.maxHeight, upward ? above : below))}px`;
            list.hidden = false; button.setAttribute('aria-expanded', 'true'); wrapper.classList.add('is-open');
            mark(select.selectedIndex);
        }
        button.addEventListener('click', () => isOpen() ? close() : open());
        wrapper.addEventListener('keydown', event => {
            const key = event.key;
            if (key === 'Tab') { close(true); return; }
            if (key === 'Escape' && isOpen()) { event.preventDefault(); event.stopPropagation(); close(); return; }
            if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' '].includes(key)) {
                event.preventDefault();
                if (!isOpen()) { open(); if (key === 'Home') mark(0); else if (key === 'End') mark(select.options.length - 1); return; }
                if (key === 'Enter' || key === ' ') { choose(active); return; }
                let next = key === 'Home' ? 0 : key === 'End' ? select.options.length - 1 : active + (key === 'ArrowDown' ? 1 : -1);
                while (select.options[next]?.disabled) next += key === 'ArrowUp' ? -1 : 1;
                mark(next); return;
            }
            if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
                event.preventDefault();
                const time = Date.now(); typed = time - typedAt > SELECT_CONFIG.typeaheadMs ? key : typed + key; typedAt = time;
                if (!isOpen()) open();
                const repeated = [...typed].every(character => character.toLowerCase() === key.toLowerCase());
                const query = (repeated ? key : typed).toLowerCase();
                const entries = options();
                for (let offset = repeated ? 1 : 0; offset <= entries.length; offset++) {
                    const index = (active + offset) % entries.length;
                    if (!entries[index].disabled && entries[index].textContent.toLowerCase().startsWith(query)) { mark(index); break; }
                }
            }
        });
        list.addEventListener('pointerdown', event => { if (event.pointerType !== 'touch') event.preventDefault(); });
        list.addEventListener('click', event => {
            const item = event.target.closest('[data-index]');
            if (item) { choose(Number(item.dataset.index)); button.focus({ preventScroll: true }); }
        });
        wrapper.addEventListener('focusout', event => { if (!wrapper.contains(event.relatedTarget)) close(true); });
        select.addEventListener('change', refresh);
        const api = { refresh, close, contains: target => wrapper.contains(target) };
        instances.set(select, api); refresh(); return api;
    }
    document.addEventListener('pointerdown', event => { if (opened && !opened.contains(event.target)) opened.close(true); });
    window.addEventListener('resize', () => opened?.close());
    window.visualViewport?.addEventListener('resize', () => opened?.close());
    window.SkypixelSelect = { refresh: select => enhance(select).refresh() };
    document.querySelectorAll('select[data-enhance-select]').forEach(enhance);
}());
