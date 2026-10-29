# Dark canvas and PWA appearance — 3.2.2

## Changes

- An inline critical theme paints the root document and body before external CSS, JavaScript, or the existing loader is available. Home, Projects, Updates, About, and error pages share it.
- The root canvas itself is dark, covering scrollbar gutters, short pages, and overscroll areas. The existing safe-area spacing remains.
- Native fields, native select options, disabled fields, placeholders, file controls, and autofill use the dark palette. Existing gold action buttons retain their contrast.
- The app manifest declares a stable root identity/scope, standalone display, both launch/theme colors as #090909, English metadata, and the existing SP icons at 192px/512px.
- The manifest link includes credentials for authenticated hosting. iOS standalone and black-translucent status-bar metadata reuse the dark safe-area canvas.
- No service-worker cache, catalog polling, GitHub budget, loading behavior, dependency, or original logo asset changed.

## Configuration and updates

Main colors remain at the top of public/css/style.css. Keep the short critical theme in views/partials/head.ejs and the launch/theme colors in public/manifest.webmanifest consistent when changing the palette.

Restart the VPS application after replacing its files. Fully close/reopen an installed shortcut after an update. Browser/OS installation metadata can persist; an older shortcut may require reinstallation to adopt its native window/splash settings. Browser-owned dialogs, browser network/error pages, forced accessibility palettes, and operating-system window frames remain under browser/system control.

## Verification

- 34 offline tests passed, including first-paint markup on all pages, manifest identity/colors/icon paths, and the Express manifest MIME type. TypeScript checking passed.
- Chromium: 7 cases × 4 widths = 28 checks. Cases: four normal pages, a 404 page, an actual page with external CSS/scripts removed, and a native-controls fixture.
- Widths: 320, 390, 844, 1280 px; frame height 780 px except 844 × 390 landscape.
- Every checked root/body canvas computed to rgb(9, 9, 9) and color-scheme dark. Native inputs/selects/textareas computed to rgb(18, 18, 16); regular text to rgb(247, 245, 239). No horizontal overflow in styled cases.
- Actual saved browser autofill profiles and physical installed iOS/Android/Windows app chrome were not available for runtime verification. Autofill rules and installation metadata were reviewed and validated in source.
