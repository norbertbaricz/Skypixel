# 🌐 Skypixel Official Website

Welcome to the official repository for the **Skypixel** web platform! 

This repository contains the proprietary source code for our main website, the central hub where users can discover, explore, and download our exclusive projects, including **BoosterX**, **DakotaAC**, and the **Minecraft Server Launcher**.

---

## ✨ Overview

* 🚀 **Central Hub:** The one-stop destination for all Skypixel software, latest updates, and official releases.
* ⚡ **Lightning Fast & Modern:** Built with cutting-edge web technologies (Next.js, Cloudflare, and Drizzle ORM) to ensure a smooth, secure, and responsive user experience.
* 📱 **Fully Responsive:** Beautifully optimized for desktop, tablet, and mobile devices so our community can browse our catalog from anywhere.
* 🛡️ **Official & Secure:** The only verified source to get authentic Skypixel products.

---

## 🌍 Visit Us
Set `SITE_URL` in `.env` to your own website address. The default local address is `http://localhost:3000`.

Head over to our official website to download our tools, read the latest patch notes, and join our growing community!

---

## Dark mode update — 3.2.2

The document canvas now starts dark before external CSS and JavaScript arrive, including error pages. Native fields, select options, placeholders, disabled fields, file controls, and autofill follow the dark palette.

The installed app uses an explicit manifest with matching dark launch/theme colors, standalone display, the existing SP icons, and iOS dark status-bar metadata. Fully close and reopen an installed shortcut after updating/restarting the VPS; an older installation may need its shortcut reinstalled to adopt native window/splash metadata. Browser/OS-owned dialogs and window frames remain under system control.

Validation: 34 offline tests, TypeScript checking, both build modes, and 28 browser theme checks passed. See `docs/dark-mode.md` for verification scope. Existing startup launchers, project synchronization, saved configuration, cache budgets, and original branding remain intact.

## Interface update — 3.2.1

- Matching dark gold scrollbars and accessible dropdowns. Search, sorting, and grid/list controls share one toolbar.
- One scroll container in project details, with a persistent close button and readable release headings, lists, and commands.
- Centered navigation/footer, consistent card heights, responsive safe areas, and keyboard/touch-friendly controls.
- Automatic nested-repository logo discovery. Small logo/icon files are checked in the backend, at most two repositories per refresh, with a seven-day positive/negative cache and the existing durable 40-attempt hourly budget.
- Verified local Nexus and ServerLauncher artwork. Projects without a usable image receive distinct monograms and category badges; broken images fall back automatically.
- More useful repository metadata and distinct Home content. No additional front-end dependency.
- Subtle blur and motion with reduced-motion/transparency, coarse-pointer, data-saving, and low-core fallbacks.

Validation: **32 offline tests**, TypeScript checking, both build modes, and **60 responsive browser checks** passed. See `docs/ui-verification.md` for scope and limits and `docs/technical-guide.md` for operation/configuration.

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

## ⚖️ License & Copyright

**Copyright (c) 2026 Skypixel. All Rights Reserved.**

This software, including all associated source code (frontend components, backend routes, database schemas), stylesheets, documentation, and visual assets/logos (the "Software"), is the exclusive proprietary property of Skypixel.

Under this license, you are strictly prohibited from:
1. Modifying, adapting, translating, reverse engineering, decompiling, or disassembling any part of the Software.
2. Distributing, publishing, hosting, renting, leasing, lending, selling, or sublicensing the Software or any modified versions of it.
3. Using the Software, its source code, or its visual assets (such as logos and UI designs) for any commercial or personal projects without explicit, prior written consent from Skypixel.
4. Cloning this website to create a competing or misleading service.

The source code hosted here is for archival and official deployment purposes only. You may not use this code to create derivative works.

**WARNING:** Any unauthorized reproduction, modification, theft of assets, or distribution of this Software is strictly prohibited and constitutes a direct violation of international copyright laws. Unauthorized use will result in immediate legal action, including but not limited to DMCA takedown notices, civil liability for damages, and potential criminal prosecution.
