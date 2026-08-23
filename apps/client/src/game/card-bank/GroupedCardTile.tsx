import {
  CARD_BANK_CARD_COLORS,
  type CardBankCardValue
} from "@multiplayer-blueprint/shared";

export function GroupedCardTile({
  value,
  count,
  label
}: {
  value: CardBankCardValue;
  count: number;
  label: string;
}) {
  return (
    <div aria-label={label} className="relative" role="img" title={label}>
      <div
        className="relative grid h-12 w-9 place-items-center overflow-hidden rounded-md border-2 border-white/80 shadow-[0_8px_18px_rgba(0,0,0,0.25)] sm:h-14 sm:w-10"
        style={{
          backgroundColor: CARD_BANK_CARD_COLORS[value],
          color: "#ffffff",
          textShadow: "0 2px 0 rgba(0,0,0,0.24)"
        }}
      >
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.18),transparent_45%,rgba(0,0,0,0.12))]" />
        <span
          className={`relative font-serif font-black leading-none ${
            value === 10 ? "text-lg" : "text-xl"
          }`}
        >
          {value}
        </span>
      </div>
      <span
        aria-hidden="true"
        className="absolute -bottom-1 -right-1.5 min-w-6 rounded-full border border-cyan-100/30 bg-slate-950 px-1 py-0.5 text-center text-[0.65rem] font-black leading-none text-cyan-100 shadow-md"
      >
        ×{count}
      </span>
    </div>
  );
}
