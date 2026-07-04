export function GameInstructions() {
  return (
    <div className="grid content-start gap-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
        How to Play
      </h3>
      <div className="grid gap-3 text-sm leading-6 text-slate-300">
        <p>
          Draw cards to collect points. The higher the value, the more you score
          — but push too far and you'll bust.
        </p>
        <div>
          <p className="font-semibold text-slate-100">On your turn:</p>
          <ul className="mt-1 grid gap-1 pl-4 list-disc text-slate-400">
            <li>Draw a card from the deck into your active area.</li>
            <li>Keep drawing or stop to protect your cards.</li>
            <li>Cards are banked safely at the start of your next turn.</li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-slate-100">Busting:</p>
          <p className="mt-1 text-slate-400">
            If you have 3+ active cards and draw a duplicate value, you bust —
            all your active cards are discarded.
          </p>
        </div>
        <div>
          <p className="font-semibold text-slate-100">Stealing:</p>
          <p className="mt-1 text-slate-400">
            When you draw a card that matches another player's active cards, you
            can steal all their copies of that value.
          </p>
        </div>
        <div>
          <p className="font-semibold text-slate-100">Winning:</p>
          <p className="mt-1 text-slate-400">
            The game ends when the deck runs out. Highest total from banked cards
            wins.
          </p>
        </div>
      </div>
    </div>
  );
}
