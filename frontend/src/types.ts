export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export interface FoodEntry {
  id: number;
  name: string;
  brand: string | null;
  barcode: string | null;
  mealType: MealType;
  quantityGrams: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  loggedAt: string;
  source: "openfoodfacts" | "manual";
  createdAt: string;
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

export interface FoodSearchResult {
  name: string;
  brand: string | null;
  barcode: string | null;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
}

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "Frühstück",
  lunch: "Mittag",
  dinner: "Abend",
  snack: "Snack",
};

export const MEAL_TYPE_ORDER: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
