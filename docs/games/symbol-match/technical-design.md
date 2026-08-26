# Symbol Match technical design

**Status:** approved technical design. The separate implementation plan defines
the build order; no gameplay code has been implemented from this document yet.

The approved product name is “Symbol Match” and the stable kebab-case `gameId`
will be `symbol-match`.

## Smallest complete playable version

The initial slice should support this complete loop:

1. create or join a two-player room
2. choose a target score in the lobby
3. start when both seated players are connected
4. show each player their assigned card on the lower side and the opponent's
   reference card on the upper side
5. repeatedly race to select the one symbol shared by the two eight-symbol
   cards, with only the player's lower card being interactive
6. let the authoritative server process every wrong selection and the first
   correct selection for each challenge
7. give the opponent one point for each wrong selection without changing the
   cards
8. award one point for the correct selection, show synchronized success
   feedback, then advance automatically
9. finish when a player reaches the target
10. reconnect without losing the match and allow a host-started rematch

The first slice does not need spectators, bots, ranked matchmaking,
leaderboards, user accounts, custom icon packs, or more than two players.

## Existing architecture to reuse

The game should reuse the current guest identity, room codes, invitation links,
presence, host ownership, reconnection, chat, command acknowledgements,
versioned room-state broadcasts, `useRoomSession`, and `RoomShell`.

The game-owned implementation should contain only its settings, schemas,
actions, private state, public projection, race resolution, timers, scoring,
tests, UI, instructions, animations, and prefixed styles.

Full authoritative room-state broadcasts are sufficient. A challenge can
contain several wrong selections, but human-scale taps, score updates, one
correct answer, and one scheduled transition remain moderate-frequency state
changes. A separate high-frequency transient-event channel would add
complexity without a current need.

## Proposed lifecycle

The shared room phase remains `waiting`, `playing`, or `finished`. While the
room is playing, the game owns a more precise state:

```text
waiting room
    |
    | host starts
    v
challenge-open <------------------+
    |  wrong answer: opponent +1  |
    |  same cards remain open     |
    |                             |
    | first correct answer        | success-feedback timer
    v                             |
challenge-feedback ---------------+
    |
    | any awarded point reaches target
    v
finished
```

A penalty point that reaches the target moves directly from `challenge-open` to
`finished`; it does not wait for a correct selection.

A pause caused by disconnection is represented explicitly in game state, not
by changing the reusable room phases. It preserves scores, consumes the
interrupted cards, rejects input, and waits for reconnection or forfeit.

## Proposed room settings

The smallest settings shape is:

```ts
type SymbolMatchSettings = {
  targetScore: number;
};
```

The server must validate allowed target scores. The creator chooses “Points to
win” on the game entry page, and the host may change it only while the room is
waiting or finished. The default must be exported as a named constant:

```ts
const DEFAULT_SYMBOL_MATCH_TARGET_SCORE = 5;
```

The selector's allowed values are `5`, `7`, and `10`.

## Tunable constants

Rules and presentation timings that are likely to change after play testing
must not be scattered as magic numbers or documented only by comments. Keep
them as named exports in the game-owned shared constants module so the server
and client use the same values.

The initial set should include:

```ts
export const DEFAULT_SYMBOL_MATCH_TARGET_SCORE = 5;
export const SYMBOL_MATCH_TARGET_SCORE_OPTIONS = [5, 7, 10] as const;
export const SYMBOL_MATCH_WRONG_REPEAT_WINDOW_MS = 500;
export const SYMBOL_MATCH_WRONG_FEEDBACK_MS = 500;
export const SYMBOL_MATCH_CORRECT_FEEDBACK_MS = 900;
export const SYMBOL_MATCH_START_COUNTDOWN_MS = 3_000;
export const SYMBOL_MATCH_RECONNECT_GRACE_MS = 60_000;
```

The server remains authoritative for duplicate suppression, countdowns, and
challenge advancement. Public state should contain authoritative expiry or
transition timestamps where clients need to animate toward a server-owned
deadline.

CSS cannot directly import a TypeScript number, but this does not require a
duplicated CSS duration. The React renderer can pass the shared value into a
CSS custom property or inline animation duration. Changing the named constant
then keeps the server transition and visual animation aligned.

Potential later settings such as feedback duration, icon packs, card count,
penalty mode, and multiple-player scoring should not be included until their
rules are chosen.

## Proposed player action

The client requests a selection; it never submits whether the answer is
correct, a score, a winner, or a timestamp.

```ts
type SymbolMatchGameAction = {
  type: "select-symbol";
  challengeId: number;
  symbolId: string;
};
```

The `challengeId` rejects delayed input from a previous challenge. The server
derives the player's assigned card from their identity and verifies that
`symbolId` is present on that card. A client therefore cannot submit the upper
reference card as its selection, and a redundant client-trusted `cardId` is not
needed.

Coordinates, element indexes, client clocks, claimed matches, and replacement
state should not be accepted as authoritative input.

Likely game-owned errors include:

- `CHALLENGE_NOT_OPEN`
- `STALE_CHALLENGE`
- `SYMBOL_NOT_ON_YOUR_CARD`
- `PLAYER_NOT_ELIGIBLE`

The final set should remain small and should reuse core room/lifecycle errors
when they already describe the failure.

## Proposed public state

Every player needs the same authoritative information to render or recover the
current match:

```ts
type PublicSymbolMatchState = {
  status:
    | "countdown"
    | "challenge-open"
    | "challenge-feedback"
    | "paused"
    | "finished";
  countdownEndsAt: number | null;
  challengeId: number;
  cards: [PublicSymbolCard, PublicSymbolCard];
  cardAssignments: Record<string, string>;
  scores: Record<string, number>;
  successFeedback: PublicSuccessFeedback | null;
  recentMistakes: PublicMistakeFeedback[];
  result: PublicSymbolMatchResult | null;
};
```

The finished result must distinguish outcomes instead of relying on a nullable
winner ID:

```ts
type PublicSymbolMatchResult =
  | {
      type: "winner";
      winnerPlayerId: string;
      reason: "target-score" | "deck-score" | "forfeit";
    }
  | { type: "tie"; reason: "deck-exhausted" }
  | { type: "abandoned"; reason: "all-disconnected" };
```

Each public card needs its card ID and eight symbol instances. Each instance
needs a symbol identity and a presentation transform such as position, size,
and rotation. Persisting those transforms in authoritative state—or deriving
them deterministically from a published challenge seed—ensures reconnecting and
different clients render the same challenge.

`cardAssignments` maps each seated player to one of the two canonical cards.
The client uses its current player ID to put its assigned card lower and the
other card upper. The authoritative public state can stay identical for both
players even though each client presents the cards in the opposite order.

Success feedback should identify the answering player, shared symbol, point
recipient, and the time at which the server will advance. Each mistake
feedback entry should identify a unique attempt, answering player, selected
symbol, point recipient, and an expiry time, but must not reveal the correct
symbol. This lets each browser show score changes and overlapping X feedback
without losing a nearly simultaneous result.

Both clients render accepted feedback. A mistake X is anchored to the mistaken
player's card, which appears lower for that player and upper for the opponent.
On success, both shared-symbol instances remain colored, unrelated symbols are
grayscaled, and stars anchor to the exact instance selected.

The challenge remains `challenge-open` while `recentMistakes` contains unexpired
feedback. Clients use each attempt's ID and expiry time to animate it without
locking input. A correct action may close the challenge while one or more X
animations are still visible; those recent mistakes and their awarded points
remain part of the result.

The public client must necessarily know the two cards' symbol identities in
order to render them. Preventing a modified client from reading those IDs is
not a realistic anti-cheat boundary; the first version is a casual game among
friends. The server still prevents clients from changing the score or winning
a stale challenge.

## Proposed private server state

Server-only state should include:

- a reference to the committed deck constant and its stable version
- the match's shuffled 57-card ID order and next undealt index
- the set-aside 57th card ID
- the pending transition timer for the room
- the pending disconnect-forfeit deadline and timer
- enough pause information to resume or replace an interrupted challenge

The actual current cards are public because clients must render them. Scores,
phase, feedback, and the finished result are also public.

## Authoritative race resolution

Node processes the room's incoming actions in a definite order. For an open
challenge, every valid wrong selection applies its penalty and leaves the
challenge open. The first valid correct selection resolves the challenge.

Proposed processing order:

1. Confirm the room is playing and the player is a seated member.
2. Confirm game status is `challenge-open`.
3. Confirm `challengeId` matches the current challenge.
4. Derive the player's assigned card and confirm the submitted symbol exists on
   it.
5. Compare the selected symbol identity with the pair's shared identity.
6. For a wrong selection, apply the per-player, per-symbol 500-millisecond
   duplicate window. If it is not a suppressed duplicate, give the opponent
   one point, publish mistake feedback, and leave the same challenge open.
7. For a correct selection, give the answering player one point and atomically
   replace `challenge-open` with `challenge-feedback`.
8. After either kind of point, finish immediately if the recipient reached the
   target score.
9. Broadcast the new authoritative state.
10. If the match is not over, schedule the next challenge after correct-answer
    feedback.

After a correct selection, later actions observe a non-open challenge or stale
`challengeId` and are rejected without changing state. With nearly simultaneous
wrong and correct actions, server processing order matters: a wrong action
processed first would award its penalty before the correct action closes the
challenge, while a wrong action processed after the correct one would be
rejected. This is the approved conflict rule.

No client-reported send time is used to reorder the race. This matches the
project's stated tolerance for casual rather than precision competitive
netcode.

### Duplicate-tap suppression

Duplicate suppression is scoped to `(challengeId, playerId, symbolId)`. It is
not a global input cooldown:

- the first wrong selection of a symbol counts
- another selection of that same symbol by that player within 500 milliseconds
  does not change the score
- the same symbol counts as a new mistake after 500 milliseconds
- a different wrong symbol always counts, even inside that window
- the opponent is never blocked by another player's X animation or grace
  period

The server uses its own processing time for this window; it does not trust a
client timestamp. The client should also suppress obvious double-taps for
responsive feedback, but the server remains the scoring authority.

A correct selection needs no equivalent grace period. Its first accepted
action closes the challenge atomically, so subsequent correct or incorrect
actions for that challenge are rejected.

## Card construction

### The 55-versus-57 difference in plain language

Think of each symbol as a dot and each card as a line passing through eight
dots. The construction arranges the lines so that every two lines cross at
exactly one dot. That crossing dot is the matching symbol on those two cards.

For eight symbols per card, the complete version of this construction happens
to produce 57 dots/symbols and 57 lines/cards. The number 57 is therefore not a
different player-count choice; it is the maximum complete deck produced by the
underlying pattern.

The commercial product simply uses 55 of those possible cards. Removing two
cards cannot hurt the rule among the cards that remain: any two remaining
cards still shared exactly one symbol before the removal, so they still do
afterward. The publisher describes the current product as containing
[55 cards and 57 symbols](https://www.asmodee.co.uk/pages/games/dobble).

Eight symbols per card fit a finite projective plane of order 7. A complete
construction contains 57 symbol identities and 57 cards; every card contains
8 symbols and every two different cards share exactly one symbol.

One deterministic construction uses arithmetic modulo 7:

- Create 49 ordinary symbols `(x, y)` for `x, y` in `0...6`.
- Create 7 slope-at-infinity symbols, one for each slope `m` in `0...6`.
- Create 1 vertical-at-infinity symbol.
- For each slope `m` and intercept `b`, create a card containing the 7 points
  `(x, m*x + b mod 7)` plus slope-at-infinity `m`. This creates 49 cards.
- For each `a` in `0...6`, create a vertical card containing `(a, y)` for all
  `y` plus the vertical-at-infinity symbol. This creates 7 cards.
- Create one final card containing all 8 infinity symbols.

That produces 57 cards and 57 symbols. Removing any two cards yields a 55-card
subset while preserving the exactly-one-match property between every
remaining pair. We do not need to copy another product's particular omitted
cards or card order.

For the digital game, the chosen starting point is the full 57-card
construction. The production server should import a committed, read-only deck
literal:

```ts
export const SYMBOL_MATCH_DECK = [
  // The generated 57-card structure is committed here.
] as const;
```

The pure deterministic generator should remain in the repository as a
development tool, but production must not invoke it during deployment, server
startup, room creation, or challenge creation. It is run intentionally only
when creating or deliberately revising the committed deck.

Because this keeps both a generator and its generated result, an automated test
must prevent drift by asserting that the generator's in-memory output exactly
equals `SYMBOL_MATCH_DECK`. A stable deck version or fingerprint should also
make unexpected ordered-deck changes visible in code review.

This arrangement requires no Render command beyond the normal build and start
flow. The production server parses the committed deck just like other source
data and every room reuses the same read-only structure.

For perspective, generating 57 cards with 8 symbol memberships would also be
negligible work on the free tier. The committed literal is a product and
inspectability decision, not a necessary performance optimization.

At the start of each match or rematch, the server shuffles all 57 committed card
IDs once and sets the final ID aside. Each challenge consumes the next two IDs
from the remaining 56-card order. The first card is assigned to the host and
the second to the guest. Used cards do not re-enter the draw pile during the
same match, so no individual card or exact pair can repeat. A rematch restores
and reshuffles the full deck.

Because 57 is odd, this produces 28 complete two-card challenges and leaves one
shuffled card unused for that match.

## Challenge opening over the network

The chosen first-version behavior is to make a new challenge interactive as
soon as each client receives its authoritative `challenge-open` state. There
is no additional pre-published or server-owned ready phase between ordinary
challenges. This accepts small network-arrival differences as part of the
casual-netcode scope and avoids another timer and synchronization state.

Only the current pair and its visual transforms need to be sent to clients.
The complete deck and future pair sequence can remain on the server.

The published physical game is documented as containing 55 cards and 57
symbols, but no official source located during this design pass explains why
two of the mathematically possible cards were omitted. Printing constraints
and easier card distribution for some physical variants are commonly proposed
explanations, but should be treated as unverified. Neither issue constrains
this two-player web game.

### Why not create unrelated cards dynamically each challenge?

A dynamic generator could choose one shared symbol, seven symbols unique to
the upper card, and seven different symbols unique to the lower card. That is
valid for the displayed pair and is not mathematically difficult.

However, the fixed 57-card construction is recommended because:

- its guarantee can be exhaustively verified once
- it gives the project a stable, reproducible deck for tests and replays
- symbol frequency is naturally balanced across the complete deck
- it remains useful if later variants compare or distribute more than two
  cards
- the server can still randomize card pairs, positions, sizes, and rotations,
  so play will not feel fixed

Dynamic pair generation is a reasonable later mode, but it provides little
benefit for the first version and lacks the stronger “any two cards in the
deck” property.

The generator should have exhaustive tests that assert:

- exactly 57 cards are generated
- every card has exactly 8 unique symbols
- every pair of different cards intersects in exactly 1 symbol
- every generated symbol has a corresponding art asset and accessible label
- a match draw order never deals a card twice
- a rematch restores and reshuffles all 57 card IDs
- deck exhaustion occurs after 28 dealt challenge slots, including any
  disconnect-interrupted challenges whose cards remain used

## Symbol presentation

Logical identity and visual presentation must be separate. A hammer remains a
hammer regardless of transform.

For each card instance, layout generation should:

- place eight non-overlapping hit targets inside the circle
- vary scale from `0.18` through `0.30` of the card diameter
- vary fixed local rotation continuously from 0 through just under 360 degrees
- preserve a generous minimum pointer target even for visually small symbols
- avoid clipping at the circular edge
- avoid a layout in which nearby symbols overlap or obscure each other

The selected visual transform should be stable for the duration of a challenge.
Animations must not move targets while players can answer.

### Printed layout and whole-card rotation

The approved physical-card model separates two kinds of layout:

1. Each logical card has one fixed “printed” arrangement: its eight symbol
   positions, relative sizes, and local symbol rotations do not change.
2. Every time that card appears in a challenge, the server chooses a new random
   whole-card rotation. Rotating the circular card moves and rotates all eight
   printed symbols together.

This mirrors drawing a circular physical card at an unpredictable angle. A
repeated logical card remains valid and recognizable as the same printed card,
but is much harder to memorize by location. The game should rotate cards but
not mirror them, because mirroring can change an icon's recognizable shape.

Both clients should receive the same server-selected rotations for the two
canonical cards. They then reverse only the vertical presentation order so
each player sees their assigned card below. This gives both players equivalent
visual information and makes reconnects deterministic.

“Do not mirror” means do not reflect a card horizontally or vertically as if
it were seen in a mirror. For example, mirroring would make a right-pointing
rocket point left and would reverse asymmetrical details. A face-up physical
card can be spun through any angle, but it cannot become a mirror image unless
it is flipped over. Symbol Match should reproduce spinning, not reflection.

### Producing the committed printed layouts

The fixed positions, sizes, and local rotations for all 456 symbol instances
should follow the same artifact workflow as the logical deck:

1. Keep a deterministic layout generator as a development tool.
2. Run it intentionally during development, never in production.
3. Commit its generated card-layout data.
4. Test the committed layouts for stable output, overlap, circular-edge
   clipping, and minimum interactive target size.
5. Permit reviewed card-specific overrides when visual inspection finds a
   layout that needs art direction.

Production imports only the committed read-only layout data. Manual overrides
must remain explicit so regeneration does not silently erase them.

The committed layouts validate circular hit targets against a 280-pixel card
diameter and a 44-pixel minimum pointer target. The client should preserve
circular hit areas so its interaction geometry matches these artifact checks.

Keep the approved authoring bounds together as named development constants:

```ts
export const SYMBOL_MATCH_MIN_PRINTED_SYMBOL_SCALE = 0.18;
export const SYMBOL_MATCH_MAX_PRINTED_SYMBOL_SCALE = 0.3;
```

Changing the range later therefore means editing these two adjacent values,
rerunning the development layout generator, visually reviewing its output, and
committing the newly validated layout data. It does not require hand-editing
the 456 symbol instances, changing production commands, or generating layouts
when Render starts. Bounds outside the validated range may create overlaps or
edge clipping, so regeneration and validation must not be skipped.

## Approved initial symbol library

The game needs these 57 distinct, independently drawn symbols. The catalog is
deliberately broader than the screenshot set. Silhouette testing remains an
asset-quality check rather than a pending catalog decision.

| Group              | Symbols                                                                     |
| ------------------ | --------------------------------------------------------------------------- |
| Tools and objects  | hammer, key, anchor, wrench, magnet, bell, lock, camera                     |
| Nature and weather | sun, moon, cloud, lightning bolt, flame, leaf, cactus, snowflake            |
| Animals            | cat, whale, owl, turtle, butterfly, frog, snail, bee                        |
| Food               | apple, cherries, watermelon, mushroom, cupcake, pretzel, carrot, lemon      |
| Travel and space   | rocket, sailboat, bicycle, airplane, train, balloon, planet, flying saucer  |
| Fantasy and games  | crown, shield, potion, wand, treasure chest, ghost, dice, puzzle piece      |
| Shapes and signs   | star, heart, diamond, spiral, water drop, four-leaf clover, eye, music note |
| Additional         | boot                                                                        |

The artwork should use consistent stroke weight and a distinct original style,
but the icons must remain distinguishable by shape. Planet/UFO and
rocket/airplane need particular silhouette testing. Wrench replaces compass,
cactus replaces flower, frog replaces fish, and boot replaces feather to avoid
other close silhouettes.

## Originality and asset policy

This is a product-design precaution, not legal advice. Copyright generally
does not protect a game idea or method, and familiar symbols can be
uncopyrightable, but a particular expressive illustration can be protected.
Names and branding can also raise separate trademark questions.

Therefore the project should:

- not extract, trace, redraw, or ship icons from the reference screenshots
- not use the names, logos, characters, card backs, sound effects, or trade
  dress of the referenced products
- commission or generate a complete original symbol set with documented
  provenance, or use a suitably licensed icon set and comply with its license
- create its own product name, color system, typography, layout, feedback
  effects, and instructions
- run a name/trademark clearance check before a public commercial launch

Relevant United States Copyright Office guidance:

- [Copyright does not protect ideas, systems, or methods](https://www.copyright.gov/help/faq/faq-protect.html)
- [Original visual artwork can be protected; common symbols may not be](https://www.copyright.gov/engage/visual-artists/)
- [Works Not Protected by Copyright, including familiar symbols and designs](https://www.copyright.gov/circs/circ33.pdf)

Other countries can apply different rules. Obtain qualified legal advice if
the game will be marketed commercially or if risk tolerance is low.

## Timing proposal

The initial tunable values are 500 milliseconds for a wrong-answer X and 900
milliseconds for correct-answer feedback. Input remains open during wrong
feedback. Correct feedback closes the challenge and the server advances when
its deadline expires.

A 3-second countdown runs before the first challenge of a match or rematch. It
does not repeat between ordinary challenges because correct-answer feedback
already provides pacing.

## Disconnection proposal

For a two-player race, continuing while one player is disconnected gives the
connected player uncontested points. The approved first behavior is:

- pause when either seated player disconnects
- accept no selections while paused
- preserve scores and player seats
- on reconnection, discard the interrupted challenge and start a fresh challenge
  after a short ready countdown
- if exactly one player remains disconnected for 60 seconds, finish the match
  with the connected opponent winning by forfeit
- if both players disconnect, cancel individual forfeit outcomes and allow 60
  seconds for either to return
- if neither returns during that shared grace period, finish the match as
  abandoned with no winner so normal cleanup can apply
- if one returns first, begin a fresh 60-second grace period for the other
- keep the repository's current explicit host-leave behavior

An active guest's explicit Leave continues to use the existing room behavior
that retains their seat and treats them as disconnected. An explicit host Leave
closes the room.

Phase-specific handling is:

- `countdown`: cancel the timer without consuming cards; restart the complete
  countdown after reconnection
- `challenge-open`: mark both current cards used and pause
- `challenge-feedback`: preserve the point and used cards, cancel the pending
  next-challenge transition, and pause before dealing
- `finished`: update presence only; never alter the result

## Client layout

The web version should be designed for separate devices rather than copying a
shared-phone split screen.

- Desktop: retain the shared application shell, with instructions and room
  information in the left sidebar, the game in the center, and chat in the
  right sidebar. Preserve the same vertical relationship as mobile: opponent
  reference card above, player interactive card below. Scale or slightly
  overlap the cards on short viewports rather than switching to side-by-side.
- Mobile portrait: stack the opponent's reference card above the player's
  interactive card. Each client reverses the logical pair so its own card is
  always lower; neither player rotates their phone.
- Both: the entire symbol is a button with a forgiving invisible hit area;
  feedback overlays do not cause layout shift.

Scores should be labeled from the current player's perspective, such as “Your
points” and the opponent's display name, instead of relying on red/blue order
or a bare `0 • 0` display. The board does not need to copy the reference game's
Exit button; leaving and navigation remain owned by the shared room shell.

Place a compact labeled score bar in the visual gap between the cards on mobile
and desktop. Long display names must truncate without hiding either score.

The first version does not assign canonical colors to host and guest. Position
and explicit labels identify players. Decorative colors must not be interpreted
as authoritative player identity.

During the opening countdown, render face-down or muted circular cards and keep
all symbols hidden. Reveal both cards and enable the lower card only when the
authoritative countdown reaches zero.

## Symbol asset direction

The approved first-version asset direction is a coherent set of 57 original,
colored SVG illustrations with playful thick outlines. SVG keeps edges sharp at
different card sizes and rotations.

Each symbol uses flat color fills and a near-black outline. Do not add internal
highlights, cast shadows, gradients, or textures to some symbols, because those
extra treatments could make them disproportionately easy to recognize. The
soft offset shadow beneath an entire white circular card is separate and
remains approved.

Use this approved visual specification before producing the full set:

- a `viewBox="0 0 128 128"` canvas;
- a transparent canvas background;
- approximately 10 units of safe padding around the illustration;
- an approximately 8-unit near-black outline;
- rounded stroke caps and joins; and
- no text inside an icon.

Do not substitute raster images or a generic icon library in the first-version
art direction unless the user explicitly revisits this decision.

### One asset, several printed sizes

Create exactly one canonical SVG asset for each of the 57 symbols. Do not
create small, medium, and large copies. Every printed occurrence references the
same asset and stores only layout metadata:

```ts
type PrintedSymbolInstance = {
  symbolId: SymbolId;
  x: number;
  y: number;
  scale: number;
  rotationDegrees: number;
};
```

For example, `hammer.svg` may be printed at scale `0.19` on one card and `0.28`
on another. Both instances render the same canonical SVG. The size-range
decision controls the minimum and maximum `scale` values produced by the
committed layout generator; it does not create additional image files.

### Symbol catalog and names

“Symbol roster” means the complete catalog of 57 symbol concepts used by the
deck. Every symbol needs one catalog entry—not just exceptional names—because
the application must associate its stable ID, accessible label, and SVG asset:

```ts
type SymbolDefinition = {
  id: SymbolId;
  label: string;
  asset: SvgAsset;
};
```

Use the same natural concept in the ID and label wherever possible. The catalog
therefore uses `dice`, `flying-saucer`, `lightning-bolt`, `water-drop`, and
`four-leaf-clover`, with corresponding human labels “Dice,” “Flying saucer,”
“Lightning bolt,” “Water drop,” and “Four-leaf clover.” These are canonical
names, not special-case mappings or additional symbols.

## Board and card direction

- Keep the game-board container transparent so the existing `RoomShell` page
  background remains visible. Do not add another solid-color or rounded desktop
  panel behind the cards.
- Keep circular card faces white.
- Give both card edges and original symbol illustrations bold dark/black
  outlines with rounded visual treatment, inspired by the readability of the
  references but without copying their exact artwork.
- Add soft offset shadows beneath cards.
- Let the brightly colored SVG symbols provide most of the visual variety.
- Do not tie card or board colors to host or guest identity.

The score bar and temporary status surfaces may use small translucent or opaque
containers for readability, but they must not visually become a second board
background.

## Challenge duration and card replacement

An open challenge has no time limit. It remains active until a correct
selection, a match-ending penalty, a disconnection pause, or room closure.

After the 900-millisecond correct feedback completes, replace the cards
immediately with the next pair. Do not add a separate card movement or
replacement animation in the first version. This can be revisited after play
testing.

## Canonical symbol identity

Every symbol has one canonical SVG, fixed color palette, and accessible name
across the entire deck. Card-specific printed layout may change its size,
position, and local rotation, and the whole card receives a random rotation,
but the underlying illustration and colors never change.

## Audio

The first version has no sound effects, music, audio settings, or mute control.
Audio can be considered after the visual game is playable.

## Accessibility requirements

- Never use color as the only difference between symbols or players.
- Give every symbol button an accessible name.
- Maintain keyboard focus and a visible focus indicator.
- Honor reduced-motion preferences for stars, fades, and card transitions.
- Keep symbol hit areas large enough for touch even when the drawn icon is
  visually small.
- Announce challenge results and score changes in a non-disruptive live region.

Because reading accessible labels could provide a different interaction speed
than visual scanning, accessibility testing should measure playability rather
than merely checking markup.

## Verification outline

Before implementation can be considered complete, tests should cover:

- card-generation invariants for all card pairs
- exact equality between development-generator output and the committed deck
- the committed deck's stable ordered fingerprint
- settings boundaries and malformed actions
- correct and incorrect scoring
- server-order outcomes for competing wrong and correct answers
- per-player, per-symbol duplicate-tap suppression
- stale actions after a challenge has resolved
- target-score finish behavior
- feedback timer and next-challenge transition
- disconnect, reconnect, pause, forfeit, abandonment, tie, and rematch behavior
- public projection without future challenge leakage
- create, join, start, action, broadcast, finish, and reconnect through
  Socket.IO
- desktop and mobile interaction smoke tests
- regression checks for Card Banking

## Final assumption audit

### First discussion group: core play

The catalog, printed scale range (`0.18`–`0.30`), and full local rotation range
(`[0, 360)`) are approved. The final narrow cases are also resolved:

1. A disconnect that consumes the final playable pair finishes the match
   immediately by deck score.
2. An accepted wrong-answer X finishes its remaining animation even if
   correct-answer feedback begins.
3. A match-ending wrong answer locks gameplay immediately, then shows its X for
   500 milliseconds before the finished view.
4. Haptic vibration is excluded from the first version.

### Explicitly deferred: feel and content

1. Fixed icon pack only or host-selectable packs later.
2. Haptics where supported and reduced-motion alternatives.

### Explicitly deferred: lifecycle and expansion

1. Spectators and late joining.
2. A future three-or-more-player penalty rule.
3. Match history, challenge history, and persistent statistics.
