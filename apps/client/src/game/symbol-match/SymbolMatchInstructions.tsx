export function SymbolMatchInstructions() {
  return (
    <div className="grid content-start gap-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
        How to Play
      </h3>
      <div className="grid gap-4 text-sm leading-6 text-slate-300">
        <p>
          Race to find the one symbol shared by the two circular cards. Size and
          rotation do not change a symbol&apos;s identity.
        </p>

        <section>
          <p className="font-semibold text-slate-100">Your challenge</p>
          <ul className="mt-1 grid list-disc gap-1 pl-4 text-slate-400">
            <li>Your card is always the lower card.</li>
            <li>The upper card is your visual reference.</li>
            <li>Only symbols on your lower card can be selected.</li>
          </ul>
        </section>

        <section>
          <p className="font-semibold text-slate-100">Scoring</p>
          <ul className="mt-1 grid list-disc gap-1 pl-4 text-slate-400">
            <li>A correct match gives you 1 point.</li>
            <li>A wrong selection gives your opponent 1 point.</li>
            <li>
              A mistake does not reveal the answer or replace the cards. Keep
              looking for the correct match.
            </li>
          </ul>
        </section>

        <section>
          <p className="font-semibold text-slate-100">Winning</p>
          <p className="mt-1 text-slate-400">
            The first player to reach the room&apos;s “Points to win” target
            wins. The host can choose 5, 7, or 10 points before a match.
          </p>
        </section>

        <section>
          <p className="font-semibold text-slate-100">Pacing and reconnects</p>
          <p className="mt-1 text-slate-400">
            A 3–2–1 countdown starts the match. If someone disconnects, play
            pauses and their seat is held briefly so they can return.
          </p>
        </section>
      </div>
    </div>
  );
}
