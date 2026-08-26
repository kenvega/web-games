# Documentation

## Active architecture guides

- [Reusable multiplayer architecture](./reusable-multiplayer-architecture.md):
  current ownership boundaries and readiness for another production game.
- [Adding a game](./adding-a-game.md): implementation and verification
  checklist for registering another game.

## Product backlogs

- [General tasks](./tasks.md): catalog and reusable application work.
- [Card Banking tasks](./games/card-bank/tasks.md): game-specific work.

## Game documentation

- [Card Banking rules](./games/card-bank/rules.md): gameplay rules and the
  implementation notes intentionally retained with them.
- [Symbol Match rules](./games/symbol-match/rules.md): approved first-version
  gameplay, scoring, lifecycle, and presentation rules.
- [Symbol Match technical design](./games/symbol-match/technical-design.md):
  approved lifecycle, state, race-resolution, card-generation, asset, and UI
  design.
- [Symbol Match implementation plan](./games/symbol-match/implementation-plan.md):
  ordered repository changes, asset work, tests, and verification gates.

Future games should use `docs/games/<game-id>/` for their rules and planning.

## Historical reference

- [Initial implementation plan](./implementation-plan.md): preserved context
  from the original scaffold and demonstration game. It is not the source of
  truth for the current architecture; use the active guides above for new
  work.
