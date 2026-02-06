# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.12] - 2026-02-06

### Added
- Dynamic projects list fetched from GitHub repositories.
- GitHub social preview images for project cards and popups.
- Automatic team listing from GitHub contributors (creator + contributors).
- Contributor profile buttons linking to GitHub profiles.
- Display names and bios pulled from GitHub profiles.

### Fixed
- Resolved GitHub API rate-limit fallback by parsing repository HTML.
- Improved popup data binding for project details.
- Smoother button hover transitions.

### Removed
- Static project cards and hardcoded team members.
- Team details popup in About page.