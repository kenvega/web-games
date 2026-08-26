# New game session handoff

## Instructions for the next session

Read this file, [Adding a game](./adding-a-game.md), and
[Reusable multiplayer architecture](./reusable-multiplayer-architecture.md)
before proposing changes.

Start by planning the smallest complete playable version with the user. Do not
edit code until the game rules and lifecycle below are sufficiently defined.
Ask focused questions in manageable groups rather than asking for the entire
design at once.

## Current project state

- The reusable multiplayer separation roadmap is complete.
- The architecture work is committed through `b585392`.
- Card Banking is the only production game.
- A test-only first-response module proves that differently shaped,
  non-turn-based contracts fit the shared and server game boundaries. It is not
  registered in production or shown in the client.
- The current verification baseline is 37 passing tests plus clean lint,
  type-check, and production-build commands.
- Current documentation is indexed in [Documentation](./README.md).

## Known intent for the next game

The user wants to add another production game while reusing the existing room,
invitation, presence, reconnection, chat, and real-time communication tooling.

The early concept is a real-time game rather than a turn-based game:

- More than one player may be able to act without waiting for a turn.
- Players should see relevant actions or resulting state changes from other
  clients in real time.
- When players compete to respond, the first valid action processed by the
  authoritative server may win.
- Extremely precise competitive netcode is not currently required.

These are tentative characteristics, not finalized rules. Do not assume the
test-only first-response fixture is the game the user wants to build.

## Decisions required before coding

Work with the user to define:

1. The game name and stable kebab-case `gameId`.
2. The smallest complete playable loop.
3. Minimum and maximum players.
4. Lobby settings and which settings the host may change.
5. Public game state versus server-private state.
6. Client actions and their Zod schemas.
7. Who may act in each game phase.
8. How simultaneous or conflicting actions are resolved.
9. Which actions and outcomes every player can see.
10. Start, finish, scoring, winner, and restart rules.
11. Timers or scheduled transitions.
12. Disconnect and reconnect behavior during active play.
13. Whether full room-state broadcasts are frequent enough, or whether the
    game genuinely needs throttled game-specific transient events.
14. The initial desktop and mobile UI needed for the playable loop.

Prefer a written rules/design file under `docs/games/<game-id>/` once these
decisions stabilize.

## Reusable infrastructure to keep

Do not rebuild these inside the new game:

- Guest identity and stored display names.
- Game catalog and universal room-code joining.
- Room creation transport.
- Room codes and shareable `/room/:roomCode` invitation links.
- Membership, presence, host ownership, leaving, cleanup, and versioning.
- Socket connection, reconnection, acknowledgements, and error transport.
- Room chat and mobile chat notifications.
- `useRoomSession` and `RoomShell`.
- Server-authoritative command processing and room-state broadcasts.

## Game-owned responsibilities

The new game should own:

- Settings, actions, public state, private server state, and domain errors.
- Runtime settings and action schemas.
- Player limits and start/finish rules.
- Simultaneous-action or conflict-resolution rules.
- Timers and scheduled transitions.
- Active-player disconnection behavior.
- Entry UI, lobby controls, board, instructions, history, animations, and
  game-prefixed CSS.
- Rule and gameplay tests beside its server module.

## Intentional composition points

Adding the production game requires explicit updates. These are expected and
should remain easy to audit:

- `packages/shared/src/gameIds.ts`
- The new `packages/shared/src/game/<game-id>/` contracts and schemas.
- `GameContractMap` in `packages/shared/src/types.ts`.
- `GameModuleMap` and `createGameRegistry` on the server.
- The internal `Room` union in `apps/server/src/rooms/types.ts`.
- The client game catalog.
- `GameEntryPage` and `RoomPage` renderer-selection switches.

Do not replace these with dynamic plugin loading.

## Implementation principles

- Keep the server authoritative. Clients request actions; they do not submit
  trusted replacement state, winners, scores, or timestamps.
- Validate all client payloads at runtime.
- Preserve the correlation between `gameId` and settings, actions, room state,
  command inputs, and domain errors through `GameContractMap`.
- Do not weaken game types to `unknown` or generic JSON merely to make a union
  compile. Generic transport envelopes may remain opaque until the selected
  module validates them.
- Use full authoritative state broadcasts for occasional or moderate-frequency
  actions. Add transient events only if the concrete game requires them.
- Keep new game imports out of reusable room, socket, chat, session, and shell
  code. Concrete imports belong at the explicit composition points above.
- Do not generalize another concept until both production games actually share
  it and extraction improves navigation.
- Preserve Card Banking behavior and its game-owned contracts, tests, UI, and
  CSS.
- Do not rewrite `docs/implementation-plan.md` or split the mixed content in
  `docs/games/card-bank/rules.md` unless the user explicitly revisits those
  earlier decisions.

## Recommended implementation sequence

After the plan is approved, follow [Adding a game](./adding-a-game.md):

1. Add shared ID, contracts, schemas, command types, public room type, and
   domain errors.
2. Add the private server room/state types and `GameModule` implementation.
3. Register the server module and internal room union member.
4. Add catalog metadata, the game-owned entry page, and the typed room
   renderer.
5. Add rule tests, conflict tests, Socket.IO coverage, and desktop/mobile smoke
   tests.
6. Run an isolation audit and confirm Card Banking still works.

Run the complete repository checks before handoff:

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

## Suggested first message in the new session

> Read `docs/new-game-session-handoff.md`, `docs/adding-a-game.md`, and
> `docs/reusable-multiplayer-architecture.md`. I want to design and add the
> second production game. Do not edit code yet. Help me define the smallest
> playable version and resolve the open gameplay, real-time conflict, state,
> timing, and disconnection decisions before we make an implementation plan.
