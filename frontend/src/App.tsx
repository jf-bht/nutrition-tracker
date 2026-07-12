import { useCallback, useEffect, useState } from "react";
import type { DashboardSummary, MealType } from "./types";
import { MEAL_TYPE_ORDER } from "./types";
import { fetchDashboard, deleteEntry } from "./api";
import { DailySummary } from "./components/DailySummary";
import { MealSection } from "./components/MealSection";
import { AddEntryModal } from "./components/AddEntryModal";
import "./App.css";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function App() {
  const [date, setDate] = useState(todayIso());
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalMealType, setModalMealType] = useState<MealType | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchDashboard(date)
      .then(setSummary)
      .catch((err) => setError(err.message ?? "Dashboard konnte nicht geladen werden"))
      .finally(() => setLoading(false));
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(id: number) {
    await deleteEntry(id);
    load();
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Nutrition Tracker</h1>
          <p className="page-subtitle">Food-Log & Tagesübersicht</p>
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-label="Datum wählen"
        />
      </header>

      {loading && <p className="hint">Lädt…</p>}
      {error && (
        <p className="error-text">
          {error} — läuft das Backend auf <code>localhost:3001</code>?
        </p>
      )}

      {summary && (
        <>
          <DailySummary summary={summary} />

          <div className="meal-grid">
            {MEAL_TYPE_ORDER.map((mt) => (
              <MealSection
                key={mt}
                mealType={mt}
                entries={summary.entries.filter((e) => e.mealType === mt)}
                onDelete={handleDelete}
                onAddClick={setModalMealType}
              />
            ))}
          </div>
        </>
      )}

      {modalMealType && (
        <AddEntryModal
          mealType={modalMealType}
          loggedAt={date}
          onClose={() => setModalMealType(null)}
          onSaved={() => {
            setModalMealType(null);
            load();
          }}
        />
      )}
    </div>
  );
}
