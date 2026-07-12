import { useEffect, useState } from "react";
import type { FoodSearchResult, MealType } from "../types";
import { MEAL_TYPE_LABELS, MEAL_TYPE_ORDER } from "../types";
import { searchFoods, createEntry } from "../api";

interface Props {
  mealType: MealType;
  loggedAt: string;
  onClose: () => void;
  onSaved: () => void;
}

// scaleToQuantity hier bewusst dupliziert (statt Import aus dem Backend) -
// Frontend und Backend sind getrennte deploybare Einheiten ohne geteilten Code,
// das ist im Scope dieses Pet-Projects Absicht (siehe README "Architektur").
function scale(per100g: number, grams: number): number {
  return Math.round(per100g * (grams / 100) * 10) / 10;
}

export function AddEntryModal({ mealType, loggedAt, onClose, onSaved }: Props) {
  const [mode, setMode] = useState<"search" | "manual">("search");
  const [selectedMealType, setSelectedMealType] = useState<MealType>(mealType);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selected, setSelected] = useState<FoodSearchResult | null>(null);
  const [quantity, setQuantity] = useState(100);
  const [manual, setManual] = useState({ name: "", calories: 0, proteinG: 0, carbsG: 0, fatG: 0 });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Debounced Suche: erst 400ms nach dem letzten Tastendruck feuern, sonst
  // triggert jeder Buchstabe einen eigenen API-Call gegen Open Food Facts.
  useEffect(() => {
    if (mode !== "search" || query.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    setSearchError(null);
    const timer = setTimeout(() => {
      searchFoods(query)
        .then((res) => setResults(res.results))
        .catch((err) => setSearchError(err.message))
        .finally(() => setSearching(false));
    }, 400);
    return () => clearTimeout(timer);
  }, [query, mode]);

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      if (mode === "search" && selected) {
        await createEntry({
          name: selected.name,
          brand: selected.brand,
          barcode: selected.barcode,
          mealType: selectedMealType,
          quantityGrams: quantity,
          calories: scale(selected.caloriesPer100g, quantity),
          proteinG: scale(selected.proteinPer100g, quantity),
          carbsG: scale(selected.carbsPer100g, quantity),
          fatG: scale(selected.fatPer100g, quantity),
          loggedAt,
          source: "openfoodfacts",
        });
      } else {
        if (!manual.name.trim()) throw new Error("Name darf nicht leer sein");
        await createEntry({
          name: manual.name,
          mealType: selectedMealType,
          quantityGrams: quantity,
          calories: manual.calories,
          proteinG: manual.proteinG,
          carbsG: manual.carbsG,
          fatG: manual.fatG,
          loggedAt,
          source: "manual",
        });
      }
      onSaved();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  }

  const canSave = mode === "search" ? selected !== null && quantity > 0 : manual.name.trim().length > 0 && quantity > 0;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>Eintrag hinzufügen</h2>
          <button className="modal-close" onClick={onClose} aria-label="Schließen">×</button>
        </header>

        <div className="modal-tabs">
          <button
            className={mode === "search" ? "tab active" : "tab"}
            onClick={() => setMode("search")}
          >
            Suchen
          </button>
          <button
            className={mode === "manual" ? "tab active" : "tab"}
            onClick={() => setMode("manual")}
          >
            Manuell eingeben
          </button>
        </div>

        <label className="field-label" htmlFor="mealType">Mahlzeit</label>
        <select
          id="mealType"
          value={selectedMealType}
          onChange={(e) => setSelectedMealType(e.target.value as MealType)}
        >
          {MEAL_TYPE_ORDER.map((mt) => (
            <option key={mt} value={mt}>{MEAL_TYPE_LABELS[mt]}</option>
          ))}
        </select>

        {mode === "search" ? (
          <>
            <label className="field-label" htmlFor="query">Lebensmittel suchen</label>
            <input
              id="query"
              type="text"
              placeholder="z. B. Haferflocken"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelected(null);
              }}
            />
            {searching && <p className="hint">Suche läuft…</p>}
            {searchError && <p className="error-text">{searchError}</p>}
            {results.length > 0 && !selected && (
              <ul className="result-list">
                {results.map((r, i) => (
                  <li key={i}>
                    <button className="result-item" onClick={() => setSelected(r)}>
                      <span className="result-name">{r.name}</span>
                      {r.brand && <span className="result-brand">{r.brand}</span>}
                      <span className="result-kcal">{Math.round(r.caloriesPer100g)} kcal/100g</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {selected && (
              <div className="selected-food">
                <div>
                  <strong>{selected.name}</strong>
                  {selected.brand && <span className="result-brand"> · {selected.brand}</span>}
                </div>
                <button className="link-button" onClick={() => setSelected(null)}>ändern</button>
              </div>
            )}
          </>
        ) : (
          <>
            <label className="field-label" htmlFor="manualName">Bezeichnung</label>
            <input
              id="manualName"
              type="text"
              value={manual.name}
              onChange={(e) => setManual((m) => ({ ...m, name: e.target.value }))}
            />
            <div className="macro-grid">
              <label>
                kcal (gesamt)
                <input
                  type="number"
                  value={manual.calories}
                  onChange={(e) => setManual((m) => ({ ...m, calories: Number(e.target.value) }))}
                />
              </label>
              <label>
                Protein (g)
                <input
                  type="number"
                  value={manual.proteinG}
                  onChange={(e) => setManual((m) => ({ ...m, proteinG: Number(e.target.value) }))}
                />
              </label>
              <label>
                Carbs (g)
                <input
                  type="number"
                  value={manual.carbsG}
                  onChange={(e) => setManual((m) => ({ ...m, carbsG: Number(e.target.value) }))}
                />
              </label>
              <label>
                Fett (g)
                <input
                  type="number"
                  value={manual.fatG}
                  onChange={(e) => setManual((m) => ({ ...m, fatG: Number(e.target.value) }))}
                />
              </label>
            </div>
          </>
        )}

        <label className="field-label" htmlFor="quantity">
          Menge (g) {mode === "search" && selected && "— Nährwerte werden automatisch skaliert"}
        </label>
        <input
          id="quantity"
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
        />

        {saveError && <p className="error-text">{saveError}</p>}

        <footer className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Abbrechen</button>
          <button className="btn-primary" disabled={!canSave || saving} onClick={handleSave}>
            {saving ? "Speichert…" : "Speichern"}
          </button>
        </footer>
      </div>
    </div>
  );
}
