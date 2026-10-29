# Skypixel Framework

The project hub by **MaxUltimat3**. Gold, white, black, the Skypixel SP identity, and the automatic animated loading screen remain the identity of the site.

## Start on a private VPS or Windows

Requires Node.js **22.13.0 or newer** and npm **9 or newer**. Extract the complete archive first. The launchers run the existing Express server; no Cloudflare account, Worker build, or manual `npm install` is required.

Linux / VPS, from the project directory:

```bash
chmod +x start.sh
./start.sh
```

Windows: double-click `start.bat`, or run it from Command Prompt:

```bat
start.bat
```

On the first start, runtime dependencies are installed using the supplied lockfile. A valid existing installation is reused. Later starts skip installation unless the package files or Node.js ABI change, or a dependency is missing. `.env` is copied from `.env.example` only if it does not already exist. Your existing configuration is preserved.

The default port is **3000**. Change `PORT` in `.env`, then restart. `NODE_ENV`, `SITE_URL`, proxy settings, and optional GitHub/SMTP configuration continue to use the existing environment file. The launchers do not change these settings. For production behind HTTPS, set `NODE_ENV=production` in `.env`.

Keep the project directory and `.cache` writable so the GitHub catalog and request budget can survive restarts. Stop a foreground server with **Ctrl+C**. To keep it running after disconnecting SSH, start it with:

```bash
nohup ./start.sh > skypixel.log 2>&1 &
```

Check Node.js, npm, and the project files without installing packages, creating `.env`, or starting the server:

```bash
./start.sh --check
```

The Windows equivalent is `start.bat --check`. Set `SKYPIXEL_PAUSE_ON_ERROR=0` when running the batch launcher noninteractively. On Linux, `SKYPIXEL_NODE_BIN` can select a specific Node.js executable.


## Run

Use Node.js 22.13 or later and npm 9 or later. Node.js 24 is recommended for the built-in TypeScript/SQLite test support.

```bash
npm install
cp .env.example .env
npm start
```

Open `http://localhost:3000` for the complete Express website and APIs. On Windows, copy the environment file in File Explorer or PowerShell.

```bash
npm run dev:express  # Express/EJS development with automatic restart
npm run dev         # Hosted Worker development through Vinext/Vite
npm test            # Offline behavior, quota, SQL lease, loader, and HTTP tests
npm run build       # Build the hosted Worker and its assets into dist/
npm run build:static # Optional snapshot-only export into dist-static/
```

The original Express, EJS views, and vanilla browser scripts are retained. The hosted edition uses the supplied Sites Vinext Worker infrastructure to serve those same EJS-generated pages and a shared backend. The portfolio UI does not download a React application.

## Four distinct pages

| Page | Purpose |
| --- | --- |
| Home | A Skypixel introduction and three practical areas: Minecraft, Windows, and communities; no duplicated project cards |
| Projects | The complete collection with search, automatic categories, sorting, grid/list view, and detailed project dialogs |
| Updates | The latest published release per project, project filtering, version notes, downloads, and full release-history links |
| About | An expanded MaxUltimat3 profile, the story behind Skypixel, and three principles behind the work |

The public GitHub login remains `norbertbaricz` because it identifies the repository source. Display text, social metadata, contributor fallback, and the catalog use MaxUltimat3. No profile-name API is requested.

## Automatic new projects

Every public repository owned by the configured GitHub account is included, including forks and archived repositories. Discovery follows pages of 100 repositories and deduplicates by repository ID. A partial or failed discovery never replaces a complete saved collection.

A new repository needs no website entry. Its GitHub description, language, topics, homepage, branch, stars, fork status, and archive status populate the card and details. Topics, repository name, and description infer Minecraft, Discord, Windows, Web, or Developer tools. Filters are rebuilt from actual categories. Unknown projects immediately receive a readable monogram, a category badge, and a README link. Release and logo discovery follow within the shared request budget.

`public/js/catalog.js` contains optional editorial overrides for the original five projects. These improve their existing descriptions and preserve verified local logos; they are not an inclusion list. New projects work without adding an override.

## A shared, conservative GitHub synchronizer

Visitors request the site's own API. Browser scripts never contact the GitHub API, so traffic does not multiply upstream polling.

`lib/sync-core.mjs` is the synchronization engine used by both hosting adapters:

- Discover repositories about every ten minutes, on demand or through the Express background timer.
- Share one in-flight job in Express. The hosted Worker uses an atomic D1 lease so separate isolates and concurrent visitors share one refresh.
- Reserve each attempted request durably **before** fetching. A restart does not reset the rolling budget.
- Allow at most **40 attempts per rolling hour** by default, including failures and conditional requests. Keep five requests in reserve when GitHub supplies remaining-quota headers.
- Request endpoints sequentially. Use ETags and 304 responses to reuse cached data. Persist ETags, endpoint bodies, negative release lookups, quota headers, retry state, and the last catalog.
- Cache release details and “no release” results for six hours. Enrich at most five projects per sync, choosing new or least-recently-checked projects first. Repository discovery takes priority over release details.
- Discover logos recursively within public repositories, including nested assets/resources folders. Select small logo/icon files, exclude screenshots, dependencies, symlinks, and files above 512 KiB. Check at most two repositories per sync; cache both found and missing artwork for seven days. All tree lookups use the same durable 40-attempt budget, ETags, cooldown, and sequential queue as releases. Persist only the selected image URL, not source trees. Local verified artwork takes precedence.
- Honor `Retry-After` and reset headers, and increase backoff after repeated failures. A forced Express refresh still respects quota and cooldown.
- Keep individual requests under seven seconds and stop starting requests after a twenty-second job budget.
- Reapply current editorial descriptions to restored catalogs without spending GitHub quota. Repository metadata, releases, and the durable budget are preserved.
- Serve saved projects and releases immediately during an outage, cooldown, or enrichment backlog. A shared-storage failure stops upstream fetching rather than starting independent pollers.

GitHub can apply secondary limits and an IP/token can be shared by other software. No integration can guarantee that GitHub will never return a limit response. This implementation stops, preserves the site, and resumes after the permitted interval. Upstream quota headers are authoritative. A server-only token can improve the available GitHub quota; it is optional, never bundled into the client, and does not raise this site's conservative request budget.

Reference: [GitHub REST rate-limit guidance](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api) and [REST API best practices](https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api).

## Storage and hosting

The hosted Worker uses the `DB` D1 binding declared in `.openai/hosting.json`. `db/schema.ts` and the committed `drizzle/` migration define one owner-keyed state row with its payload and lease. Sites applies the hosted migration during publication. The migration contains schema only; the verified fallback is application data in `repository-snapshot.json`.

For local Worker development, build once and apply each new migration once:

```bash
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_hot_cammi.sql
npm run dev
```

`npm start` uses the Express adapter with an atomic disk cache at `.cache/github-catalog.json`. Deploy one Express process for a given cache; use a persistent writable directory or volume. Multi-instance hosting should use the shared Worker/D1 adapter. A read-only Express filesystem retains an in-memory catalog, but restart persistence requires writable storage.

The optional static export is a snapshot. It serves saved JSON from its own origin and performs **no** direct GitHub requests. Use the Worker or Express runtime for automatic discovery. This site's hosted edition runs the Worker backend.

Pages are generated from `views/` into `generated/pages.mjs` for Worker hosting. `generated/catalog.mjs` is the ESM form of the browser's shared catalog utilities. Rebuild after editing EJS or catalog helpers. Both `npm run dev` and `npm run build` regenerate these modules. Original Java `src/`, source images, and `LICENSE.txt` are retained.

## Dark browser and installed-app surfaces

The document paints a dark `html`/`body` canvas before external CSS and scripts arrive, including error pages. Native inputs, selects, placeholders, autofill, and file controls inherit the dark palette. Gold action buttons and the existing layout remain unchanged.

`public/manifest.webmanifest` sets both app launch and theme colors to `#090909`, with the existing 192px PNG and 512px WebP SP icons. The manifest link includes credentials so authenticated hosting can serve it. iOS standalone/status-bar metadata uses the same dark canvas and existing safe-area spacing.

After updating a running VPS, restart the application and fully close/reopen an installed shortcut. Browsers/operating systems may retain installation metadata; reinstalling the shortcut may be needed for an older installation to adopt its window/splash settings. The website cannot style browser-owned dialogs, browser offline/error pages, or every operating-system window frame. This update adds no service-worker cache and preserves the existing catalog refresh behavior.

## Loading, responsiveness, and assets

The loading screen waits for page resources with a 400 ms minimum and seven-second automatic recovery. It has no Skip, Replay, Escape dismissal, click dismissal, or manual completion API. An independent boot recovery prevents a missing interaction script from trapping the page. Reduced-motion visitors see static brand text.

The responsive layout shares centered container edges and symmetric safe-area gutters. Small-screen footers stack in the center. Search, sort, and view buttons use a single toolbar, including a two-row mobile layout. Custom select controls preserve native form values and support keyboard arrows, Home/End, typeahead, Enter/Space, Escape, and Tab. The native select remains the no-JavaScript fallback. Dropdowns choose upward placement when space below is limited.

Project details use one scroll container beneath a persistent close bar. Release notes do not create nested scrollbars. Common repository actions appear once below the tabs, and useful branch/license/update metadata appears in Overview.

Subtle entrance, hover, and menu transitions use opacity/transforms. Blur stays on bounded navigation/menu/backdrop surfaces. Touch targets remain at least 44px; hover movement is disabled on coarse pointers. Reduced motion/transparency and data-saving/low-core devices receive lighter effects. Browser checks are responsive-layout verification, not physical-device or screen-reader certification.

The 64 × 64 original is retained as a source asset. A faithful high-resolution restoration is now displayed through 256/512 px WebP variants with responsive image selection; forced pixelated rendering is removed. The favicon and touch icon use the restored mark. [Logo assets and restoration prompt](docs/logo-assets.md).

Original `public/images/logo.png` SHA-256: `a2d02f54a15e57e2e425a6c87ffd6d7e433cf948647eac8850836b5fe57f8acd`.

| Project | Verified local logo source |
| --- | --- |
| BoosterX | `assets/boosterx-mark.png`, Git blob `aded4410db3e3b80ed2e593b34a158cb4f91ec0c` |
| Server Launcher | `Assets/icon.png`, Git blob `c6b4b97c72da0e79627e41ddc3db09c99b17b7a4` |
| Skypixel | Restored `logo-256.webp` / `logo-512.webp`; original `logo.png` retained unchanged |

Nexus also uses its verified `public/assets/nexus-icon-192.png` from GitHub. `ServerLauncher` and the earlier `Server-Launcher` name share the verified local artwork. The current DakotaAC and Puro trees contain no logo image, so they receive distinct DA/PU monograms with category badges. Future artwork is discovered automatically in repositories, independent of its folder. Remote artwork is restricted to the same repository on `raw.githubusercontent.com`, uses lazy loading and no referrer, and falls back to the monogram if unavailable. All images have dimensions and async decoding. The original background source remains; optimized WebP versions serve the interface. No external font or icon library is required.

## API

| Route | Purpose |
| --- | --- |
| `GET /api/projects` | Complete catalog, stats, categories, release data, and sync metadata |
| `GET /api/projects?q=launcher&category=Minecraft&sort=updated` | Combined filtering |
| `GET /api/projects?limit=2&page=2` | Optional pagination |
| `GET /api/projects/DakotaAC` | One project's details and release metadata |
| `GET /api/releases?project=Puro&limit=5` | Latest release per project, optionally filtered |
| `GET /api/status` | Sync status, cooldown, durable budget, and cache state |
| `GET /health` | Service health |
| `POST /contact` | Express-only SMTP delivery when configured |

Allowed sorts are `featured`, `updated`, `stars`, and `name`. Omitting pagination returns all matches. APIs return JSON errors, response ETags, and bounded query parameters. Live status responses bypass browser caching. HEAD responses have no body. Storage failures report a degraded integration state while preserving the fallback catalog. Status responses do not expose a token or filesystem path. Express adds request limits, compression, security headers, validated SMTP, and graceful shutdown. Hosted HTML and APIs have restrictive same-origin script and connection policies.

## Configuration

| File | Settings |
| --- | --- |
| `public/js/catalog.js` | Public alias, GitHub owner, editorial overrides, identity symbols, shared filtering |
| `lib/sync-core.mjs` | Central quota, polling, release TTLs, timeouts, retries, enrichment bounds |
| `lib/github.js` | Express environment configuration and atomic disk adapter |
| `worker/catalog.ts` | Hosted D1 persistence and atomic refresh lease |
| `public/js/loader.js` | Loading minimum, watchdog, typing and fade timings |
| `public/css/style.css` | Gold/dark palette, typography, layout, responsive behavior, motion |
| `.env.example` | Optional Express settings; no credentials are supplied |

The Worker reads an optional `GITHUB_TOKEN` from its runtime secrets. Its owner and public alias come from `catalog.js`; its synchronization defaults come from `sync-core.mjs`. Express can override `GITHUB_USERNAME`, `CREATOR_ALIAS`, `PROJECTS_REFRESH_MS`, `GITHUB_TIMEOUT_MS`, `GITHUB_RETRY_MS`, `GITHUB_HOURLY_BUDGET`, and `GITHUB_CACHE_FILE` through `.env`. Set `SITE_URL` at build time for canonical social links, robots, and sitemap. The site's existing identity and audience are preserved in the hosting configuration.

## Version 3.1 validation

23 offline tests pass, including new-repository discovery, 101-repository pagination, restart persistence, budget and upstream-limit pauses, 50 simultaneous hosted visitors, shared-storage failures, current editorial text after cache hydration, response ETags/HEAD, the automatic loader, and Express HTTP routes. TypeScript checking and both build modes pass. The production GitHub integration has also been read back successfully: a fresh catalog, persistent cache, no integration error, and a durable budget below its configured limit.

The former guide page and its navigation entries are removed. Its URL returns the normal 404 page. Home, Projects, Updates, and About share the same container edges; desktop navigation and footer text are centered independently of the logo and GitHub button widths.
