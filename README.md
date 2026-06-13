# Multiplayer Blueprint

A reusable full-stack scaffold for small, private, browser-based multiplayer games.

It provides guest players, temporary rooms, shareable room links, real-time lobby presence, host controls, room chat, server-authoritative actions, reconnect support, and a small “First to React” demonstration game.

## What It Includes

- React, TypeScript, Vite, React Router, and Tailwind CSS.
- Node.js, Express, Socket.IO, Zod, and Nano ID.
- npm workspaces for `apps/client`, `apps/server`, and `packages/shared`.
- Typed Socket.IO event contracts shared by client and server.
- In-memory room storage.
- One Render Web Service deployment.
- Automated room-manager and Socket.IO integration tests.

## What It Deliberately Excludes

This scaffold does not include accounts, passwords, public matchmaking, public room listings, databases, Redis, persistent storage, Docker, multiple services, payments, analytics, admin dashboards, spectators, moderation tools, or horizontal scaling.

It is intended for trusted private games and is not a production netcode foundation for fast fighting or racing games.

## Requirements

- Node.js 24.
- npm.

The project is configured with `.nvmrc`:

```sh
nvm use
```

## Install

```sh
npm install
```

## Development

```sh
npm run dev
```

Local defaults:

- Client: `http://localhost:5173`
- Server: `http://localhost:3000`
- Health check: `http://localhost:3000/health`

The development server uses `CLIENT_ORIGIN` so Vite and Express can run on different origins. Copy `.env.example` to `.env` if you need to change the defaults.

## Verification

```sh
npm run lint
npm run typecheck
npm run test
npm run build
```

## Production Build

```sh
npm run build
npm run start
```

In production, the Express server serves `apps/client/dist`, exposes `/health`, hosts Socket.IO, and returns `index.html` for unknown non-API routes so `/room/:roomCode` works after refresh.

## Render Deployment

Deploy this repository as one free Render Web Service.

Suggested settings:

- Build command: `npm ci && npm run build`
- Start command: `npm run start`
- Environment:
  - `NODE_ENV=production`
  - `PORT` is provided by Render

Do not create a Render Static Site, database, Render Key Value instance, or paid service for this scaffold.

The included `render.yaml` defines one free Node Web Service named `multiplayer-blueprint`.

## Guest Identity

There are no accounts. The browser creates a guest ID with `crypto.randomUUID()` and stores it in:

```text
multiplayer_guest_id
```

The display name is stored in:

```text
multiplayer_display_name
```

The guest ID is sent to the server when creating or joining rooms and allows refresh/reconnect while the in-memory room still exists. It is not strong authentication.

## Room Codes

Rooms use ten-character Nano ID codes with an alphabet that avoids visually confusing characters:

```text
23456789ABCDEFGHJKLMNPQRSTUVWXYZ
```

Room links use:

```text
/room/K7M2Q9PX4T
```

Room codes make accidental discovery unlikely but are not formal authentication.

## In-Memory State

Rooms live only in a server-side `Map`. They disappear when the service restarts, Render sleeps and restarts the instance, a deployment happens, the server crashes, or cleanup removes an abandoned room.

This is intentional. The scaffold currently does not support persistent games.

Waiting and finished rooms with no connected players expire after 60 minutes. Cleanup runs every five minutes.

## Chat

Each room has a basic chat available in the lobby, during gameplay, and after the match finishes. Messages are validated, rendered as plain text by React, limited to 200 characters, and retained only in memory. Each room keeps the latest 100 messages.

There is no moderation, private messaging, editing, deletion, file upload, reactions, persistence, or cross-room chat.

## Reconnection Behavior

Socket.IO connection-state recovery is enabled for brief interruptions. The client requests the latest room state after reconnecting.

If the same guest opens the same room from a second active socket, the new socket replaces the previous one.

If the host disconnects, the host role remains assigned to that player. Other players cannot take host controls until the host reconnects.

## Demo Game

The included game is “First to React”:

1. The host starts when at least two connected players are present.
2. The server schedules a synchronized countdown.
3. When the round is active, each player can press once.
4. The server awards one point to the first valid action it processes.
5. The match ends when a player reaches three points.

Scores reset when the host returns a finished match to the waiting lobby for a new match.

## Replacing the Demo Game

Generic multiplayer infrastructure lives in:

- `apps/server/src/rooms`
- `apps/server/src/socket`
- `apps/server/src/chat`
- `packages/shared/src`

Demo-specific server logic lives in:

- `apps/server/src/game/demo`

Demo-specific React UI lives in:

- `apps/client/src/game/demo`

For a new game, replace the demo game folders and adjust the shared game action/state types while keeping the room, identity, lobby, chat, and Socket.IO scaffolding.

## Shared Event Contracts

The shared package defines the Socket.IO contract and runtime schemas:

- `packages/shared/src/events.ts`
- `packages/shared/src/schemas.ts`
- `packages/shared/src/types.ts`

The server validates every command with Zod. TypeScript types do not replace runtime validation.

## Server Authority

Clients send requested actions, not trusted results. The server decides whether the room exists, whether a player belongs to it, whether an action is valid, who acted first, how scores change, and which state is broadcast.

Never accept a complete game state from the browser and overwrite server state with it.
