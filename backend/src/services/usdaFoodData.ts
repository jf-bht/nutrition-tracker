import type { FoodSearchResult } from "../types";

// Diese Schicht kapselt die externe Nutrition-API bewusst vollstaendig:
// Weder db.ts noch die Routen wissen, dass USDA FoodData Central konkret
// dahintersteckt. Genau dieses Modul ist der Punkt, an dem Meals (Teil C) den
// Tracker per REST anspricht - die Grocery-Service-Anbindung in C soll gegen
// /foods/search gehen, nicht gegen USDA-Spezifika. Ein weiterer API-Wechsel
// betrifft dann ausschliesslich diese Datei.
//
// Wechsel-Historie (siehe docs/): urspruenglich Open Food Facts, aber sowohl das
// alte /cgi/search.pl-Endpoint (offiziell deprecated, liefert 503) als auch der
// neue Search-a-licious-Nachfolger waren zum Entwicklungszeitpunkt nicht
// zuverlaessig erreichbar. USDA FoodData Central ist eine offizielle,
// gut dokumentierte US-Regierungs-API mit stabilem Uptime und funktioniert ohne
// Registrierung ueber den oeffentlichen DEMO_KEY.

const BASE_URL = "https://api.nal.usda.gov/fdc/v1";
// DEMO_KEY erlaubt sofortiges Testen ohne Registrierung (geteiltes, niedrigeres
// Rate-Limit ueber alle Nutzer). Fuer den produktiven/laengeren Gebrauch: eigenen
// kostenlosen Key unter https://fdc.nal.usda.gov/api-key-signup.html holen und
// als USDA_API_KEY in .env setzen (siehe .env.example).
const API_KEY = process.env.USDA_API_KEY ?? "DEMO_KEY";

// Wir beschraenken die Suche bewusst auf Foundation/SR Legacy/Survey-Datensaetze
// und schliessen "Branded" aus: bei diesen drei Datentypen sind Naehrwerte
// zuverlaessig einheitlich pro 100g angegeben, waehrend Branded-Foods teils
// Portionsgroessen-bezogene Werte liefern - das wuerde scaleToQuantity() ohne
// weitere Normalisierung verfaelschen.
const DATA_TYPES = "Foundation,SR Legacy,Survey (FNDDS)";

interface UsdaNutrient {
  nutrientId?: number;
  nutrientName?: string;
  nutrientNumber?: string;
  unitName?: string;
  value?: number;
  // Detail-Endpoint (/food/:id) verschachtelt das anders als /foods/search -
  // defensiv beide Formen unterstuetzen.
  nutrient?: { id?: number; name?: string; number?: string; unitName?: string };
  amount?: number;
}

interface UsdaFood {
  fdcId: number;
  description?: string;
  brandOwner?: string;
  foodNutrients?: UsdaNutrient[];
}

interface UsdaSearchResponse {
  foods?: UsdaFood[];
}

// USDA-Standard-Nutrient-Nummern (stabil ueber alle Datentypen hinweg, im
// Gegensatz zu den Namen, die je nach Datensatz leicht variieren koennen).
const NUTRIENT_NUMBERS = {
  energyKcal: "208",
  protein: "203",
  carbs: "205",
  fat: "204",
};

function findNutrientValue(nutrients: UsdaNutrient[] | undefined, number: string): number {
  if (!nutrients) return 0;
  const match = nutrients.find(
    (n) => n.nutrientNumber === number || n.nutrient?.number === number
  );
  if (!match) return 0;
  return match.value ?? match.amount ?? 0;
}

function mapFood(food: UsdaFood): FoodSearchResult | null {
  if (!food.description) return null;
  const calories = findNutrientValue(food.foodNutrients, NUTRIENT_NUMBERS.energyKcal);
  // Ohne Kalorienwert ist ein Eintrag fuers Tracking nutzlos - konsequent aussortieren
  // statt mit 0 kcal weiterzugeben, das wuerde das Dashboard stillschweigend verfaelschen.
  if (calories === 0) return null;

  return {
    name: food.description,
    brand: food.brandOwner ?? null,
    barcode: null, // USDA FDC nutzt fdcId statt EAN/UPC-Barcodes - kein 1:1-Aequivalent
    caloriesPer100g: calories,
    proteinPer100g: findNutrientValue(food.foodNutrients, NUTRIENT_NUMBERS.protein),
    carbsPer100g: findNutrientValue(food.foodNutrients, NUTRIENT_NUMBERS.carbs),
    fatPer100g: findNutrientValue(food.foodNutrients, NUTRIENT_NUMBERS.fat),
  };
}

export async function searchFoods(query: string): Promise<FoodSearchResult[]> {
  const url =
    `${BASE_URL}/foods/search?api_key=${API_KEY}` +
    `&query=${encodeURIComponent(query)}` +
    `&pageSize=15` +
    `&dataType=${encodeURIComponent(DATA_TYPES)}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`USDA FoodData Central search failed: ${res.status}`);
  }
  const data = (await res.json()) as UsdaSearchResponse;
  return (data.foods ?? []).map(mapFood).filter((f): f is FoodSearchResult => f !== null);
}

// Barcode-Suche gibt es bei USDA FDC in dieser Form nicht (kein EAN-Index) -
// Route bleibt bestehen, liefert aber bewusst null. Dokumentiert als bekannte
// Einschraenkung in README.md.
export async function getFoodByBarcode(_barcode: string): Promise<FoodSearchResult | null> {
  return null;
}

// Skaliert einen 100g-Referenzwert auf die tatsaechlich geloggte Menge.
// Eigene, testbare Funktion statt Inline-Rechnung in der Route (siehe routes/entries.ts).
export function scaleToQuantity(result: FoodSearchResult, quantityGrams: number) {
  const factor = quantityGrams / 100;
  return {
    calories: round1(result.caloriesPer100g * factor),
    proteinG: round1(result.proteinPer100g * factor),
    carbsG: round1(result.carbsPer100g * factor),
    fatG: round1(result.fatPer100g * factor),
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
