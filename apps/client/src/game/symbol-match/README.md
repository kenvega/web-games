# Symbol Match asset provenance

The 57 SVG files in `symbols/` are unmodified selections from
[Google's Noto Emoji project](https://github.com/googlefonts/noto-emoji), pinned
to revision `8998f5dd683424a73e2314a8c1f1e359c19e8742`. Their local filenames map
the upstream emoji concepts to the game's canonical symbol IDs.

Noto Emoji is licensed under Apache License 2.0. The complete license ships at
`public/licenses/noto-emoji-apache-2.0.txt`; repository-level attribution is in
`THIRD_PARTY_NOTICES.md`. `notoEmojiAssetManifest.json` records every upstream
path and Git blob hash so the committed files can be verified byte-for-byte.
No runtime package or network request is required.

Every symbol uses a transparent `0 0 128 128` SVG. The game scales and rotates
the whole asset at runtime; it does not generate size- or orientation-specific
copies. `symbolCatalog.ts` is the exhaustive typed map from canonical ID to
accessible label and bundled asset URL.

Do not manually edit or redraw the Noto paths. If an icon is unsuitable, choose
another official Noto SVG, update the canonical concept when necessary, pin its
provenance in the manifest, and regenerate the deterministic artifacts.

Run `npm run validate:symbol-match-assets` from the repository root to validate
the roster, view boxes, external-resource safety, upstream hashes, catalog, and
license.

## Development contact sheet

Run the client development server and open `/symbol-contact-sheet.html`. This
unshipped page renders the complete roster at 24, 44, and 72 pixels with varied
rotations, plus focused color and grayscale comparisons for symbols that may be
visually similar.
