const test = require('node:test');
const assert = require('node:assert/strict');
const { mount, LOADER_CONFIG } = require('../public/js/loader');

// A deterministic browser clock verifies loading behavior without waiting in real time.
function browserHarness(state = 'interactive', reduced = false) {
    let now = 0, nextTimer = 0;
    const timers = new Map(), listeners = new Map(), dispatched = [];
    const classList = () => {
        const values = new Set();
        return { add: (...names) => names.forEach(name => values.add(name)), remove: (...names) => names.forEach(name => values.delete(name)), contains: name => values.has(name) };
    };
    const content = [{ inert: false }, { inert: false }];
    const loader = { hidden: false, classList: classList(), setAttribute() {} };
    const text = { textContent: '' };
    const doc = {
        readyState: state, documentElement: { classList: classList() },
        getElementById: name => name === 'loader-wrapper' ? loader : text,
        querySelectorAll: () => content,
        dispatchEvent: event => dispatched.push(event.type)
    };
    const env = {
        document: doc, performance: { now: () => now }, matchMedia: () => ({ matches: reduced }),
        CustomEvent: class { constructor(type) { this.type = type; } },
        setTimeout: (callback, delay) => { const id = ++nextTimer; timers.set(id, { at: now + delay, callback }); return id; },
        clearTimeout: id => timers.delete(id),
        addEventListener: (name, callback) => { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name).add(callback); },
        removeEventListener: (name, callback) => listeners.get(name)?.delete(callback)
    };
    function advance(ms) {
        const end = now + ms;
        while (true) {
            const next = [...timers.entries()].filter(([,timer]) => timer.at <= end).sort((a,b) => a[1].at - b[1].at)[0];
            if (!next) break;
            now = next[1].at; timers.delete(next[0]); next[1].callback();
        }
        now = end;
    }
    return { env, content, loader, text, dispatched, advance, fire: (name, event = {}) => [...(listeners.get(name) || [])].forEach(callback => callback(event)) };
}

test('the loading screen waits for resources and cannot be dismissed with Escape or click', () => {
    const browser = browserHarness();
    const status = mount(browser.env);
    browser.advance(1000);
    browser.fire('keydown', { key: 'Escape' }); browser.fire('click');
    assert.equal(status.isLoading(), true);
    assert.ok(browser.content.every(element => element.inert));
    assert.deepEqual(Object.keys(status), ['isLoading']);
    browser.fire('load');
    assert.equal(status.isLoading(), false);
    assert.ok(browser.content.every(element => !element.inert));
    browser.advance(LOADER_CONFIG.fadeMs);
    assert.equal(browser.loader.hidden, true);
    assert.deepEqual(browser.dispatched, ['skypixel:ready']);
});

test('a stalled resource recovers automatically without leaving the page locked', () => {
    const browser = browserHarness();
    const status = mount(browser.env);
    browser.advance(LOADER_CONFIG.maximumMs - 1);
    assert.equal(status.isLoading(), true);
    browser.advance(1 + LOADER_CONFIG.fadeMs);
    assert.equal(status.isLoading(), false);
    assert.equal(browser.loader.hidden, true);
    assert.ok(browser.content.every(element => !element.inert));
});

test('reduced motion retains the loading gate and shows static brand text', () => {
    const browser = browserHarness('complete', true);
    const status = mount(browser.env);
    assert.equal(browser.text.textContent, 'Skypixel');
    browser.advance(LOADER_CONFIG.minimumMs - 1);
    assert.equal(status.isLoading(), true);
    browser.advance(1);
    assert.equal(status.isLoading(), false);
    assert.equal(browser.loader.hidden, true);
});
