# Symbol Match implementation plan

**Status:** implementation in progress; Phases 1 through 3 are complete.

This plan translates the approved [rules](./rules.md) and
[technical design](./technical-design.md) into repository-specific work. Those
documents remain the product and behavior source of truth if this plan omits a
detail.

## Delivery principle

Build one complete two-player, server-authoritative game without generalizing
Symbol Match rules into the reusable multiplayer layer. Reuse room identity,
presence, invitations, chat, state broadcasts, and `RoomShell`. Add only the
small reconnect lifecycle hook that the approved pause behavior requires.

The logical deck and printed card layouts are generated intentionally during
development and committed as read-only artifacts. Render must only run the
normal build and start commands.

## Phase 1: shared contract

- [x] Create `packages/shared/src/game/symbol-match/types.ts`.
- [x] Export the stable `SYMBOL_MATCH_GAME_ID` value, player limits, target
      options, timing constants, scale bounds, symbol IDs, settings, action,
      public-state, result, feedback, and command-error types.
- [x] Represent the only client action as a symbol selection containing the
      current `challengeId` and selected `symbolId`. Never accept a score,
      claimed match, client timestamp, card assignment, or transform from a
      client.
- [x] Define public challenge cards with only the current card ID, assigned
      player ID, whole-card rotation, and eight printed symbol instances. Do
      not publish the draw order, set-aside card, future pairs, or repeat-window
      bookkeeping.
- [x] Create `packages/shared/src/game/symbol-match/schemas.ts` with strict
      runtime validation for settings and actions.
- [x] Add the Symbol Match entry to `GameContractMap` and shared exports without
      weakening existing types. Keep runtime activation out of
      `SUPPORTED_GAME_IDS` until its server module and client renderer exist, so
      an intermediate deployment cannot create an unplayable room.
- [x] Add contract tests for allowed target scores (`5`, `7`, and `10`), the
      default of `5`, malformed selections, and exhaustive symbol IDs.

### Planned public phases

Use explicit public phases so the client renders authoritative state rather
than recreating the lifecycle:

- `countdown`
- `challenge-open`
- `challenge-feedback`
- `paused`
- `ending-feedback`
- `finished`

Each timed phase publishes its server-owned deadline. Wrong feedback entries
publish unique IDs and expiry timestamps while leaving the challenge open.

## Phase 2: reusable reconnect hook

The existing `GameModule` contract provides `handlePlayerDisconnected` but no
corresponding notification when an existing seated player reconnects. Symbol
Match must restart its countdown only after both seats are connected.

- [x] Add a game-module `handlePlayerConnected` hook that may return an updated
      game state or `null`.
- [x] Call it only when `joinRoom` or `requestState` changes an existing seated
      player from disconnected to connected. Do not call it for an unrelated
      new player joining a waiting room.
- [x] Preserve the connected player, authoritative clock, and updated room in
      the callback input so the future Symbol Match module can cancel its grace
      outcome and begin a fresh countdown when both players are present. The
      game-specific transition remains part of Phase 4.
- [x] Give Card Banking and the test-only first-response module explicit no-op
      implementations so their behavior cannot change accidentally.
- [x] Add reusable room-manager tests for hook invocation, returned-state
      commits, duplicate-session
      replacement, and idempotent state requests.

Do not add a Symbol Match condition to generic socket handlers or
`RoomManager`.

## Phase 3: deterministic deck and printed-layout artifacts

Create a server-owned folder at
`apps/server/src/game/symbol-match/artifacts/` containing:

- [x] a pure finite-projective-plane deck generator;
- [x] the committed 57-card deck literal;
- [x] a deterministic printed-layout generator;
- [x] the committed layouts for all 456 symbol occurrences; and
- [x] a stable version or fingerprint for each committed artifact.

The deck generator must always produce the same ordered construction. The
layout generator must use a fixed development seed and the approved bounds:

```ts
export const SYMBOL_MATCH_MIN_PRINTED_SYMBOL_SCALE = 0.18;
export const SYMBOL_MATCH_MAX_PRINTED_SYMBOL_SCALE = 0.3;
```

Every printed occurrence stores `symbolId`, normalized `x` and `y`, `scale`,
and a fixed local rotation in `[0, 360)`. Invisible hit targets, not only the
visible SVG boundaries, must fit without overlapping or crossing the circular
card edge.

- [x] Provide an intentional development command that regenerates the two
      committed artifacts.
- [x] Never invoke either generator during production build, startup, room
      creation, match start, or challenge creation.
- [x] Assert exact equality between generator output and committed data.
- [x] Assert 57 cards, 57 symbols, 8 unique symbols per card, 8 appearances per
      symbol, and exactly one intersection for every pair of cards.
- [x] Assert 57 complete layouts, 456 valid placements, bounded sizes,
      non-overlapping hit targets, no clipping, valid rotations, and stable
      fingerprints.
- [x] Allow reviewed, explicit per-card layout overrides without making
      regeneration silently erase them.

## Phase 4: server game module

Create `apps/server/src/game/symbol-match/` with private room/state types and a
`SymbolMatchGameModule` registered through the existing static game registry.

### Match creation

- [ ] Require exactly two connected seated players.
- [ ] Validate and freeze the selected target score for the match.
- [ ] Shuffle all 57 committed card IDs with injected server RNG, set the final
      ID aside, and retain 56 playable IDs.
- [ ] Reset scores and begin the authoritative three-second countdown without
      dealing visible symbols early.
- [ ] At countdown completion, consume the next two cards, assign the first to
      the host and second to the guest, choose independent random whole-card
      rotations in `[0, 360)`, and open the challenge.

### Selection processing

- [ ] Reject selections outside `challenge-open`, from non-seated or
      disconnected players, for stale challenge IDs, or for symbols absent
      from that player's assigned card.
- [ ] Derive the one shared symbol from authoritative card data.
- [ ] Apply the 500-millisecond repeat window per player, challenge, and symbol.
      Suppress only an accidental repeat of the same symbol; different wrong
      symbols each count.
- [ ] On a wrong selection, award the opponent one point, add an expiring
      shared X-feedback entry, and keep the challenge open.
- [ ] If that penalty reaches the target, lock actions immediately, retain the
      X for 500 milliseconds, and then publish the finished result.
- [ ] On the first correct selection, award the answering player one point,
      close the challenge, publish both highlighted matches plus stars around
      the clicked instance, and retain any unexpired wrong X entries.
- [ ] After 900 milliseconds, either finish at the target or deal the next pair
      immediately without another countdown.
- [ ] Let server processing order decide close races. A processed wrong answer
      followed by a correct answer can award two points; an action processed
      after the correct answer is rejected as stale or closed.

### Exhaustion, pause, and results

- [ ] Mark both displayed cards used when a challenge opens; never return them
      to the same match's draw order.
- [ ] Finish by current score when no complete pair remains; publish a tie for
      equal scores.
- [ ] On an open-challenge disconnect, discard the challenge and keep its cards
      used. If they were the final pair, finish immediately by deck score.
- [ ] On a countdown disconnect, cancel the countdown without consuming cards.
- [ ] On a feedback disconnect, preserve accepted points and used cards, then
      pause before the next deal.
- [ ] While paused, reject actions and publish disconnected seat IDs plus an
      authoritative grace deadline.
- [ ] After reconnection, begin a fresh three-second countdown and then consume
      the next unused pair.
- [ ] If exactly one player remains disconnected for 60 seconds, finish with
      the connected opponent winning by forfeit.
- [ ] If both disconnect, abandon after the shared 60-second interval unless
      one returns; if one returns, start a fresh interval for the other.
- [ ] Preserve finished results across presence changes.
- [ ] On host-started rematch, return to setup, allow target-score changes,
      reset scores, restore all 57 cards, and reshuffle only when Start is
      pressed.

### Scheduling and projection

- [ ] Keep countdown, correct-feedback, ending-X, and disconnect deadlines in
      game state and schedule them through the module-owned transition hook.
- [ ] Make timer callbacks idempotent by checking the expected state phase,
      challenge ID, and deadline before transitioning.
- [ ] Cancel all room timers in `dispose`.
- [ ] Prune expired wrong-feedback entries while keeping their client expiry
      timestamps authoritative.
- [ ] Project only current public information and verify that server-only draw
      order, set-aside card, RNG details, and duplicate-suppression history
      never reach clients.

## Phase 5: server tests before UI

Create `symbolMatchGame.test.ts` beside the module and use injected RNG, clock,
and short timers.

- [ ] Cover start permissions, exact player count, settings, countdown, fixed
      host/guest assignment, card consumption, and whole-card rotations.
- [ ] Cover correct scoring, wrong scoring, repeated same-symbol suppression,
      different-symbol penalties, and wrong feedback that does not lock input.
- [ ] Cover wrong-before-correct, correct-before-wrong, stale challenge IDs,
      malformed symbols, and simultaneous Socket.IO actions.
- [ ] Cover target reached by correct and wrong answers, including their
      respective feedback delays.
- [ ] Cover all exhaustion wins and ties, including a disconnect consuming the
      last pair.
- [ ] Cover every countdown/open/feedback/finished disconnect path, one-player
      forfeit, two-player abandonment, first return, second return, and grace
      expiry.
- [ ] Cover rematch setup, target changes, full deck restoration, new shuffle,
      and host-only Start.
- [ ] Extend Socket.IO integration coverage with create, join, chat, start,
      selection, state broadcast, pause, reconnect countdown, finish, and
      rematch for `symbol-match`.

Do not start client board work until the shared contract, artifacts, server
rules, and deterministic tests are passing.

## Phase 6: original SVG symbol library

Create one original client asset for every approved symbol under
`apps/client/src/game/symbol-match/symbols/`.

- [ ] Use exactly one SVG per symbol with `viewBox="0 0 128 128"`, transparent
      background, approximately 10 units of safe padding, approximately 8-unit
      near-black outlines, rounded joins/caps, and no text.
- [ ] Use flat canonical fills only: no internal highlights, shadows,
      gradients, filters, or textures.
- [ ] Create an exhaustive typed client catalog mapping every `SymbolId` to its
      SVG and accessible label. Avoid aliases such as both `die` and `dice`.
- [ ] Validate the file count and one-to-one catalog coverage automatically.
- [ ] Produce a development contact sheet at several sizes and rotations for
      visual inspection, without shipping it in the game UI.
- [ ] Specifically compare planet/flying saucer and rocket/airplane silhouettes
      at the smallest printed size and in grayscale.
- [ ] Record asset provenance and confirm none of the screenshot art was
      extracted, traced, or redrawn.

## Phase 7: catalog, entry, and lobby UI

- [ ] Activate `symbol-match` in `SUPPORTED_GAME_IDS` only after its server
      module and client entry/room renderers are registered in the same
      deployable change.
- [ ] Add Symbol Match metadata to `gameCatalog.ts` as a two-player game.
- [ ] Add a `SymbolMatchEntryPage` selected by `GameEntryPage`.
- [ ] Reuse display-name, room-code joining, connection, and room-creation
      components.
- [ ] Present “Points to win” options `5`, `7`, and `10`, defaulting to `5`.
- [ ] Add a `SymbolMatchRoom` selected only after `RoomPage` narrows
      `room.gameId`.
- [ ] Reuse `RoomShell`, invitation controls, Leave behavior, chat, and mobile
      panels.
- [ ] Put the approved instructions in the left room menu.
- [ ] Show player presence and settings in waiting/rematch setup. Only the host
      can change target points or press Start; the guest sees waiting text.

## Phase 8: responsive game board

Create game-owned React components and `symbolMatch.css` with globally scoped
selectors and keyframes prefixed `sm-` or `symbol-match-`.

- [ ] Keep the central board transparent over the existing `RoomShell`
      background.
- [ ] Render the opponent's assigned card above and the current player's card
      below on every client and viewport. Only lower-card symbols are buttons.
- [ ] Keep circular faces white with bold near-black borders and soft offset
      card shadows; do not tie colors to host or guest.
- [ ] Position symbols from normalized committed layout data, apply local
      rotations, then rotate the entire card by the server-provided angle. Do
      not mirror cards.
- [ ] Scale the same SVG asset for every occurrence; never create size-specific
      copies.
- [ ] Place `You 4 • 3 Sarah`-style score/status content between the cards and
      truncate long names without hiding scores.
- [ ] Give every lower symbol a forgiving, non-overlapping minimum 44-by-44-px
      hit target while preserving the visual 18%–30% scale.
- [ ] Render countdown cards without visible symbols until the server deadline.
- [ ] Render wrong X feedback on the mistaken card for both clients without
      locking the open challenge.
- [ ] During correct feedback, grayscale unrelated symbols, preserve both
      matching symbols in color, show stars around the clicked instance, and
      allow an existing X to finish.
- [ ] Show pause status and the authoritative reconnect countdown; reject
      optimistic local score or phase changes.
- [ ] Show winner, tie, forfeit, deck-score, or abandoned results and the
      approved host/guest rematch controls.
- [ ] Use shared timing constants as CSS custom properties so animation and
      server deadlines stay aligned.
- [ ] Honor reduced motion, visible keyboard focus, accessible button names,
      live score/result announcements, touch input, and browser zoom.
- [ ] Keep the vertical board playable on portrait mobile, landscape mobile,
      short desktop viewports, and the existing desktop instructions/chat
      columns without requiring page rotation.

## Phase 9: full verification and isolation audit

- [ ] Run `npm run lint`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Smoke-test two independent browser sessions through catalog, room
      creation, invitation join, countdown, correct/wrong races, disconnect,
      reconnect, finish, and rematch.
- [ ] Test target scores 5, 7, and 10 on mobile and desktop.
- [ ] Test rapid same-symbol double taps and rapid different-symbol taps on a
      touch device.
- [ ] Test keyboard operation, focus visibility, reduced motion, and live
      announcements.
- [ ] Confirm Render still needs only its existing build/start workflow.
- [ ] Confirm Card Banking behavior and styling remain unchanged.
- [ ] Search reusable folders for Symbol Match phases, scores, card IDs, and
      timers. Concrete references are allowed only at shared contract,
      registry, room-union, catalog, and renderer-selection boundaries.
- [ ] Verify socket handlers, generic room data, `useRoomSession`, and
      `RoomShell` contain no Symbol Match rules.

## Definition of done

Symbol Match is complete when two players on separate browsers can create or
join a room, configure and start a match, race through the fixed shuffled deck,
receive server-ordered scoring and synchronized feedback, pause and reconnect,
finish by every approved outcome, and set up a host-controlled rematch—all with
original SVG artwork, responsive accessible interaction, and no regressions to
Card Banking or the reusable multiplayer foundation.
