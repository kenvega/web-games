import { SYMBOL_MATCH_SYMBOL_IDS } from "@multiplayer-blueprint/shared";
import { SYMBOL_MATCH_SYMBOL_CATALOG } from "../symbolCatalog.js";
import "./symbolContactSheet.css";

const sampleSizes = [24, 44, 72] as const;
const sampleRotations = [0, 90, 217] as const;
const criticalComparisonIds = [
  "planet",
  "flying-saucer",
  "rocket",
  "airplane"
] as const;

export function SymbolContactSheet() {
  return (
    <main className="sm-contact-sheet">
      <header>
        <p className="sm-contact-sheet__eyebrow">Development artifact</p>
        <h1>Symbol Match contact sheet</h1>
        <p>
          Every original asset at three sizes and three rotations. This page is
          not imported by the game application.
        </p>
      </header>

      <section aria-labelledby="critical-comparison-heading">
        <h2 id="critical-comparison-heading">
          Small-size and grayscale silhouette check
        </h2>
        <div className="sm-contact-sheet__comparison">
          {criticalComparisonIds.map((symbolId) => {
            const symbol = SYMBOL_MATCH_SYMBOL_CATALOG[symbolId];
            return (
              <article
                key={symbolId}
                className="sm-contact-sheet__comparison-card"
              >
                <h3>{symbol.label}</h3>
                <div className="sm-contact-sheet__comparison-row">
                  {[24, 44].map((size) => (
                    <img
                      key={`color-${size}`}
                      src={symbol.assetUrl}
                      alt={`${symbol.label}, ${size} pixels`}
                      width={size}
                      height={size}
                    />
                  ))}
                  {[24, 44].map((size) => (
                    <img
                      key={`gray-${size}`}
                      className="sm-contact-sheet__grayscale"
                      src={symbol.assetUrl}
                      alt={`${symbol.label}, grayscale, ${size} pixels`}
                      width={size}
                      height={size}
                    />
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="complete-roster-heading">
        <h2 id="complete-roster-heading">Complete roster</h2>
        <div className="sm-contact-sheet__grid">
          {SYMBOL_MATCH_SYMBOL_IDS.map((symbolId) => {
            const symbol = SYMBOL_MATCH_SYMBOL_CATALOG[symbolId];
            return (
              <article key={symbolId} className="sm-contact-sheet__card">
                <h3>{symbol.label}</h3>
                <code>{symbolId}</code>
                <div className="sm-contact-sheet__samples">
                  {sampleSizes.map((size, index) => (
                    <div key={size} className="sm-contact-sheet__sample">
                      <img
                        src={symbol.assetUrl}
                        alt={`${symbol.label}, ${size} pixels, rotated ${sampleRotations[index]} degrees`}
                        width={size}
                        height={size}
                        style={{
                          transform: `rotate(${sampleRotations[index]}deg)`
                        }}
                      />
                      <span>{size}px</span>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
