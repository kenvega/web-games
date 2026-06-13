# Reusable Real-Time Multiplayer Game Scaffold

## 1. Objective

Create a reusable full-stack scaffold for small, private, browser-based multiplayer games.

The scaffold must provide:

* Guest players without registration.
* Temporary multiplayer rooms.
* Shareable room links.
* A lobby showing connected players in real time.
* A host who can start the game.
* Real-time synchronization using Socket.IO.
* Server-authoritative game actions.
* Basic reconnection support.
* Responsive support for desktop and mobile browsers.
* Deployment as one free Render Web Service.
* A small demonstration game proving that the multiplayer foundation works.
* A simple room chat that works both before the game starts and while the game is in progress.

This project is not intended to contain several unrelated finished games. Instead, it will be copied or forked whenever a new game is created.

The reusable parts are:

* Guest identity.
* Room creation.
* Joining through a URL.
* Lobby management.
* Player presence.
* Host controls.
* Room lifecycle.
* Room chat.
* Socket.IO communication.
* Server-authoritative actions.
* Reconnection and synchronization.
* Render deployment.

Each future game will replace the demonstration game with its own game-specific logic and interface while retaining the reusable multiplayer infrastructure.

---

## 2. Important architectural limitation

This scaffold is appropriate for:

* Card games.
* Board games.
* Trivia games.
* Turn-based games.
* Party games.
* Drawing or guessing games.
* Reaction games.
* Games with occasional real-time actions.

The room and lobby infrastructure can also be reused for fighting or racing games.

However, for the kinds of games this scaffold is intended to support initially, Socket.IO room events and server-authoritative actions are sufficient. Focus on games that benefit from real-time interaction without requiring complex movement synchronization, such as reaction games, party games, drawing games, trivia games, simple arena games, or other event-driven multiplayer experiences. Fast fighting games, racing games, and other movement-heavy action games are intentionally out of scope for this first version because they require significantly more advanced networking techniques.

Do not try to build all of that into this initial scaffold.

React should manage menus, rooms, player lists, scores, chat, and normal interfaces. A future fast-action game may add Phaser, PixiJS, or another Canvas/WebGL engine for the game itself.

---

## 3. Current project decisions

### Included

* React.
* TypeScript.
* Vite.
* React Router.
* Tailwind CSS.
* Node.js.
* Express.
* Socket.IO.
* Socket.IO Client.
* Zod.
* Nano ID.
* npm workspaces.
* In-memory room storage.
* One Render Web Service.
* A demonstration game.
* A simple room chat available in both the lobby and active game.
* Automated tests for important room behavior.

### Explicitly excluded

* User accounts.
* Email or password authentication.
* A site-wide password.
* Access-control middleware.
* Cloudflare.
* Cloudflare Turnstile.
* Firebase.
* Supabase.
* PostgreSQL.
* Redis.
* Persistent storage.
* Docker.
* Microservices.
* Redux.
* Public matchmaking.
* Public room listings.
* Advanced chat features such as moderation, private messaging, chat persistence, message editing, message deletion, file uploads, reactions, or cross-room chat.
* Spectators.
* Payments.
* Analytics.
* Administrative dashboards.
* Multiple server instances.
* Horizontal scaling.
* Complex protection against malicious users.

Do not introduce these excluded features unless they are strictly necessary to make the basic scaffold function.

---

## 4. Technology stack

### Runtime

Use Node.js 24 and TypeScript in strict mode.

### Frontend

* React.
* TypeScript.
* Vite.
* React Router.
* Tailwind CSS.
* `socket.io-client`.
* Zod.

### Backend

* Node.js.
* TypeScript.
* Express.
* Socket.IO.
* Zod.
* Nano ID.

### Development tools

* npm workspaces.
* `tsx` for running the TypeScript server during development.
* `concurrently` for running the client and server together.
* ESLint.
* Prettier.
* Vitest.
* Socket.IO Client for integration tests.

Use a committed `package-lock.json`.

Do not use a separate frontend hosting provider.

---

## 5. Repository structure

Use a single repository containing three workspaces:

```text
multiplayer-game-scaffold/
├── apps/
│   ├── client/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── pages/
│   │   │   ├── game/
│   │   │   ├── chat/
│   │   │   ├── lib/
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   ├── index.html
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   └── server/
│       ├── src/
│       │   ├── game/
│       │   ├── chat/
│       │   ├── rooms/
│       │   ├── socket/
│       │   ├── app.ts
│       │   └── server.ts
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   └── shared/
│       ├── src/
│       │   ├── events.ts
│       │   ├── schemas.ts
│       │   ├── types.ts
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── package.json
├── package-lock.json
├── tsconfig.base.json
├── .gitignore
├── .nvmrc
├── README.md
└── render.yaml
```

The `shared` package must contain the event contracts and data types used by both client and server.

Avoid duplicating Socket.IO event definitions between the frontend and backend.

---

## 6. Single-service architecture

In development:

```text
Vite development server
        +
Node/Express/Socket.IO server
```

In production:

```text
One Render Web Service
└── Node/Express server
    ├── serves the compiled React application
    ├── exposes a health endpoint
    └── hosts the Socket.IO server
```

The production Express server must serve the Vite build from:

```text
apps/client/dist
```

All unknown non-API routes must return `index.html` so that React Router routes such as `/room/K7M2Q9PX4T` work after refreshing the browser.

Because the frontend and backend share the same origin in production:

* Do not create a separate CORS configuration unless development requires it.
* The production Socket.IO client should connect to the current origin.
* Do not hardcode the Render URL.

---

## 7. Guest identity

There are no accounts.

On the first visit, the browser must generate an internal guest identifier using:

```ts
crypto.randomUUID()
```

Store it in `localStorage`:

```text
multiplayer_guest_id
```

The player’s chosen display name should also be stored locally:

```text
multiplayer_display_name
```

The internal guest identifier:

* Is not shown in the interface.
* Is sent to the server when creating or joining a room.
* Allows a player to refresh the page and reconnect as the same guest.
* Must not use `socket.id` as the persistent player identity.
* Is not intended to provide strong authentication or protection against deliberate impersonation.

The display name:

* Is chosen by the user.
* Is trimmed.
* Must contain between 1 and 24 characters.
* Does not have to be unique.
* Is escaped and rendered as plain text.
* Can be changed before joining a room.
* Should not be changeable during an active game in the initial version.

The application is intended for trusted friends, so stronger guest authentication is outside the initial scope.

---

## 8. Room codes

Do not use sequential numeric room IDs.

Use Nano ID to generate a ten-character URL-safe room code.

Example:

```text
K7M2Q9PX4T
```

Use an alphabet that avoids visually confusing characters where practical.

A possible alphabet is:

```text
23456789ABCDEFGHJKLMNPQRSTUVWXYZ
```

Do not include:

* `0`
* `O`
* `1`
* `I`

Room links should use this format:

```text
https://application-url/room/K7M2Q9PX4T
```

The room code serves two purposes:

* Identifies the room.
* Makes accidental discovery unlikely.

It is not presented as formal authentication.

When generating a code, check whether it already exists in the room map. Generate another code if there is a collision.

---

## 9. In-memory room storage

Store rooms in a server-side `Map`:

```ts
Map<RoomCode, Room>
```

Do not write room state to files.

Do not add a database.

All rooms are temporary and can disappear when:

* Render spins the service down.
* The service restarts.
* A new deployment occurs.
* The server crashes.
* The room expires.
* The room is manually deleted.

The client must gracefully handle a missing room and show:

```text
This room no longer exists. Create a new room to continue.
```

Provide a button returning to the home page.

---

## 10. Room model

Create shared types similar to:

```ts
type RoomPhase = "waiting" | "playing" | "finished";

type ChatMessage = {
  id: string;
  playerId: string;
  displayName: string;
  text: string;
  createdAt: number;
};

type Player = {
  id: string;
  displayName: string;
  connected: boolean;
  score: number;
  joinedAt: number;
};

type Room = {
  code: string;
  hostPlayerId: string;
  phase: RoomPhase;
  players: Record<string, Player>;
  chatMessages: ChatMessage[];
  gameState: DemoGameState | null;
  version: number;
  createdAt: number;
  updatedAt: number;
};
```

Do not send every internal property directly to the browser.

Create a separate public snapshot type:

```ts
type PublicRoomState = {
  code: string;
  phase: RoomPhase;
  hostPlayerId: string;
  players: PublicPlayer[];
  chatMessages: PublicChatMessage[];
  gameState: PublicDemoGameState | null;
  version: number;
};
```

Chat messages should be included in room state and visible in both the lobby and active game.

To keep memory usage bounded:

* Retain only a limited number of recent messages per room (for example, the latest 100).
* Do not persist messages.
* Delete messages when the room is deleted.

Every accepted room mutation must:

1. Update the room.
2. Increment `version`.
3. Update `updatedAt`.
4. Broadcast the new public snapshot.

The client must ignore a snapshot if its version is older than the most recently received version.

---

## 11. Room lifecycle

### Waiting

Players can join.

The lobby displays:

* Room code.
* Copy-invite-link button.
* Connected players.
* Host badge.
* Connection status.
* Room chat.
* Start button for the host.
* Waiting message for non-host players.

Only the host can start.

Require at least two connected players before starting the demonstration game.

### Playing

The demonstration game is active.

New players cannot join during a game in the initial version.

A player who was already in the room may reconnect.

The host cannot start another game while the current one is active.

The room chat remains available while the game is being played.

### Finished

Display:

* Winner.
* Final scores.
* Play-again button for the host.
* Leave-room button for everyone.

The room chat remains available.

The host can return the room to `waiting` for another round.

Scores may either reset for a new match or remain as match totals. Choose one behavior and document it. For the demonstration, reset scores when starting a completely new match.

---

## 12. Socket.IO event contract

Define strongly typed Socket.IO event interfaces in the shared package.

### Client-to-server commands

```text
room:create
room:join
room:leave
room:start
room:restart
room:request-state
chat:send-message
game:action
```

### Server-to-client events

```text
room:state
room:closed
room:error
chat:message
game:event
```

Each command that changes state must use a Socket.IO acknowledgement callback.

Use a consistent result:

```ts
type CommandResult<T = undefined> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: {
        code: string;
        message: string;
      };
    };
```

Possible error codes include:

```text
INVALID_INPUT
ROOM_NOT_FOUND
ROOM_FULL
GAME_ALREADY_STARTED
NOT_ROOM_HOST
NOT_IN_ROOM
NOT_ENOUGH_PLAYERS
PLAYER_ALREADY_CONNECTED
INVALID_GAME_ACTION
ROUND_NOT_ACTIVE
ACTION_ALREADY_CLAIMED
MESSAGE_TOO_LONG
```

Validate every command on the server with Zod.

TypeScript types do not replace runtime validation.

---

## 13. Joining Socket.IO rooms

When a player successfully joins an application room, the server must also join that socket to the corresponding Socket.IO room:

```ts
socket.join(roomCode);
```

Broadcast room snapshots only to that Socket.IO room.

Do not broadcast one room’s state globally.

Associate the socket with:

```ts
socket.data.guestId
socket.data.roomCode
```

A socket can belong to no more than one application room at a time in the initial scaffold.

If a player attempts to join another room, first remove them from their current room.

---

## 14. Creating a room

The home page contains:

* Display-name input.
* Create Room button.
* Room-code input.
* Join Room button.

When Create Room is selected:

1. Ensure the Socket.IO connection is active.
2. Validate the display name.
3. Send `room:create`.
4. The server generates a room code.
5. The server creates the room.
6. The creator becomes the host.
7. The socket joins the Socket.IO room.
8. The server returns the room code.
9. The client navigates to `/room/:roomCode`.
10. The server broadcasts the initial room snapshot.

The server must be the only code that creates room codes.

---

## 15. Joining from an invite link

When the browser loads:

```text
/room/K7M2Q9PX4T
```

the room page should:

1. Read the room code from React Router.
2. Load or request the player’s display name.
3. Connect to Socket.IO.
4. Send `room:join`.
5. Show a loading state while waiting.
6. Render the returned room state.
7. Handle `ROOM_NOT_FOUND` cleanly.

When copying an invite link, use:

```ts
window.location.origin + "/room/" + roomCode
```

Use the Web Share API on supported mobile devices.

Fall back to the Clipboard API when native sharing is unavailable.

---

## 16. Disconnections and reconnections

Enable Socket.IO connection-state recovery for brief interruptions, with a recovery window of approximately two minutes.

This helps with:

* Switching between Wi-Fi and mobile data.
* Brief mobile-browser interruptions.
* Temporary loss of network connectivity.

Do not assume recovery will always succeed.

The client must request the latest room state after reconnecting:

```text
room:request-state
```

On disconnect:

* Mark the player as disconnected.
* Do not immediately delete the player.
* Broadcast the updated presence state.
* Preserve their score and room membership.

If the same guest identifier reconnects:

* Associate the new socket with the existing player.
* Mark the player as connected.
* Rejoin the Socket.IO room.
* Send the current room snapshot.

For the initial scaffold, permit only one active socket per guest per room.

When a second connection appears for the same guest:

* Disconnect or replace the previous socket.
* Document the chosen behavior.
* Prefer replacing the previous socket.

Do not implement host transfer initially.

If the host disconnects:

* Keep the host role assigned to that player.
* Display “Host disconnected.”
* Allow the host to recover control after reconnecting.
* Do not let another player start the game.

Host transfer can be added later.

---

## 17. Expiration and cleanup

Prevent abandoned rooms from accumulating indefinitely while the server remains active.

Suggested rules:

* Delete a waiting room after 60 minutes with no connected players.
* Delete a finished room after 60 minutes with no connected players.
* Do not delete a room that has connected players.
* Run cleanup periodically, such as every five minutes.

When a room is removed, clear any associated timers.

Do not persist expiration schedules.

---

## 18. Server authority

The server must be the authoritative source of truth.

Clients send requested actions, not trusted results.

For example, a client can send:

```ts
{
  type: "claim-round"
}
```

It must not send:

```ts
{
  scoreToAdd: 10,
  winner: true
}
```

The server decides:

* Whether the room exists.
* Whether the player belongs to the room.
* Whether the room is in the correct phase.
* Whether the action is valid.
* Which player acted first.
* How scores change.
* When a round begins or ends.
* What state is broadcast.

Never accept complete game state from a client and overwrite the server state with it.

---

## 19. Demonstration game

Include a minimal “First to React” game.

Its purpose is not to be a polished game. Its purpose is to prove that the scaffold supports real-time multiplayer behavior.

### Demonstration flow

1. At least two players enter the lobby.
2. The host presses Start.
3. The server schedules the round to start three seconds later.
4. All clients see a synchronized countdown.
5. When the round begins, a large button becomes active.
6. Each player can press it once.
7. The first valid action processed by the server wins the round.
8. The server awards one point.
9. All clients immediately see the winner and updated scores.
10. The host can start the next round.
11. The match ends when a player reaches three points.
12. The room enters `finished`.

### Demonstration state

```ts
type DemoGameState = {
  roundNumber: number;
  status: "countdown" | "active" | "round-finished" | "match-finished";
  startsAt: number | null;
  winnerPlayerId: string | null;
  targetScore: number;
};
```

### Important behavior

The server sets `startsAt`.

Clients use it only to render the countdown.

The server rejects actions received before `startsAt`.

When the first valid action arrives:

* Mark the round as completed synchronously.
* Record the winner.
* Increment the winner’s score.
* Reject later claims for that round.
* Broadcast the result.

This demonstrates server-authoritative handling of two users acting almost simultaneously.

---

## 20. Game-module boundary

Do not mix generic room logic with the demonstration game logic.

Create an interface similar to:

```ts
interface GameModule<TState, TAction, TPublicState> {
  createInitialState(room: Room): TState;

  start(room: Room, now: number): TState;

  handleAction(input: {
    room: Room;
    playerId: string;
    action: TAction;
    now: number;
  }): {
    accepted: boolean;
    nextState?: TState;
    errorCode?: string;
  };

  toPublicState(state: TState): TPublicState;

  dispose?(roomCode: string): void;
}
```

The room manager should call the game module rather than importing demonstration-game rules throughout the server.

Place demonstration logic under:

```text
apps/server/src/game/demo/
```

Place the React demonstration interface under:

```text
apps/client/src/game/demo/
```

Document which folders a developer should replace when creating a new game.

Do not attempt to make the interface support every imaginable game. Keep it sufficient for event-driven games and allow future projects to extend or replace it.

---

## 21. Client-side state

Do not add Redux.

Use:

* React Context for the Socket.IO connection.
* A room hook for the current room snapshot.
* Local component state for forms.
* A reducer if room connection states become complex.

Suggested connection states:

```ts
type ConnectionStatus =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected";
```

Suggested room loading states:

```ts
type RoomPageStatus =
  | "joining"
  | "joined"
  | "not-found"
  | "error";
```

The server snapshot remains the authoritative room state.

Do not optimistically award points or declare winners on the client.

---

## 22. User interface

### Home page

Include:

* Project title.
* Display-name field.
* Create Room button.
* Room-code field.
* Join Room button.
* Validation messages.
* Connection indicator.

### Room page

Include:

* Room code.
* Copy/share link.
* Player list.
* Host badge.
* Connected/disconnected indicators.
* Current room phase.
* Room chat panel.
* Chat input and send button.
* Start button when appropriate.
* Demonstration game area.
* Leave button.
* Reconnection message.
* Missing-room message.

### Chat requirements

The room chat should:

* Be available immediately after joining a room.
* Continue working while the game is active.
* Display the sender's display name and message timestamp.
* Broadcast messages only to players in the same room.
* Validate and sanitize message content.
* Limit message length (for example, 200 characters).
* Not persist messages after the room is deleted or the server restarts.
* Not include advanced chat features beyond basic room messaging.

### Responsive behavior

The interface must work at approximately 320 pixels wide.

Buttons must be easy to press on phones.

Avoid hover-only controls.

Do not require keyboard input after entering the player name and room code.

---

## 23. Error handling

Handle these situations visibly:

* Server still waking up.
* Socket connection fails.
* Socket reconnecting.
* Room does not exist.
* Room has already started.
* Player name is invalid.
* Host is disconnected.
* Action was too early.
* Another player acted first.
* Chat message validation fails.
* Server restarted and room disappeared.
* Unexpected server error.

Do not leave the user on an infinite loading screen.

Use clear user-facing messages while logging technical details to the console or server logs.

---

## 24. Testing

### Unit tests

Test:

* Room-code generation.
* Room creation.
* First player becoming host.
* Additional players joining.
* Duplicate display names being allowed.
* Invalid names being rejected.
* Chat message validation.
* Chat message broadcasting.
* Chat message limits.
* Starting with fewer than two players being rejected.
* Non-host start attempts being rejected.
* New joins during gameplay being rejected.
* Disconnect and reconnect behavior.
* Room version increments.
* Room expiration.
* First valid reaction winning.
* Later reaction attempts being rejected.
* Match ending at the target score.

### Integration tests

Use a real HTTP server on an ephemeral local port and connect two or more Socket.IO clients.

Test:

1. Client A creates a room.
2. Client B joins.
3. Both receive the same room state.
4. Both can exchange chat messages.
5. Client A starts the game.
6. Both receive the countdown.
7. Both submit an action.
8. Only one receives the point.
9. Both receive the same final state.
10. One client disconnects and reconnects.
11. The reconnected client receives the current snapshot.

Do not rely only on mocked Socket.IO calls for these core flows.

---

## 25. Development scripts

Provide root commands similar to:

```text
npm install
npm run dev
npm run build
npm run start
npm run test
npm run lint
npm run typecheck
```

`npm run dev` should start both:

* The Vite development server.
* The Node/Socket.IO server.

Document the local URLs and required ports.

Use environment variables for:

```text
PORT
NODE_ENV
CLIENT_ORIGIN
```

`CLIENT_ORIGIN` should only be needed during local development if the Vite and Express servers use different origins.

Provide `.env.example`.

Do not commit `.env`.

---

## 26. Render deployment

Deploy the entire project as one Render Web Service.

Requirements:

* Use the free instance type.
* Do not add a payment method.
* Do not provision a database.
* Do not provision Render Key Value.
* Do not create a separate Render Static Site.
* Bind the server to `0.0.0.0`.
* Read the port from `process.env.PORT`.
* Serve the production React build through Express.
* Commit the lockfile.

Suggested settings:

```text
Build command:
npm ci && npm run build

Start command:
npm run start
```

Add:

```text
GET /health
```

Response:

```json
{
  "status": "ok"
}
```

Include a minimal `render.yaml` for one Node Web Service where practical, but also document manual dashboard deployment.

The README must warn that:

* The first request after inactivity may take time.
* Rooms are temporary.
* A sleeping or restarted server loses every room.
* This behavior is intentional.
* The project currently does not support persistent games.

---

## 27. README requirements

The README should explain:

1. What the scaffold provides.
2. What it deliberately does not provide.
3. How to install dependencies.
4. How to run development mode.
5. How to run tests.
6. How to build production assets.
7. How to deploy to Render.
8. How guest identity works.
9. How room codes work.
10. Why state is held in memory.
11. How room chat works.
12. What happens when Render sleeps.
13. How to replace the demonstration game.
14. Which shared types define Socket.IO events.
15. Why the server must remain authoritative.
16. Why the scaffold is not yet suitable for production fighting or racing netcode.

---

## 28. Acceptance criteria

The implementation is complete when:

* A user can enter a display name.
* A user can create a room.
* The creator receives a short room code.
* The creator becomes host.
* The user can copy or share a room link.
* Another browser can open that link.
* The second player can join without an account.
* Both users see one another appear without refreshing.
* Both users can exchange chat messages in the room.
* Chat continues to function after the game starts.
* Disconnected players are visually identified.
* Only the host can start.
* Starting changes every connected client at approximately the same time.
* The reaction demonstration awards only one player per round.
* Every client receives the same score and game state.
* A browser refresh reconnects the same guest when the room still exists.
* A missing room displays an understandable message.
* The React application and Socket.IO server run from one Render service.
* The project works on desktop and mobile browsers.
* Tests cover the main multiplayer flow.
* No database, authentication service, Cloudflare service, or paid dependency is introduced.

---

## 29. Implementation priorities

Implement in this order:

### Phase 1: Repository and development environment

* Create npm workspaces.
* Configure TypeScript.
* Create Vite React app.
* Create Express server.
* Create shared package.
* Add root development scripts.

### Phase 2: Socket connection

* Attach Socket.IO to the Express HTTP server.
* Connect the React client.
* Add typed events.
* Add connection-status UI.
* Add health endpoint.

### Phase 3: Guest identity

* Generate and persist guest ID.
* Store display name.
* Validate display name.

### Phase 4: Rooms

* Create room manager.
* Generate room codes.
* Create and join rooms.
* Add Socket.IO room membership.
* Broadcast public room snapshots.
* Add lobby UI.
* Add room chat.

### Phase 5: Room lifecycle

* Add host controls.
* Add waiting, playing, and finished phases.
* Handle leave, disconnect, and reconnect.
* Add room cleanup.

### Phase 6: Demonstration game

* Add countdown.
* Add server-authoritative reaction claims.
* Add scoring.
* Add match completion.
* Ensure chat remains available during gameplay.
* Add restart behavior.

### Phase 7: Testing

* Add room-manager unit tests.
* Add game-rule tests.
* Add multi-client Socket.IO integration tests.

### Phase 8: Production build

* Build React.
* Serve it through Express.
* Add SPA fallback.
* Verify production Socket.IO connection.

### Phase 9: Render

* Add Render configuration.
* Deploy one free Web Service.
* Test the application from two phones or browsers.
* Verify behavior after a Render restart.

### Phase 10: Documentation and cleanup

* Complete README.
* Remove unused dependencies.
* Run linting, type checking, tests, and production build.
* Confirm excluded features were not added.

---

## 30. Instructions for the implementation AI

Build the smallest clean implementation satisfying this specification.

Do not overengineer.

Prefer explicit, readable modules over generalized frameworks.

Do not add a database “for later.”

Do not add authentication “for security.”

Do not add Redis “for scalability.”

Do not split the application into multiple services.

Do not replace Socket.IO with another real-time service.

Do not create several game modes.

Implement only the demonstration reaction game.

Keep generic room infrastructure separate from game-specific logic.

Before completing the task, verify:

```text
npm run lint
npm run typecheck
npm run test
npm run build
```

Report:

* The final project structure.
* Important architectural decisions.
* Commands for local execution.
* Render deployment settings.
* Any parts of this specification that could not be implemented.
