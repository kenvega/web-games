# Symbol Match asset provenance

The 57 SVG files in `symbols/` were authored specifically for this project in
August 2026. They use original combinations of simple geometric paths and the
project's flat palette. No third-party icon pack, physical-game artwork, mobile
game asset, screenshot path, traced silhouette, or extracted image is included.
The reference screenshots informed the game mechanics and the general need for
bold, quickly recognizable symbols only; they were not used as drawing source
material.

Every canonical symbol ID has exactly one `128 × 128` transparent SVG. The same
asset is scaled and rotated at runtime; there are no size-specific or
orientation-specific variants. `symbolCatalog.ts` is the exhaustive typed map
from canonical ID to accessible label and bundled asset URL.

The palette is restricted to flat fills with `#171717` near-black outlines.
Assets contain no gradients, filters, textures, masks, shadows, opacity effects,
embedded raster images, or SVG text. Run `npm run validate:symbol-match-assets`
from the repository root after editing an asset.

## Development contact sheet

Run the client development server and open `/symbol-contact-sheet.html`. This
unshipped page renders all symbols at 24, 44, and 72 pixels with varied
rotations. Its first section specifically compares planet versus flying saucer
and rocket versus airplane in color and grayscale at the two smallest sizes.
