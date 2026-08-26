# Symbol Match icon replacement guide

Symbol Match uses a pinned, vendored selection of official Noto Emoji SVGs.
Replacing an icon means selecting another suitable Noto asset, not manually
redrawing or editing SVG paths.

## Drop-in replacement contract

An artwork-only replacement keeps all of the following unchanged:

1. The canonical symbol ID, filename, and represented concept.
2. A root `viewBox` exactly equal to `0 0 128 128`.
3. A transparent canvas with no added full-background shape.
4. One SVG per symbol, with no size-, rotation-, color-, or player-specific
   variants.
5. No scripts, embedded raster images, external resources, or SVG text.
6. An unmodified official Noto Emoji SVG from a pinned upstream revision.

The game can shrink or enlarge the vector without losing resolution. Placement
uses the complete 128-unit view box, so a replacement does not need to occupy
the exact same pixels as the previous asset. It should still have enough visual
mass and whitespace to remain clear without clipping.

## When a concept changes

If no satisfactory Noto image exists for the current concept, choose a
different recognizable concept and coordinate all of these changes:

- canonical symbol ID and SVG filename;
- accessible catalog label;
- source path and blob hash in `notoEmojiAssetManifest.json`;
- shared roster, deterministic deck and printed-layout artifacts;
- affected tests and documentation.

The roster must remain exactly 57 unique symbols. Concept changes require deck
and layout regeneration even though the projective-plane rules remain the same.

## Provenance and licensing

- Source only from `https://github.com/googlefonts/noto-emoji`.
- Pin a full 40-character upstream Git revision.
- Copy the selected SVG into the repository; never fetch it during gameplay.
- Preserve the SVG byte-for-byte. Renaming the local file is allowed.
- Record the upstream path and Git blob SHA in the asset manifest.
- Keep the Apache 2.0 license and `THIRD_PARTY_NOTICES.md` in the repository and
  in the deployed client.

The validator deliberately permits Noto's gradients, clipping paths, internal
styles, opacity, and local fragment references. It rejects executable content,
external resources, mismatched view boxes, missing files, and any deviation
from the pinned upstream bytes.

## Visual acceptance

Before accepting a replacement, inspect it:

- at 24, 44, and 72 rendered pixels;
- at varied card and local symbol rotations;
- in color and grayscale;
- next to seven unrelated symbols;
- beside similar concepts such as planet/flying saucer,
  rocket/airplane, money bag/balloon, test tube/wand, and train/camera.

Prefer another Noto choice if an icon clips, has too little visual mass, becomes
ambiguous when small or rotated, or depends only on color for recognition.

## Replacement workflow

1. Select an official Noto SVG with `viewBox="0 0 128 128"`.
2. Copy its bytes to the canonical local filename.
3. Update the pinned source path and blob hash in the manifest.
4. If the concept changed, perform the coordinated ID/label/artifact update.
5. Run `npm run validate:symbol-match-assets`.
6. Inspect `/symbol-contact-sheet.html` at all supported sizes and rotations.
7. Run the normal lint, typecheck, tests, and build before merging.
