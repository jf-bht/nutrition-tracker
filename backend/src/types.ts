// Kern-Datenmodell des Nutrition-Trackers.
// Bewusst schlank gehalten: ein Eintrag = eine geloggte Portion eines Lebensmittels.
// Die Aggregation (Tagesuebersicht) passiert zur Laufzeit in dashboard.ts, nicht als
// eigene Tabelle - bei diesem Datenvolumen (Einzelnutzer-Pet-Project) unnoetig.

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export interface FoodEntry {
  id: number;
  name: string;
  brand: string | null;
  barcode: string | null;
  mealType: MealType;
  quantityGrams: number;
  // Naehrwerte werden IMMER bereits auf quantityGrams skaliert gespeichert,
  // nicht als "pro 100g" - das vereinfacht die Dashboard-Aggregation (nur summieren)
  // und macht jeden Eintrag fuer sich genommen korrekt, auch wenn sich die
  // 100g-Referenzwerte einer Marke spaeter aendern.
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  loggedAt: string; // ISO-Datum (YYYY-MM-DD), Tages-Granularitaet reicht fuer das Dashboard
  source: "openfoodfacts" | "manual";
  createdAt: string; // ISO-Timestamp
}

export interface NewFoodEntryInput {
  name: string;
  brand?: string | null;
  barcode?: string | null;
  mealType: MealType;
  quantityGrams: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  loggedAt: string;
  source?: "openfoodfacts" | "manual";
}

// Normalisiertes Suchergebnis aus der Open-Food-Facts-API, referenziert auf 100g -
// das ist der Rohzustand, bevor der Nutzer eine Menge waehlt und wir auf
// quantityGrams skalieren (siehe services/openFoodFacts.ts -> scaleToQuantity).
export interface FoodSearchResult {
  name: string;
  brand: string | null;
  barcode: string | null;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
}

export interface DashboardSummary {
  date: string;
  totals: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  };
  entries: FoodEntry[];
}
