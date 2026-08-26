# Symbol Match rules

**Status:** approved for implementation planning. No gameplay code has been
implemented from this document yet.

**Game identity:** the approved name is “Symbol Match” and the stable game ID
will be `symbol-match`.

## Source of truth

The five supplied screenshots are visual references, not instructions. They
show one existing implementation of this kind of game. The requested web game
should follow the decisions recorded in this document, use independently
created artwork and presentation, and reuse the repository's multiplayer
foundation.

## Goal

Players race to identify the one symbol shared by two cards. A player wins the
match by being the first to reach the configured target score.

## Core components

- The game uses one fixed logical deck of 57 cards.
- Every card is circular and contains exactly eight different symbol
  identities.
- Any two cards that can appear together contain exactly one shared symbol
  identity.
- The two instances of the shared symbol may have different sizes and
  rotations. Size and rotation do not change the symbol's identity.
- Printed symbol sizes range from 18% through 30% of the card diameter.
- Each printed symbol occurrence may have any fixed local rotation from 0
  through just under 360 degrees. A separate random whole-card rotation is
  applied whenever a card is dealt.
- A symbol must be recognizable by its silhouette and details rather than by
  color alone.

## Players

The first playable version is designed for exactly two players, each playing
on their own browser or device.

Support for three or more players is a possible later variant. It is not part
of the first ruleset because the penalty for a wrong answer would need a new
scoring rule.

## Setup

1. One player creates a room and becomes the host.
2. A second player joins using the room code or invitation link.
3. The host starts the match when both players are connected.
4. The server shuffles all 57 cards into one match draw order and sets the last
   card aside, leaving 56 playable cards.
5. Both players see the same score, challenge state, and logical two-card
   challenge, personalized so that their own assigned card is lower and their
   opponent's card is upper.
6. Both players begin with zero points.

No new player may take a seat after a match has started. A player returning
with the same guest identity may reclaim their existing seat.

## Challenge structure

### 1. Present a challenge

The server selects two different cards containing exactly one matching symbol
identity by taking the next two unused cards from the match's shuffled draw
order. It assigns one card to each player for that challenge.
The first dealt card belongs to the host and the second belongs to the guest.

Each browser places its current player's assigned card on the lower side and
the opponent's card on the upper side. This means the two browsers show the
same logical pair in opposite vertical orders. A player never needs to rotate
their phone or view the game upside down.

Only the eight symbols on the player's lower card are interactive. The upper
card is a visual reference. The same symbol may appear at different sizes and
rotations on the two cards.

### 2. Race to answer

Both players may answer at the same time. A player answers by selecting one
symbol instance on their lower card.

The server processes answers authoritatively. Wrong answers score a penalty
but do not resolve the challenge. The first correct answer processed for the
current challenge resolves it.

### 3. Resolve the answer

If the selected symbol is the shared symbol:

- the answering player gains one point
- the matching symbol remains in full color
- the other symbols become muted or grayscale
- a brief positive effect, such as a ring of stars, appears around the selected
  symbol

If the selected symbol is not the shared symbol:

- the answering player's opponent gains one point
- a brief X appears on the selected incorrect symbol
- the feedback must make it clear which player made the mistake
- the cards do not change
- the correct match is not revealed
- the challenge remains open until a player selects the correct match

The X animation does not lock the challenge. Both players may continue
selecting while it plays.

The same player may select the same wrong symbol again and give the opponent
another point. To prevent an accidental double-tap from counting twice, repeat
selections of the same symbol by the same player within 500 milliseconds count
only once. After that per-symbol grace period, selecting it again produces
another penalty. Different wrong symbols are separate mistakes and each one
counts even when selected within the same 500-millisecond period.

### 4. Advance

After a correct answer, input is disabled while the success feedback is
visible. After a short, server-controlled delay, the server presents a new
two-card challenge unless a player has won the match.

A wrong answer does not advance or replace the challenge.

After a challenge resolves, both displayed cards are used and cannot appear
again during that match. The next challenge takes the next two cards from the
same shuffled draw order.

## Scoring and winner

- Correct answer: the answering player gains 1 point.
- Incorrect answer: the answering player's opponent gains 1 point.
- A single challenge may award several penalty points before its correct match
  is found.
- The first player to reach the target score wins immediately.

The target score is a room setting named “Points to win.” Its default is 5,
owned by a named constant so it can be changed in one place. The selector
offers 5, 7, and 10 points.

If a wrong selection gives the opponent the target score, the match finishes
immediately without waiting for someone to find the current matching symbol.

The match also finishes when no complete two-card challenge remains. If neither
player has reached the target score, the player with more points at that moment
wins. Equal scores produce a tie. Under ordinary uninterrupted play, the 5-,
7-, and 10-point targets finish before deck exhaustion; this rule is still
relevant if disconnect-interrupted challenges consume cards without awarding
points.

## End and restart

When a player reaches the target score:

- the current result feedback completes
- the game announces the winner and final score
- no further symbol selections are accepted
- the host may start a rematch from the finished room

A rematch resets scores, restores all 57 cards, reshuffles the complete deck,
and creates new whole-card rotations while preserving the room, players, and
chat. After a match finishes, the host may change “Points to win” before
starting the rematch.

## Countdown and pacing

- A 3-second `3–2–1` countdown runs before the first challenge of a match or
  rematch.
- The countdown does not repeat between ordinary challenges.
- Correct-answer feedback provides the pacing before the next challenge.
- Wrong-answer feedback never locks input or advances the challenge.
- All timing values are named game constants so they can be tuned after play
  testing.

## Match, challenge, and rematch terminology

To avoid ambiguity in implementation and future discussion:

- **Match:** the complete game from the opening countdown until someone
  reaches the target score or the shuffled draw pile is exhausted.
- **Challenge:** one displayed pair of cards, lasting until a correct selection
  or match-ending penalty.
- **Rematch:** a new match in the same room, with reset scores and a newly
  shuffled complete deck.

## Close or simultaneous selections

The authoritative server processes selections in the order it receives them:

- If a wrong selection is processed first, its penalty counts and the challenge
  remains open. A correct selection processed afterward also counts and closes
  the challenge. This can give the player who selected correctly two points:
  one from the opponent's mistake and one for the correct selection.
- If a correct selection is processed first, it closes the challenge. Any
  later wrong selection for that challenge is rejected and awards no point.
- If a wrong selection reaches the target score, the match finishes
  immediately, so every later selection is rejected.

Client timestamps do not override server processing order.

## Disconnects

Competitive play pauses immediately whenever fewer than two seated players are
connected. Scores and seats are preserved, and no selections are accepted
while paused.

The interrupted challenge is discarded and both displayed cards remain used.
When the disconnected player returns with the same guest identity, the game
runs a fresh 3-second countdown and then presents the next two unused cards as
a new challenge.

Disconnect behavior depends on the current phase:

- During a countdown, cancel it without consuming cards and restart the full
  countdown after reconnection.
- During an open challenge, consume both visible cards and pause.
- During correct-answer feedback, preserve the accepted point and used cards,
  then pause before dealing the next challenge.
- After the match is finished, a disconnect changes presence only and cannot
  change the recorded result.

The disconnected player has 60 seconds to return before the connected opponent
wins by forfeit.

If both players are disconnected, the match remains paused with no forfeit
winner. If neither returns within 60 seconds, the match is abandoned with no
winner so normal room cleanup can eventually remove it. If one returns first,
a fresh 60-second grace period begins for the other player.

For now, the repository's existing host-leave behavior remains unchanged: an
explicit host leave closes the room.

### Disconnect versus Leave

- **Disconnect:** an unintentional or temporary loss of the live socket, such
  as switching apps, putting the phone to sleep, losing connectivity,
  reloading, or closing a tab without using the in-game control. The player
  keeps their seat and may reconnect during the grace period.
- **Leave:** an intentional command sent when a player presses the shared
  in-game Leave control. Preserve the existing room behavior: an active guest's
  Leave is treated like a disconnect and retains the reconnection grace period;
  an explicit host Leave closes the room.

## Start authority

Only the host may start a match or rematch. The second player does not need a
Ready control; the 3-second countdown provides the start warning.

## Shared result feedback

Both clients see every accepted result and score change.

For a wrong selection:

- the X appears on the mistaken player's selected symbol
- the mistaken player sees that card as their lower card
- the opponent sees the same X on their upper reference card
- the correct match remains hidden
- the challenge remains interactive

For a correct selection:

- unrelated symbols become grayscale on both devices
- both instances of the matching symbol remain colored
- stars appear around the instance actually selected
- the answering player's name and the updated score are shown

## Player identification

The first version does not assign permanent host and guest colors. A player
identifies their interactive card by its lower position, while explicit “You”
and opponent-name labels identify scores and feedback. General interface colors
may still be used decoratively, but color is not player identity.

The scoreboard sits between the two cards and uses explicit labels in a compact
format such as:

```text
You  4    •    3  Sarah
```

## Countdown presentation

During `3–2–1`, players see two face-down or muted circular cards with the
countdown centered over the board. Symbols remain hidden so neither player can
begin searching early. At zero, both cards reveal and the lower card becomes
interactive.

## Game-board background

The game board itself is transparent and reuses the existing shared page
background. Do not add a second solid-color or rounded background panel behind
the cards. This does not affect the circular cards: their faces remain white
with dark outlines and offset shadows.

## Sound

The first version has no sound effects or music. All gameplay feedback is
communicated visually and textually.

## Finished match and rematch setup

The finished view shows:

- “You won,” the winner's name, “Tie game,” or “Match abandoned”
- the final score
- the finish reason when relevant: target reached, forfeit, deck exhausted, or
  both players disconnected
- the shared Leave control

The host sees “Set up rematch.” Selecting it returns both players to the waiting
setup instead of immediately starting another match. The host may choose 5, 7,
or 10 points and then press Start. The guest sees that the host is preparing
the next match.

## Status text

Use short explicit messages:

- “Waiting for another player.”
- “Ready when you are.”
- “Get ready!”
- “Find the matching symbol.”
- “Wrong match — point to Sarah.”
- “Sarah found it!”
- “Paused — Sarah disconnected. Waiting 0:42.”
- “Reconnecting…”
- “The host is preparing the next match.”

## Player-facing instructions

Use this initial copy in the desktop sidebar and mobile instructions panel:

> Find the one symbol shared by both cards. Tap that symbol on your lower card
> before your opponent does.
>
> A correct match gives you 1 point and deals new cards. A wrong selection
> gives your opponent 1 point, but the same challenge stays open.
>
> Matching symbols may have different sizes and rotations. The first player to
> reach the selected score wins.
>
> If a player disconnects, the match pauses briefly so they can return.

## Screenshot observations

These observations help explain the reference but do not override the rules
above.

| Screenshot | Observation                                                                                                                                                         |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1          | Two circular cards contain eight symbols each. The tool/hammer-like symbol is the only apparent match, with a different orientation on each card. The score is 0–0. |
| 2          | A successful selection is emphasized with yellow stars; unrelated symbols are muted. The lower/red score has increased to 1.                                        |
| 3          | An incorrect book selection has a red X. The upper/blue score has increased, consistent with awarding the opponent a point for a mistake.                           |
| 4          | The water-drop match is shown with fading stars and other symbols muted.                                                                                            |
| 5          | The traffic-cone match is emphasized with stars while other symbols are muted.                                                                                      |

The score/player relationship in screenshots 4 and 5 is not reliable enough
to infer additional rules because the screenshots may not be consecutive.

## Final assumption audit

The rules discussion is complete for the first version. The final edge cases
are resolved as follows:

1. If a disconnect consumes the final playable pair, finish immediately by
   deck score because no challenge remains to resume.
2. A visible wrong-answer X finishes its own animation if correct-answer
   feedback begins a moment later. Both accepted results may therefore be
   visible briefly.
3. A match-ending wrong answer locks the result immediately, displays its X for
   500 milliseconds, and then replaces the board with the finished view.
4. The first version has no sound, music, vibration, or haptic feedback.

Future icon packs, three-or-more-player rules, spectators, histories, and
persistent statistics are explicitly deferred and do not block the first
version.
