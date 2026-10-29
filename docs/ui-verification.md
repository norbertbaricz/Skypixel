# Interface verification — 3.2.1

Verified on October 29, 2026 using Chromium through the managed preview, the shared Express views, and the offline Node test suite.

- 32 offline tests passed: repository discovery, durable hourly budget, D1 lease, release and logo caching, nested logo selection, unsafe URL rejection, release-note escaping, loading screen behavior, HTTP APIs, and Linux startup launchers.
- TypeScript type checking passed.
- Four pages × 15 viewport widths passed: 320, 360, 390, 430, 520, 640, 768, 850, 851, 1024, 1280, 1440, 1920, 2560, and 3840 pixels. Frame height: 900 pixels.
- No horizontal page/toolbar overflow or failed visible images. Container/footer/desktop navigation centers differed from the viewport center by at most 0.016 CSS pixels. Project cards had equal heights at each tested width. Incomplete rows center automatically for one, two, or three columns, including filtered results.
- At 360 × 780: navigation opened/closed, Escape restored navigation focus, sorting selected an option, search filtered the list view, and all footer columns centered within 0.008 pixels. A long release reached the bottom through one scroll area while the close button remained visible.
- At 844 × 390: the project dialog fit the short viewport and retained one internal vertical scroll area. A constrained sorting dropdown scrolled within its available space above the control and below the sticky navigation.
- Keyboard sorting: End/Enter changed the form value and URL. Native form controls remain available without the enhancement script.
- Original loading scripts and original logo.png were retained. No external animation, font, icon, or Markdown dependency was added.

Responsive browser checks do not certify every physical device, browser engine, or assistive technology combination. Native Windows BAT execution and physical touch/screen-reader testing were not available; Linux launch behavior is covered by the existing startup tests. Motion/transparency preferences, data-saving settings, coarse pointers, safe areas, and native-dialog fallbacks are implemented using feature detection and standard CSS.
