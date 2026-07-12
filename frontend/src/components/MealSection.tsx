import type { FoodEntry, MealType } from "../types";
import { MEAL_TYPE_LABELS } from "../types";

interface Props {
  mealType: MealType;
  entries: FoodEntry[];
  onDelete: (id: number) => void;
  onAddClick: (mealType: MealType) => void;
}

export function MealSection({ mealType, entries, onDelete, onAddClick }: Props) {
  const kcalSum = entries.reduce((sum, e) => sum + e.calories, 0);

  return (
    <section className="meal-section">
      <header className="meal-section-header">
        <h3>{MEAL_TYPE_LABELS[mealType]}</h3>
        <span className="meal-section-kcal">{kcalSum > 0 ? `${Math.round(kcalSum)} kcal` : ""}</span>
      </header>

      {entries.length === 0 ? (
        <p className="meal-section-empty">Noch nichts geloggt.</p>
      ) : (
        <ul className="entry-list">
          {entries.map((entry) => (
            <li key={entry.id} className="entry-item">
              <div className="entry-item-main">
                <span className="entry-item-name">{entry.name}</span>
                <span className="entry-item-meta">
                  {entry.quantityGrams}g · {Math.round(entry.calories)} kcal
                </span>
              </div>
              <button
                className="entry-item-delete"
                onClick={() => onDelete(entry.id)}
                aria-label={`${entry.name} entfernen`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <button className="meal-section-add" onClick={() => onAddClick(mealType)}>
        + Eintrag hinzufügen
      </button>
    </section>
  );
}
