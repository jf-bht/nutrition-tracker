import type { DashboardSummary } from "../types";

interface Props {
  summary: DashboardSummary;
}

// Bewusst ohne Ziel-/Soll-Werte: dieser Tracker hat kein Onboarding und keine
// Nutzerziele (das ist Meals' Aufgabe in REQ-001/REQ-002). Er zeigt reine Ist-Werte -
// wenn er spaeter von Meals aus per REST angebunden wird, liefert Meals die Ziele,
// dieser Service liefert nur die getrackten Fakten.
export function DailySummary({ summary }: Props) {
  const { totals } = summary;
  const macroTotal = totals.proteinG + totals.carbsG + totals.fatG;

  const macros = [
    { label: "Protein", value: totals.proteinG, color: "#22c55e" },
    { label: "Carbs", value: totals.carbsG, color: "#84cc16" },
    { label: "Fett", value: totals.fatG, color: "#facc15" },
  ];

  return (
    <section className="summary-card">
      <div className="summary-headline">
        <span className="summary-kcal">{Math.round(totals.calories)}</span>
        <span className="summary-kcal-label">kcal heute</span>
      </div>

      <div className="macro-bar" role="img" aria-label="Verteilung der Makronährstoffe">
        {macroTotal === 0 ? (
          <div className="macro-bar-empty" />
        ) : (
          macros.map((m) => (
            <div
              key={m.label}
              className="macro-bar-segment"
              style={{
                width: `${(m.value / macroTotal) * 100}%`,
                background: m.color,
              }}
            />
          ))
        )}
      </div>

      <div className="macro-legend">
        {macros.map((m) => (
          <div className="macro-legend-item" key={m.label}>
            <span className="macro-dot" style={{ background: m.color }} />
            {m.label} <strong>{m.value.toFixed(0)}g</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
