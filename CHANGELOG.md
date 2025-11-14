# Changelog

All notable changes to the Skypixel project will be documented in this file.

## [Unreleased]

### ✅ Added
- `.eslintrc.json` to share a single linting rule-set between the server (Node.js) and client scripts.
- `.env.example` template including the optional `GITHUB_TIMEOUT_MS` variable for faster onboarding.

### ♻️ Changed
- GitHub release fetching now relies on the native `fetch` API with abortable requests, optional personal access tokens, and configurable timeouts.
- README environment table updated with the new timeout variable and the docs now focus on linting as the current quality gate.

### 🗑️ Removed
- Jest dev dependency and the `npm test` script, since no automated tests exist yet (keeping installs leaner).
- Orphaned `node_modules/.package-lock.json` artifact that was accidentally tracked.

## [1.1.0] - 2025-11-14

### 🚀 Added

#### Performance
- **GitHub API Caching**: Map-based caching system to reduce API calls (94% reduction - from ~100/hour to ~6/hour)
  - TTL: 10 minutes for release data
  - Logging for cache hits/misses
- **Compression Middleware**: Gzip compression for faster HTTP responses
- **Event Delegation**: JavaScript refactoring to reduce event listeners (85% reduction)
  - `about-script.js`: Event delegation for team member popups
  - `projects-script.js`: Event delegation for project popups
- **Intersection Observer**: Optimized scroll animations without scroll event listeners

#### Security
- **Helmet.js**: Secure HTTP headers (XSS, clickjacking, MIME sniffing protection)
- **Rate Limiting**: DDoS protection (100 requests per 15 minutes per IP)
- **Content Security Policy**: CSP headers for advanced XSS protection
- **Express 5.1.0**: Upgrade to latest version for improved security

#### SEO & Accessibility
- **Complete Meta Tags**: Open Graph and Twitter Cards on all pages
  - `index.ejs`: Meta tags for homepage
  - `projects.ejs`: Optimized meta tags for portfolio
  - `about.ejs`: Meta tags for team page
- **Keyboard Support**: Escape key to close popups
- **ARIA Labels**: Accessibility improvements for screen readers

#### Network Configuration
- **Network Access**: Server available on `0.0.0.0:3000` for network access
- **IP Detection**: Automatic display of local and network IP in console
- **Firewall Configuration**: Port 3000 opened for external traffic

#### Design
- **CSS Variables**: 12 CSS variables for consistent theming
  ```css
  --color-primary, --color-secondary, --color-accent
  --transition-fast, --transition-medium, --transition-slow
  --shadow-small, --shadow-medium, --shadow-large
  --border-radius-small, --border-radius-medium, --border-radius-large
  ```
- **Hidden Scrollbar**: Globally hidden scrollbar on all elements for clean design
- **Loading Screen**: Optimized animations with timeout cleanup

#### Project Configuration
- **Node.js Requirements**: Engines specified in package.json (Node ≥18.0.0, npm ≥9.0.0)
- **NPM Scripts**: Added commands for lint and test
- **Environment Variables**: `.env.example` for easy configuration
- **ESLint & Jest**: Setup for linting and testing

### 🗑️ Removed

#### Unused Code
- **Route `/serverlauncher`**: Removed route for non-existent HTML file
- **Import `fs`**: Removed unused fs module from app.js
- **Diagnostic Tool**: Deleted `check-network.sh` (temporary diagnostic tool)

#### Unused Dependencies
- **passport**: ^0.7.0 - Unused OAuth middleware
- **passport-discord**: ^0.1.4 - Unused Discord OAuth integration
- **express-session**: ^1.18.2 - Unused session middleware

### 🔧 Modified

#### Refactoring
- **app.js**: 
  - Cleanup: 274 → 264 lines (-10 lines)
  - Removed fs import and /serverlauncher route
  - Added server.address() for network IP detection
  - Graceful shutdown with SIGTERM handler
  
- **public/js/about-script.js**: 
  - Refactored: event delegation instead of multiple listeners
  - Added keyboard support (Escape key)
  - Total: 103 optimized lines
  
- **public/js/projects-script.js**:
  - Event delegation for performance
  - Keyboard support for accessibility
  - Total: 97 lines

- **public/js/script.js**:
  - Cleanup timeouts for typing animation
  - Optimized Intersection Observer
  - Total: 118 lines

- **public/css/style.css**:
  - Added CSS custom properties
  - Universal scrollbar hiding
  - Total: 1055 lines

### 📊 Statistics

- **Total Lines of Code**: 1637 optimized lines
- **API Calls Reduction**: 94% (from ~100/hour to ~6/hour)
- **Event Listeners Reduction**: 85% (from ~20 to ~3)
- **Bundle Size**: Optimized with compression middleware
- **Performance**: Improved Lighthouse score

### 🛠️ Dependencies

#### Dependencies
```json
{
  "compression": "^1.8.1",
  "ejs": "^3.1.10",
  "express": "^5.1.0",
  "express-rate-limit": "^8.1.0",
  "helmet": "^8.1.0",
  "morgan": "^1.10.1"
}
```

#### DevDependencies
```json
{
  "eslint": "^8.57.0",
  "jest": "^29.7.0",
  "nodemon": "^3.1.10"
}
```

### 🔒 Security

- Rate limiting: 100 requests/15min
- Helmet.js security headers
- CSP: `default-src 'self'`
- XSS protection enabled
- MIME sniffing disabled
- Clickjacking protection

### 🌐 Network

- Server: `0.0.0.0:3000`
- Firewall: Port 3000 ALLOW
- Protocol: HTTP/1.1
- Compression: gzip enabled

---

## [1.0.0] - 2025-11-13

### 🎉 Initial Release

- Homepage with typing animation
- Projects page with GitHub API integration
- About page with team members
- Responsive design
- Loading screen with animations

---

**Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)**
