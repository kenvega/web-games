# Card Banking rules spec

## Goal

Get the highest total score by the end of the game. Your score is the sum of
the values on the cards you successfully bank into your personal score pile.
Point totals remain hidden during play and are revealed when the game ends.

## Components

Use a single deck of 110 cards:

| Card value | Copies | Color |
| --- | ---: | --- |
| 1 | 13 | `#4FB6E1` |
| 2 | 13 | `#6D4996` |
| 3 | 13 | `#DA4D3A` |
| 4 | 13 | `#B85E9D` |
| 5 | 13 | `#ACC53C` |
| 6 | 9 | `#E1852E` |
| 7 | 9 | `#F5E943` |
| 8 | 9 | `#3C57A3` |
| 9 | 9 | `#5AB5A9` |
| 10 | 9 | `#E1749C` |

Each card value has its own color so players can recognize values quickly.

## Players and setup

The game supports 2 to 6 players.

The host may start the game once at least two connected players are in the
room. A seventh player cannot join a waiting room, and new players cannot join
after the game has started.

At game start:

* shuffle all 110 cards into one face-down central deck
* choose a random starting player from the seated players
* use the seated players' join order as the circular turn order
* deal no cards to players

The host starts the match only. There is no host-controlled "next round" step
after the game begins; turn progression is driven by player actions.

## Player areas and visibility

Each player has two card zones:

* Face-up active area: cards currently collected this turn cycle. These are not
  safe yet and can be stolen.
* Face-down score pile: cards already secured for end-game scoring. These
  cannot be stolen.

During play, everyone can see:

* each player's face-up active cards, grouped by value
* each player's total number of secured cards
* the remaining deck count
* the discard count

During play, players do not see another player's secured point total or exact
value counts in their face-down score pile. Final point totals and exact banked
counts are revealed at the end of the game for ranking and tiebreaking.

## Turn structure

On your turn, do the following.

### 1. Bank cards already in front of you

If you begin your turn with cards still face up in front of you, the game
automatically moves all of them into your face-down score pile before you do
anything else. No player input is needed for this step.

This is the only normal time stopped cards become safe. Stopping does not bank
cards immediately.

### 2. Draw one card

Reveal the top card of the central deck and place it face up in front of you.
Keep your active cards grouped by value.

### 3. Reveal and resolve busts

If you already had at least 3 face-up cards in your active area before drawing,
and the drawn card matches a value you already had face up before the draw, you
bust after a short reveal:

* the game shows the busting card and player for 2 seconds
* player actions are disabled during the reveal
* after the reveal, your turn ends
* all cards in your active area are discarded out of the game
* none of those discarded cards score
* already banked score-pile cards are not affected

If you had fewer than 3 active cards before drawing, a drawn duplicate does not
bust. This means drawing a duplicate as your second or third active card is
safe.

When the drawn card causes a bust, the game does not offer a steal prompt
first.

### 4. Optional steal after a safe draw

If the draw did not immediately bust you and other players have face-up cards
matching the drawn value, you may either:

* steal all face-up cards of that value from all other players, or
* decline the steal.

The steal is optional. The UI should show two clear choices and highlight the
cards that can be stolen.

If you steal, you take every matching face-up card from every opponent and add
those cards to your own active area. You never steal from face-down score
piles.

Stealing cannot cause a bust. Only drawing a card from the central deck can
cause a bust, even if the steal gives you duplicates or at least 3 total active
cards.

### 5. Continue or stop

After a safe draw and any steal decision has been fully resolved, choose one:

* continue drawing
* stop

If you stop, your active cards remain face up in front of you and can still be
stolen by later players. They become safe only at the start of your next turn.

After a stop or bust, play passes to the next seated player in turn order.

## End of game

The game ends when the central deck runs out.

When the last card is drawn, fully resolve that draw first, including any bust
or optional steal decision. After that draw is resolved, the game immediately
ends. Do not ask the active player whether to continue or stop.

At game end:

* all players immediately move remaining active cards into their score piles
* everyone totals the values in their score pile
* reveal every player's final point total and ranking
* highest total score wins

## Tiebreaker

If players tie on total score:

1. the tied player with more 1s in their score pile wins
2. if still tied, compare number of 2s
3. continue upward through 10s as needed

If players are still tied after comparing 10s, they remain tied.

## Disconnects and leaving

Disconnected players keep their seat, active cards, banked cards, and place in
turn order.

If the active player disconnects during their turn, the game automatically
stops their turn. Their active cards stay face up and vulnerable, exactly as if
they had pressed Stop.

If a non-host explicitly leaves after the game has started, treat that player
like a disconnected player: keep their seat and cards in the match, auto-stop
their turn if needed, and allow them to rejoin by link with the same guest
identity.

For now, keep the scaffold's existing host-leave behavior: if the host
explicitly leaves, the room closes.

## Implementation requirements

The server must be authoritative for all game decisions. Clients may request
actions, but they must not provide card values, deck order, scoring totals, or
turn results.

Replace the current demo game contract with Card Banking-specific state and
actions.
The game should use these player actions:

* `draw-card`
* `resolve-steal`
* `stop-turn`

The public game state must include enough information for all clients to render
the game consistently:

* current player id
* turn phase, such as awaiting draw, awaiting steal, awaiting decision,
  revealing bust, or finished
* remaining deck count
* discard count
* each player's active cards grouped by value
* each player's secured card count during play
* pending steal information when a steal decision is available, including the
  drawn value and the matching cards that can be stolen
* pending bust information during the 2-second reveal, including the busted
  player and busting card value
* final scores, final rankings, and tiebreak details when the game is finished

Server-only state must include:

* shuffled deck order
* discarded cards
* each player's banked card counts by value
* each player's in-progress secured point total
* the seated turn order
* the drawn value awaiting a steal or continue/stop decision

The existing room, lobby, chat, reconnection, and room-state synchronization
scaffold should remain reusable. The demo-specific "First to React" game,
`claim-round` action, countdown, target score, and host-controlled next-round
flow should be removed when this game is implemented.

## Important edge cases

These are the parts that must be covered by tests:

* The generated deck has exactly 110 cards with the configured counts.
* The game starts with 2 to 6 players and rejects a seventh player.
* The first player is randomly selected from the seated players.
* Banking happens at the start of a player's next turn, not when they stop.
* A stopped player's active cards remain stealable until that player's next
  turn.
* A steal takes all matching face-up cards from all opponents.
* Stealing never causes a bust; only a drawn card can bust the active player.
* Declining a steal leaves opponents' matching active cards untouched.
* A draw-created bust shows the bust card for 2 seconds and does not offer a
  steal prompt.
* A bust discards only the current active area, not the banked score pile.
* A duplicate only causes a bust when the player already had at least 3 active
  cards before drawing.
* The last drawn card is fully resolved before final scoring.
* During play, show secured card counts instead of secured point totals; reveal
  point totals only after the game finishes.
* Final scoring sums banked card values and applies the 1-through-10
  tiebreaker.
* Disconnecting during the active player's turn auto-stops that turn.

## Compact handoff text for another AI

Build a web game for the Card Banking ruleset. It is a competitive
push-your-luck card game for 2 to 6 players. The deck has 110 cards: values 1
through 5 appear 13 times each, and values 6 through 10 appear 9 times each.
Each player has a face-up active area and a face-down score pile. On a player's
turn, first move all cards from their active area into their score pile. Then
the player repeatedly draws the top card of the deck into their active area. If
the player already had at least 3 active cards before drawing and the drawn card
duplicates an active value, show the busting card for 2 seconds, then discard
the active area and end the turn without offering a steal. Otherwise, after each
draw, the player may optionally steal all face-up cards of that same value from
all other players. Stealing never causes a bust. If the player does not bust
from drawing, they may draw again or stop. If they stop, their active cards
remain face up and can be stolen; they become safe only at the start of that
player's next turn. When the last deck card is drawn, fully resolve that draw,
then bank all remaining active cards and score the game. During play, show only
the number of cards each player has secured; keep secured point totals hidden.
At game end, reveal the final point totals and rankings. Highest total wins.
Ties are broken by most 1s in the score pile, then most 2s, then most 3s,
continuing upward through 10s.
