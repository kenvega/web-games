# Symbol Match Noto Emoji mapping

This document records the approved mapping used to replace the hand-authored
Symbol Match artwork with SVG assets from
[Google's Noto Emoji repository](https://github.com/googlefonts/noto-emoji).

## Asset policy

- Prefer an unmodified Noto Emoji SVG over editing its paths.
- If a Noto representation is visually unsuitable, choose another Noto symbol.
- If the replacement represents a genuinely different concept, rename the
  canonical game symbol ID, filename, accessible label, and related generated
  data rather than leaving a misleading name in the codebase.
- Keep one committed SVG per game symbol. Do not install an emoji font, add a
  runtime dependency, or fetch artwork from a CDN during gameplay.
- Pin the imported artwork to an exact upstream revision so production builds
  remain deterministic.
- Preserve the Noto artwork's geometry, colors, shading, and internal details.
  The game may resize and rotate the complete SVG without creating variants.
- Retain only general asset checks: valid SVG, canonical filename, exact
  `0 0 128 128` view box, transparent canvas, no scripts, no external
  resources, and acceptable small-size readability.
- Replace the old hand-authored palette, outline, and no-highlight requirements
  when Noto becomes the approved visual system.

## Source snapshot and license

The links below are pinned to Noto Emoji revision
`8998f5dd683424a73e2314a8c1f1e359c19e8742` rather than the moving `main`
branch.

The individual files in Noto's `svg/` directory are distributed under the
[Apache License 2.0](https://github.com/googlefonts/noto-emoji/blob/main/svg/LICENSE).
The project includes the full license text and a third-party provenance record.
Any materially modified file would need to be marked as modified. The Noto
license applies to the imported artwork, not to the entire game's source code.

All 57 selected files are committed in the client and use the exact root view
box `0 0 128 128`. The complete license is served with the application, and
`THIRD_PARTY_NOTICES.md` plus `notoEmojiAssetManifest.json` record their pinned
provenance and hashes.

## Approved mapping

The links open the exact SVG revision imported into the repository.

| Current game ID    | Proposed Noto concept | Unicode | Official SVG                                                                                                                       | Review note                                            |
| ------------------ | --------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `hammer`           | Hammer                | U+1F528 | [View SVG](https://raw.githubusercontent.com/googlefonts/noto-emoji/8998f5dd683424a73e2314a8c1f1e359c19e8742/svg/emoji_u1f528.svg) | Direct match                                           |
| `key`              | Key                   | U+1F511 | [View SVG](https://raw.githubusercontent.com/googlefonts/noto-emoji/8998f5dd683424a73e2314a8c1f1e359c19e8742/svg/emoji_u1f511.svg) | Direct match                                           |
| `anchor`           | Anchor                | U+2693  | [View SVG](https://raw.githubusercontent.com/googlefonts/noto-emoji/8998f5dd683424a73e2314a8c1f1e359c19e8742/svg/emoji_u2693.svg)  | Direct match                                           |
| `wrench`           | Wrench                | U+1F527 | [View SVG](https://raw.githubusercontent.com/googlefonts/noto-emoji/8998f5dd683424a73e2314a8c1f1e359c19e8742/svg/emoji_u1f527.svg) | Direct match                                           |
| `magnet`           | Magnet                | U+1F9F2 | [View SVG](https://raw.githubusercontent.com/googlefonts/noto-emoji/8998f5dd683424a73e2314a8c1f1e359c19e8742/svg/emoji_u1f9f2.svg) | Direct match                                           |
| `bell`             | Bell                  | U+1F514 | [View SVG](https://raw.githubusercontent.com/googlefonts/noto-emoji/8998f5dd683424a73e2314a8c1f1e359c19e8742/svg/emoji_u1f514.svg) | Direct match                                           |
| `lock`             | Locked                | U+1F512 | [View SVG](https://raw.githubusercontent.com/googlefonts/noto-emoji/8998f5dd683424a73e2314a8c1f1e359c19e8742/svg/emoji_u1f512.svg) | Direct match                                           |
| `camera`           | Camera                | U+1F4F7 | [View SVG](https://raw.githubusercontent.com/googlefonts/noto-emoji/8998f5dd683424a73e2314a8c1f1e359c19e8742/svg/emoji_u1f4f7.svg) | Direct match                                           |
| `sun`              | Sun                   | U+2600  | [View SVG](https://raw.githubusercontent.com/googlefonts/noto-emoji/8998f5dd683424a73e2314a8c1f1e359c19e8742/svg/emoji_u2600.svg)  | Direct match                                           |
| `moon`             | Crescent moon         | U+1F319 | [View SVG](https://raw.githubusercontent.com/googlefonts/noto-emoji/8998f5dd683424a73e2314a8c1f1e359c19e8742/svg/emoji_u1f319.svg) | Direct interpretation                                  |
| `cloud`            | Cloud                 | U+2601  | [View SVG](https://raw.githubusercontent.com/googlefonts/noto-emoji/8998f5dd683424a73e2314a8c1f1e359c19e8742/svg/emoji_u2601.svg)  | Check contrast on the white card                       |
| `lightning-bolt`   | High voltage          | U+26A1  | [View SVG](https://raw.githubusercontent.com/googlefonts/noto-emoji/8998f5dd683424a73e2314a8c1f1e359c19e8742/svg/emoji_u26a1.svg)  | Same visual concept                                    |
| `flame`            | Fire                  | U+1F525 | [View SVG](https://raw.githubusercontent.com/googlefonts/noto-emoji/8998f5dd683424a73e2314a8c1f1e359c19e8742/svg/emoji_u1f525.svg) | Same visual concept                                    |
| `leaf`             | Fallen leaf           | U+1F342 | [View SVG](https://raw.githubusercontent.com/googlefonts/noto-emoji/8998f5dd683424a73e2314a8c1f1e359c19e8742/svg/emoji_u1f342.svg) | Approved concept; canonical ID retained                |
| `cactus`           | Cactus                | U+1F335 | [View SVG](https://raw.githubusercontent.com/googlefonts/noto-emoji/8998f5dd683424a73e2314a8c1f1e359c19e8742/svg/emoji_u1f335.svg) | Direct match                                           |
| `snowflake`        | Snowflake             | U+2744  | [View SVG](https://raw.githubusercontent.com/googlefonts/noto-emoji/8998f5dd683424a73e2314a8c1f1e359c19e8742/svg/emoji_u2744.svg)  | Direct match                                           |
| `cat`              | Cat                   | U+1F408 | [View SVG](https://raw.githubusercontent.com/googlefonts/noto-emoji/8998f5dd683424a73e2314a8c1f1e359c19e8742/svg/emoji_u1f408.svg) | Whole animal gives a stronger silhouette than cat face |
| `whale`            | Whale                 | U+1F40B | [View SVG](https://raw.githubusercontent.com/googlefonts/noto-emoji/8998f5dd683424a73e2314a8c1f1e359c19e8742/svg/emoji_u1f40b.svg) | Direct match                                           |
| `owl`              | Owl                   | U+1F989 | [View SVG](https://raw.githubusercontent.com/googlefonts/noto-emoji/8998f5dd683424a73e2314a8c1f1e359c19e8742/svg/emoji_u1f989.svg) | Direct match                                           |
| `turtle`           | Turtle                | U+1F422 | [View SVG](https://raw.githubusercontent.com/googlefonts/noto-emoji/8998f5dd683424a73e2314a8c1f1e359c19e8742/svg/emoji_u1f422.svg) | Direct match                                           |
| `butterfly`        | Butterfly             | U+1F98B | [View SVG](https://raw.githubusercontent.com/googlefonts/noto-emoji/8998f5dd683424a73e2314a8c1f1e359c19e8742/svg/emoji_u1f98b.svg) | Direct match                                           |
| `frog`             | Frog                  | U+1F438 | [View SVG](https://raw.githubusercontent.com/googlefonts/noto-emoji/8998f5dd683424a73e2314a8c1f1e359c19e8742/svg/emoji_u1f438.svg) | Direct match                                           |
| `snail`            | Snail                 | U+1F40C | [View SVG](https://raw.githubusercontent.com/googlefonts/noto-emoji/8998f5dd683424a73e2314a8c1f1e359c19e8742/svg/emoji_u1f40c.svg) | Direct match                                           |
| `bee`              | Honeybee              | U+1F41D | [View SVG](https://raw.githubusercontent.com/googlefonts/noto-emoji/8998f5dd683424a73e2314a8c1f1e359c19e8742/svg/emoji_u1f41d.svg) | Direct match                                           |
| `apple`            | Red apple             | U+1F34E | [View SVG](https://raw.githubusercontent.com/googlefonts/noto-emoji/8998f5dd683424a73e2314a8c1f1e359c19e8742/svg/emoji_u1f34e.svg) | Direct match                                           |
| `cherries`         | Cherries              | U+1F352 | [View SVG](https://raw.githubusercontent.com/googlefonts/noto-emoji/8998f5dd683424a73e2314a8c1f1e359c19e8742/svg/emoji_u1f352.svg) | Direct match                                           |
| `watermelon`       | Watermelon            | U+1F349 | [View SVG](https://raw.githubusercontent.com/googlefonts/noto-emoji/8998f5dd683424a73e2314a8c1f1e359c19e8742/svg/emoji_u1f349.svg) | Direct match                                           |
| `mushroom`         | Mushroom              | U+1F344 | [View SVG](https://raw.githubusercontent.com/googlefonts/noto-emoji/8998f5dd683424a73e2314a8c1f1e359c19e8742/svg/emoji_u1f344.svg) | Direct match                                           |
| `cupcake`          | Cupcake               | U+1F9C1 | [View SVG](https://raw.githubusercontent.com/googlefonts/noto-emoji/8998f5dd683424a73e2314a8c1f1e359c19e8742/svg/emoji_u1f9c1.svg) | Direct match                                           |
| `pretzel`          | Pretzel               | U+1F968 | [View SVG](https://raw.githubusercontent.com/googlefonts/noto-emoji/8998f5dd683424a73e2314a8c1f1e359c19e8742/svg/emoji_u1f968.svg) | Direct match                                           |
| `carrot`           | Carrot                | U+1F955 | [View SVG](https://raw.githubusercontent.com/googlefonts/noto-emoji/8998f5dd683424a73e2314a8c1f1e359c19e8742/svg/emoji_u1f955.svg) | Direct match                                           |
| `lemon`            | Lemon                 | U+1F34B | [View SVG](https://raw.githubusercontent.com/googlefonts/noto-emoji/8998f5dd683424a73e2314a8c1f1e359c19e8742/svg/emoji_u1f34b.svg) | Direct match                                           |
| `rocket`           | Rocket                | U+1F680 | [View SVG](https://raw.githubusercontent.com/googlefonts/noto-emoji/8998f5dd683424a73e2314a8c1f1e359c19e8742/svg/emoji_u1f680.svg) | Direct match                                           |
| `sailboat`         | Sailboat              | U+26F5  | [View SVG](https://raw.githubusercontent.com/googlefonts/noto-emoji/8998f5dd683424a73e2314a8c1f1e359c19e8742/svg/emoji_u26f5.svg)  | Direct match                                           |
| `bicycle`          | Bicycle               | U+1F6B2 | [View SVG](https://raw.githubusercontent.com/googlefonts/noto-emoji/8998f5dd683424a73e2314a8c1f1e359c19e8742/svg/emoji_u1f6b2.svg) | Direct match                                           |
| `airplane`         | Airplane              | U+2708  | [View SVG](https://raw.githubusercontent.com/googlefonts/noto-emoji/8998f5dd683424a73e2314a8c1f1e359c19e8742/svg/emoji_u2708.svg)  | Direct match                                           |
| `train`            | Passenger train       | U+1F686 | [View SVG](https://raw.githubusercontent.com/googlefonts/noto-emoji/8998f5dd683424a73e2314a8c1f1e359c19e8742/svg/emoji_u1f686.svg) | Approved concept; canonical ID retained                |
| `balloon`          | Balloon               | U+1F388 | [View SVG](https://raw.githubusercontent.com/googlefonts/noto-emoji/8998f5dd683424a73e2314a8c1f1e359c19e8742/svg/emoji_u1f388.svg) | Direct match                                           |
| `planet`           | Ringed planet         | U+1FA90 | [View SVG](https://raw.githubusercontent.com/googlefonts/noto-emoji/8998f5dd683424a73e2314a8c1f1e359c19e8742/svg/emoji_u1fa90.svg) | Direct match                                           |
| `flying-saucer`    | Flying saucer         | U+1F6F8 | [View SVG](https://raw.githubusercontent.com/googlefonts/noto-emoji/8998f5dd683424a73e2314a8c1f1e359c19e8742/svg/emoji_u1f6f8.svg) | Direct match                                           |
| `crown`            | Crown                 | U+1F451 | [View SVG](https://raw.githubusercontent.com/googlefonts/noto-emoji/8998f5dd683424a73e2314a8c1f1e359c19e8742/svg/emoji_u1f451.svg) | Direct match                                           |
| `shield`           | Shield                | U+1F6E1 | [View SVG](https://raw.githubusercontent.com/googlefonts/noto-emoji/8998f5dd683424a73e2314a8c1f1e359c19e8742/svg/emoji_u1f6e1.svg) | Direct match                                           |
| `test-tube`        | Test tube             | U+1F9EA | [View SVG](https://raw.githubusercontent.com/googlefonts/noto-emoji/8998f5dd683424a73e2314a8c1f1e359c19e8742/svg/emoji_u1f9ea.svg) | Replaces and renames `potion`                          |
| `wand`             | Magic wand            | U+1FA84 | [View SVG](https://raw.githubusercontent.com/googlefonts/noto-emoji/8998f5dd683424a73e2314a8c1f1e359c19e8742/svg/emoji_u1fa84.svg) | Direct match                                           |
| `money-bag`        | Money bag             | U+1F4B0 | [View SVG](https://raw.githubusercontent.com/googlefonts/noto-emoji/8998f5dd683424a73e2314a8c1f1e359c19e8742/svg/emoji_u1f4b0.svg) | Replaces and renames `treasure-chest`                  |
| `ghost`            | Ghost                 | U+1F47B | [View SVG](https://raw.githubusercontent.com/googlefonts/noto-emoji/8998f5dd683424a73e2314a8c1f1e359c19e8742/svg/emoji_u1f47b.svg) | Direct match                                           |
| `dice`             | Game die              | U+1F3B2 | [View SVG](https://raw.githubusercontent.com/googlefonts/noto-emoji/8998f5dd683424a73e2314a8c1f1e359c19e8742/svg/emoji_u1f3b2.svg) | Direct match                                           |
| `puzzle-piece`     | Puzzle piece          | U+1F9E9 | [View SVG](https://raw.githubusercontent.com/googlefonts/noto-emoji/8998f5dd683424a73e2314a8c1f1e359c19e8742/svg/emoji_u1f9e9.svg) | Direct match                                           |
| `star`             | Star                  | U+2B50  | [View SVG](https://raw.githubusercontent.com/googlefonts/noto-emoji/8998f5dd683424a73e2314a8c1f1e359c19e8742/svg/emoji_u2b50.svg)  | Direct match                                           |
| `heart`            | Red heart             | U+2764  | [View SVG](https://raw.githubusercontent.com/googlefonts/noto-emoji/8998f5dd683424a73e2314a8c1f1e359c19e8742/svg/emoji_u2764.svg)  | Direct match                                           |
| `diamond`          | Gem stone             | U+1F48E | [View SVG](https://raw.githubusercontent.com/googlefonts/noto-emoji/8998f5dd683424a73e2314a8c1f1e359c19e8742/svg/emoji_u1f48e.svg) | Same visual concept                                    |
| `cyclone`          | Cyclone               | U+1F300 | [View SVG](https://raw.githubusercontent.com/googlefonts/noto-emoji/8998f5dd683424a73e2314a8c1f1e359c19e8742/svg/emoji_u1f300.svg) | Replaces and renames `spiral`                          |
| `water-drop`       | Droplet               | U+1F4A7 | [View SVG](https://raw.githubusercontent.com/googlefonts/noto-emoji/8998f5dd683424a73e2314a8c1f1e359c19e8742/svg/emoji_u1f4a7.svg) | Same visual concept                                    |
| `four-leaf-clover` | Four-leaf clover      | U+1F340 | [View SVG](https://raw.githubusercontent.com/googlefonts/noto-emoji/8998f5dd683424a73e2314a8c1f1e359c19e8742/svg/emoji_u1f340.svg) | Direct match                                           |
| `eye`              | Eye                   | U+1F441 | [View SVG](https://raw.githubusercontent.com/googlefonts/noto-emoji/8998f5dd683424a73e2314a8c1f1e359c19e8742/svg/emoji_u1f441.svg) | Direct match                                           |
| `music-note`       | Musical note          | U+1F3B5 | [View SVG](https://raw.githubusercontent.com/googlefonts/noto-emoji/8998f5dd683424a73e2314a8c1f1e359c19e8742/svg/emoji_u1f3b5.svg) | Direct match                                           |
| `boot`             | Hiking boot           | U+1F97E | [View SVG](https://raw.githubusercontent.com/googlefonts/noto-emoji/8998f5dd683424a73e2314a8c1f1e359c19e8742/svg/emoji_u1f97e.svg) | Direct match                                           |

## Integration consequences

Replacing a symbol with the same concept and canonical filename is an artwork
change only. Replacing a concept, such as treasure chest with money bag,
requires a small coordinated rename in the typed roster, catalog, deterministic
deck data, tests, and documentation. The mathematical deck construction and
game rules do not change as long as the roster still contains exactly 57 unique
symbols.

The validator now checks roster completeness, the `0 0 128 128` view box,
unsafe or external content, the deployed license, and the exact Git blob hash
of every pinned Noto file. Imported Noto SVGs must not be manually redrawn;
select another official Noto asset and update the manifest when a concept must
change.
