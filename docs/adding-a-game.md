# Adding a game

Use this checklist to add a game without duplicating or coupling it to the
reusable multiplayer foundation. For the reasoning behind these boundaries,
see [Reusable multiplayer architecture](./reusable-multiplayer-architecture.md).

## 1. Define the game boundary

- [ ] Choose a stable kebab-case `gameId`. Treat it as a compatibility value.
- [ ] Define players, settings, actions, start/finish rules, disconnection
      behavior, and any delayed transitions.
- [ ] Define how simultaneous actions are resolved. The server stays
      authoritative; in a race, the first valid action processed wins.
- [ ] Choose the smallest complete playable loop. Generalize only concepts
      another game actually shares.

## 2. Add shared contracts

- [ ] Export the stable game ID from the game's shared `types.ts`, then add it
      to `SUPPORTED_GAME_IDS` in `packages/shared/src/gameIds.ts`.
- [ ] Define settings, actions, public state, and runtime schemas in a
      game-owned shared folder, following `packages/shared/src/game/card-bank`.
- [ ] Add the game-owned public room type to the `PublicRoomState` composition
      union in `packages/shared/src/types.ts`, discriminated by `gameId`.
- [ ] Expand create, settings, and action commands as discriminated unions that
      preserve the relationship between `gameId` and its payload.
- [ ] Keep generic schemas limited to transport envelopes. Add socket events
      only when the generic action/state pipeline is genuinely insufficient.

## 3. Implement the server module

- [ ] Create `apps/server/src/game/<game-id>/`.
- [ ] Keep private state, rules, scoring, and timing inside that folder.
- [ ] Implement the `GameModule` contract: schemas, start, action handling,
      scheduled transitions, public projection, and cleanup.
- [ ] Implement the game's active-player disconnection behavior used by
      `RoomManager`.
- [ ] Reject invalid actions with domain errors. Never trust client-computed
      state, scores, winners, or timestamps.
- [ ] Register the module in `GameModuleMap` and `createGameRegistry`.
- [ ] Add the game's internal room type to the `Room` discriminated union in
      `apps/server/src/rooms/types.ts`.

## 4. Implement the client entry and renderer

- [ ] Create `apps/client/src/game/<game-id>/`.
- [ ] Add a game-owned entry page with metadata, default settings, controls,
      and its typed create-room payload.
- [ ] Reuse `useGuestDisplayName`, `RoomJoinForm`, and `useCreateRoom` rather
      than rebuilding guest or room behavior.
- [ ] Add typed catalog metadata in `game/gameCatalog.ts`.
- [ ] Add the entry renderer to `GameEntryPage` and the room renderer to
      `RoomPage`.
- [ ] Build the in-room renderer with `RoomShell` and `useRoomSession`.
- [ ] Keep game UI and presentation in its folder. Reuse socket, reconnect,
      invitation, presence, chat, identity, and version infrastructure.

## 5. Verify behavior

- [ ] Test settings and valid, malformed, unauthorized, stale, and conflicting
      actions through the registered module.
- [ ] Test start, finish, restart, disconnection, cleanup, and scheduled
      transitions.
- [ ] For simultaneous-action games, send competing actions from multiple
      clients and assert that exactly one valid result is accepted.
- [ ] Add a Socket.IO test covering create, join, start, action, broadcast, and
      reconnect.
- [ ] Smoke-test catalog → game entry → room creation and universal room-code
      joining on desktop and mobile.
- [ ] Confirm Card Banking still works.

Run the repository checks:

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

## 6. Run an isolation audit

- [ ] Search reusable directories for the game's ID, actions, and state fields.
- [ ] Allow game imports only at registry, renderer, and catalog boundaries.
- [ ] Confirm generic room/player types still describe only multiplayer data.
- [ ] Confirm socket handlers, `RoomShell`, and `useRoomSession` contain no
      game rules, phases, scoring, or timers.
- [ ] Document any genuinely shared concept discovered while building the
      second implementation; extract it only when reuse makes navigation
      simpler.

## Definition of done

The game is done when users can select it, create or join a room, play its
server-authoritative loop, reconnect, finish or restart, and coexist with Card
Banking without leaking rules into reusable multiplayer code.
