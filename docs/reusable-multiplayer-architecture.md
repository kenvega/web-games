# Reusable multiplayer architecture

For the implementation sequence, use the
[Adding a game checklist](./adding-a-game.md).

## Purpose

This repository is intended to host multiple small multiplayer games while
sharing one understandable multiplayer foundation. Reuse should happen at
clear boundaries; the goal is not to turn every game concept into a generic
framework.

The reusable layer should answer questions such as:

- Who is this browser guest?
- Which room are they in?
- Who is connected and who is the host?
- How are commands validated, acknowledged, and broadcast?
- How does a client recover the latest state after reconnecting?
- How are invitations and room chat handled?

Each game should continue to answer its own questions about rules, actions,
timing, scoring, settings, visuals, and reactions to player disconnection.

## Boundary

### Reusable multiplayer foundation

- Guest identity and stored display names.
- Socket connection and reconnection status.
- Typed Socket.IO commands, acknowledgements, and errors.
- Room-code generation and shareable room links.
- Room creation, joining, leaving, cleanup, and versioning.
- Membership, presence, host ownership, and duplicate-session replacement.
- Chat validation, retention, transport, and UI.
- Common lobby primitives such as player lists and connection indicators.
- Server-authoritative command processing and state broadcasts.
- Express, Socket.IO, deployment, and generic room integration tests.

### Game-specific code

- Game state and action types.
- Runtime schemas for game settings and actions.
- Minimum and maximum players when they differ by game.
- Start and finish conditions.
- Rules, scoring, turns, timers, and conflict resolution.
- Behavior when an active player disconnects.
- Game board, animations, instructions, history, and branding.

## Room identity

Every room has an explicit `gameId`. A room must never rely on the currently
rendered page or a server default to determine which game it represents.

The currently supported identity is:

```text
card-bank
```

The shared package owns the validated list of supported IDs. `gameId` is
required by the room-creation command, stored in the server's room record, and
included in every public room state. Joining still requires only a room code:
after joining, the returned room state tells the client which game owns the
room. This allows invitation URLs to remain game-independent:

```text
/room/:roomCode
```

Adding a future game begins by adding its stable ID to the supported list.
Changing an existing ID should be treated as a compatibility change because
room state, routes, logs, and future persistence may depend on it.

## Current extraction status

1. **Game identity. Complete.** Rooms explicitly carry a validated `gameId`.
2. **Shared room state. Complete.** The shared room fields live in
   `PublicRoomBase`. Card Banking owns its settings and state under
   `room.game`. Generic players no longer carry a numeric score.
3. **Room manager game selection. Complete.** `RoomManager` resolves game
   behavior from the game registry using the room's `gameId`.
4. **Game payload validation. Complete.** Generic command schemas validate
   room and identity envelopes. The registry-selected game module validates
   its own settings and actions.
5. **Game timers. Complete.** Game modules own their scheduled transitions,
   including delays, timer handles, resolution rules, and cancellation.
6. **Client room boundary. Complete.** A reusable room-session hook and room
   shell own multiplayer behavior and shared UI. `RoomPage` selects a
   game-owned room renderer using the server-provided `gameId`.
7. **Game entry pages. Complete.** The main route is a reusable game catalog
   and room-code join surface. Game-specific creation UI lives behind
   `/games/:gameId`.
8. **Second-game contract proof. Complete.** A test-only first-response game
   defines a separate shared contract and server module, coexists with Card
   Banking in a typed registry, and verifies a first-valid-response rule. It is
   deliberately absent from the production game IDs, catalog, and routes.

Each extraction preserves a working Card Banking game and includes verification
for the reusable contract it introduces.

## Room data

The generic room model contains the room code, game ID, phase, host, players,
chat, and version. Game-owned data sits under one property:

```text
room.game.settings
room.game.state
```

Room creation and settings commands use the same game-specific settings shape.
For Card Banking that shape currently contains `extraLivesEnabled`.

Shared contract ownership follows the same boundary as the applications:
`packages/shared/src/multiplayer.ts` contains reusable room, player, chat, and
command-envelope primitives; `packages/shared/src/gameIds.ts` composes the
supported IDs; and each `packages/shared/src/game/<game-id>` folder owns its
settings, actions, constants, public state, and public room type. The root
`packages/shared/src/types.ts` contains a `GameContractMap` that correlates
each supported ID with those game-owned types, then derives the public room,
command, and error unions exported to clients and the server.

`PublicRoomState` is a discriminated room type. When another game is added, it
should add another room type keyed by its `gameId`, then join that type to the
`PublicRoomState` union. Do not weaken game settings or state to `unknown` or a
generic string-keyed object.

Scores belong to the game state. Card Banking publishes them through final
standings. `PublicPlayer` contains identity and presence only.

The server mirrors this ownership. `apps/server/src/rooms/roomBase.ts` defines
the reusable internal room fields. Each server game folder owns its private
state and a concrete `RoomBase` specialization; `apps/server/src/rooms/types.ts`
is only the explicit union of those registered room types. A game module works
with its own room type rather than the complete cross-game union.

## Intended server shape

The server uses a small, explicit game registry:

```text
gameId -> game module
```

A game module owns its settings and action schemas, player limits, state
creation, action handling, reactions to player disconnection, scheduled
transitions, finish detection, public-state projection, and room cleanup hook.
The room service owns command-envelope validation plus membership and lifecycle
checks that apply to every game. It asks the selected module for these decisions
instead of reading fields from a game's private state.

A static registry is preferred over a dynamic plugin system. It keeps supported
games visible in the repository and makes invalid game IDs fail predictably.

`createGameRegistry` constructs one module instance for each supported game.
The module instance contains behavior and injected dependencies. Each room
continues to hold its own settings and state. `RoomManager` accepts a registry,
which lets tests provide deterministic game dependencies without adding
game-specific constructor options to the room manager.

To register another game, add its module type to `GameModuleMap` and construct
it in `createGameRegistry`. The compiler then requires the registry to cover
every supported `GameId`.

The registry class itself is generic over its module map. The production
factory still returns the closed `GameModuleMap`, while
`apps/server/src/__tests__/fixtures/firstResponseGame.ts` builds a two-game
registry without pretending that its fixture is a supported application game.
The shared `PublicRoomBase` and command-input helpers, plus the server
`RoomBase`, therefore accept any literal string ID; the production
`GameContractMap`, `PublicRoomState`, schemas, and registry factory remain the
places that restrict runtime behavior to supported IDs.

Server type checking includes test sources through `tsconfig.test.json`. This
makes the fixture a compile-time proof as well as a runtime test: its settings,
actions, internal room, public room, command inputs, and module implementation
must continue to satisfy the intended extension contracts.

The generic create-room, update-settings, and game-action schemas deliberately
treat `settings` and `action` as opaque payloads. After resolving a module by
the validated `gameId` (or by the room's stored `gameId`), `RoomManager` passes
the payload to that module's `settingsSchema` or `actionSchema`. The generic
room service must not import a concrete game's payload schema.

After each committed room change, `RoomManager` gives the selected module an
opportunity to synchronize a scheduled transition. Card Banking uses that hook
for its bust-reveal and ending delays. When a timer fires, the module produces
the next game state; `RoomManager` verifies that the room still exists, commits
the state, and publishes a generic transition notification. The socket handler
subscribes to that notification only to broadcast room state and game events.

Pending timers are keyed by room code inside the game module. The module's
cleanup hook cancels them when a room closes or the server shuts down. Generic
room and socket code must not inspect a game's phases or define its delays.

## Client room boundary

The reusable `useRoomSession` hook owns joining, leaving, reconnecting,
receiving versioned state, display-name confirmation, chat commands, shared
room commands, and game-action transport. It accepts a room code and has no
Card Banking imports or knowledge of a game's settings and action contents.
Its settings and action functions take a `gameId` plus the corresponding
payload from `GameContractMap`; the universal `RoomPage` supplies that ID only
after narrowing the authoritative room union. A game renderer therefore
receives its exact action and settings types without teaching the session hook
about the game.

`RoomShell` owns the shared in-room frame: connection and host-disconnection
messages, room code and invitation controls, leave controls, chat, and common
mobile panels. Game renderers provide branding, room-menu content, and the
central lobby or board content through explicit component properties.

The universal `RoomPage` waits for authoritative room state, then selects a
game-owned room renderer by `room.gameId`. Card Banking's room renderer,
settings, instructions, banking history, card components, and board all live
under `client/src/game/card-bank`. Adding another game requires another typed
renderer and another explicit case in the room-page selection switch; it does
not require duplicating socket listeners or reconnection logic.

## Game catalog and entry boundary

The root route renders `GameCatalogPage`. Catalog metadata is stored in a
typed record covering every supported `GameId`, so adding an ID also requires a
title, description, player-count label, and entry path. The catalog includes a
reusable room-code join form; joining remains independent of game selection
because the authoritative room state supplies the `gameId`.

`useGuestDisplayName` centralizes browser guest identity plus display-name
validation and storage. `RoomJoinForm` owns room-code validation and universal
invitation navigation. `useCreateRoom` owns connection readiness, the shared
create-room command, acknowledgement errors, and navigation to the created
room.

`GameEntryPage` validates the route's `gameId` and explicitly selects a
game-owned entry renderer. Card Banking's entry renderer owns its branding,
description, default settings, settings controls, and construction of its
typed create-room payload. Adding another game requires a catalog entry, an
entry-renderer case, and that game's own settings form; it does not require
changing the reusable join or create transport.

The route structure is:

```text
/                         game catalog
/games/:gameId            game-specific create/join page
/room/:roomCode            universal invitation destination
```

The universal room route should render the appropriate game only after reading
the server-provided `gameId`.

## Real-time behavior

The shared action pipeline is event-driven, not inherently turn-based. A game
module may accept actions from every player and use the order in which the
server processes valid actions to resolve contention.

Full authoritative room-state broadcasts are appropriate for occasional or
moderate-frequency actions. A future movement-heavy game may add throttled
game-specific transient events and periodic snapshots without moving that
traffic into the generic room API.

## Design rules for future changes

- Reusable room/session code must not import a concrete game's UI. Explicit
  renderer-selection pages are the boundary where those imports belong.
- Prefer game-owned state over optional game fields added to the generic room.
- Validate all client commands at runtime.
- Clients request actions; they never submit trusted replacement state.
- Preserve the room code as the invitation authority.
- Prefer a small registry and discriminated types over an elaborate plugin
  framework.
- Do not generalize a concept until at least two games need the same behavior.
