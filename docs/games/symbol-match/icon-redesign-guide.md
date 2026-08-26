# Symbol Match icon redesign guide

This guide defines how to replace a Symbol Match icon without changing the
deck, card layouts, server rules, client rendering logic, or any other icon.

## Drop-in replacement contract

An icon redesign is a drop-in replacement when all of the following remain
true:

1. Keep the existing filename and canonical symbol ID. For example, a new
   hammer design must replace `hammer.svg`; do not rename it or create a second
   hammer variant.
2. Keep the root `viewBox` exactly `0 0 128 128`.
3. Keep the SVG background transparent. Do not add a full-canvas background
   shape.
4. Keep all visible artwork, including the outside edge of strokes, roughly
   inside the safe area from `10` to `118` on both axes.
5. Keep the artwork visually centered around `(64, 64)`. Exact geometric
   centering is not required; optical centering is more important.
6. Use near-black `#171717` outlines approximately 8 SVG units thick, with
   rounded line caps and joins.
7. Use only flat fills from the approved palette. Do not use gradients,
   opacity effects, shadows, filters, masks, textures, embedded raster images,
   or internal highlight effects.
8. Do not include SVG text. The accessible name belongs in the typed catalog,
   not inside the image file.
9. Keep one SVG file per symbol. Do not add size-specific, rotation-specific,
   color-specific, or player-specific copies.
10. Use original artwork. Do not trace, extract, or closely redraw art from the
    reference screenshots, Dobble products, another game, or an icon library
    without an appropriate license and provenance review.

The replacement does **not** need to use the same paths, proportions, internal
geometry, orientation, or exact occupied area as the previous design.

## Approved palette

The current asset validator accepts these flat colors:

- Near-black: `#171717`
- Blue: `#36A7E8`
- Cyan: `#49D6D0`
- Red: `#F15B5A`, `#E43D49`
- Orange: `#FF9F43`
- Yellow: `#FFC94A`
- Green: `#76C84A`, `#3D9D59`
- Purple: `#9B6BD3`
- Pink: `#E77EB3`
- Brown: `#A96A48`
- Gray: `#83909E`, `#66717E`
- Off-white: `#F7F3E8`

Adding another color is possible, but it requires intentionally updating the
asset validator and reviewing the overall palette. Reusing the existing colors
keeps a redesign isolated to its SVG file.

## Visual readability requirements

Every redesign should remain recognizable under the transformations used by
the game:

- At small rendered sizes, especially 24 and 44 pixels
- At any whole-card rotation from 0 to 360 degrees
- With its own local printed rotation
- In grayscale
- Next to seven unrelated symbols
- Without relying on a specific color as its only identifying feature

Prefer a strong outer silhouette and a small number of large internal regions.
Avoid fine lines, tiny gaps, small decorative marks, and important details near
the safe-area boundary. Narrow symbols are allowed, but they should still have
enough visual mass to remain legible at the smallest size.

Symbols with related subjects must remain distinguishable by silhouette. Pay
special attention to:

- Planet versus flying saucer
- Rocket versus airplane
- Sun versus star
- Balloon versus water drop
- Leaf versus four-leaf clover
- Bell versus ghost

## What can change freely

These changes require no deck or layout regeneration when the drop-in contract
is preserved:

- All SVG paths and primitive shapes
- The symbol's pose or facing direction
- Its proportions and internal arrangement
- Its colors within the approved palette
- The number of flat color regions
- How much of the safe area it occupies
- The exact outline width when it remains visually close to the approved style

Card placement uses the fixed `128 × 128` coordinate space and scales the whole
SVG. It does not depend on the old paths. Therefore, replacing a design does not
change card construction, symbol IDs, server data, hit targets, or mathematical
deck guarantees.

## Changes that are not isolated

The following are no longer simple visual replacements and may require code,
data, tests, or regenerated artifacts:

- Renaming an SVG file or canonical symbol ID
- Replacing the represented concept with a different concept
- Adding or removing a symbol
- Adding a second variant for the same symbol
- Changing the `viewBox`
- Moving accessible labels into the SVG
- Changing the asset-loading folder or catalog structure
- Changing the global palette or validator rules

Discuss these changes before editing because they can affect the shared symbol
roster, deterministic deck, generated card layouts, typed catalog, tests, and
saved game compatibility.

## Replacement workflow

1. Copy the current SVG somewhere outside the canonical `symbols/` directory if
   a temporary backup is desired. Do not leave backup SVGs in that directory;
   the validator requires exactly 57 files.
2. Replace only the intended canonical SVG file.
3. Confirm the root `viewBox`, safe area, transparent background, rounded
   near-black outline, flat palette, and absence of forbidden effects.
4. Run:

   ```sh
   npm run validate:symbol-match-assets
   ```

5. Run the client development server and open:

   ```text
   http://localhost:5173/symbol-contact-sheet.html
   ```

6. Inspect the redesign at 24, 44, and 72 pixels, at multiple rotations, and in
   grayscale. Compare it with any visually related symbols.
7. Run the normal lint, typecheck, test, and build checks before merging.

## Quick acceptance checklist

- [ ] The canonical filename and represented concept are unchanged.
- [ ] The root view box is exactly `0 0 128 128`.
- [ ] The background is transparent.
- [ ] All visible strokes remain approximately inside the 10-unit safe area.
- [ ] The artwork is optically centered.
- [ ] Outlines are near-black, rounded, and approximately 8 units thick.
- [ ] Fills are flat and use the approved palette.
- [ ] There is no text, gradient, shadow, filter, mask, opacity effect, texture,
      or embedded image.
- [ ] The symbol remains recognizable at 24 pixels and when rotated.
- [ ] It remains distinguishable in grayscale from related symbols.
- [ ] The asset validator and normal project checks pass.

If every item above passes, the redesigned SVG can replace the previous file
without changing anything else in the application.
