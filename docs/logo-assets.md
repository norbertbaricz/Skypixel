# Skypixel logo assets

The original 64 × 64 PNG is preserved byte for byte as `public/images/logo.png`.
The high-resolution restoration preserves the SP letters, grass/earth block, grey angular frame, blue lower facets, and transparent silhouette. It is a new high-resolution interpretation rather than a pixel-identical enlargement.

| Asset | Purpose |
| --- | --- |
| `public/images/logo-hd.png` | 1254 × 1254 transparent restored source and social image |
| `public/images/logo-256.webp` | 256 px web asset, approximately 13 KB |
| `public/images/logo-512.webp` | 512 px web asset, approximately 29 KB, for larger/high-density rendering |
| `public/images/favicon.png` | Restored 64 px browser icon |
| `public/images/apple-touch-icon.png` | Restored 192 px touch icon |

`views/partials/brand-logo.ejs` provides matching intrinsic dimensions, srcset and sizes. The project card uses the same responsive source. Rendering uses the browser's normal anti-aliasing instead of forced pixelated scaling.

## Restoration

Created with the built-in imagegen tool from the original PNG. WebP/PNG size variants were encoded with Sharp; no external image request is required at runtime.

Final prompt:

> Use case: precise-object-edit. Asset type: a production website identity icon, high resolution transparent PNG. Image 1 is the edit target, the existing Skypixel Framework logo, and its exact identity is crucial. Create a faithful high resolution restoration of this exact icon for use at 44–160 CSS pixels on high density screens. Preserve the original silhouette, composition, proportions, distinct stone/metal grey angular frame, brown earth cube with green grass top, blue-grey bottom facets, shaded facets, perspective and the exact central white block letters "SP" (S then P). Do not redesign or simplify the mark, do not alter the letters or add anything. Remove the low-resolution 64px raster blur and jagged stair steps caused by enlargement. Render the same angular block-inspired shapes as precise crisp anti-aliased edges with clean subtle existing shading. Keep the palette and position faithful to the reference. Single centered logo, square canvas, fills about 88% of the canvas with equal clear transparent margins; genuinely transparent background. No extra wording, no gold recolor, no rounded badge, no glow, no scene, no mockup, no border around the image. High resolution, sharp at small website sizes.
