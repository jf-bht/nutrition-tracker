import type { DashboardSummary, FoodSearchResult, FoodEntry, MealType } from "./types";

// In .env.local konfigurierbar - Standard passt zum lokalen Backend aus README.md
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Anfrage fehlgeschlagen (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function fetchDashboard(date: string): Promise<DashboardSummary> {
  return request<DashboardSummary>(`/dashboard/${date}`);
}

export function searchFoods(query: string): Promise<{ results: FoodSearchResult[] }> {
  return request(`/foods/search?q=${encodeURIComponent(query)}`);
}

export interface NewEntryPayload {
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

export function createEntry(payload: NewEntryPayload): Promise<{ entry: FoodEntry }> {
  return request(`/entries`, { method: "POST", body: JSON.stringify(payload) });
}

export function deleteEntry(id: number): Promise<void> {
  return request(`/entries/${id}`, { method: "DELETE" });
}
