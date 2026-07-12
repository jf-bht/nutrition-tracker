import { DatabaseSync } from "node:sqlite";
import path from "path";
import type { FoodEntry, NewFoodEntryInput } from "./types";

// node:sqlite statt better-sqlite3: kein natives Kompilieren beim npm install
// noetig (better-sqlite3 muss bei jeder Node-Major-Version neu gegen die
// V8-Engine gebaut werden - bei sehr neuen Node-Versionen ohne vorkompilierte
// Binaries schlaegt das haeufig fehl). node:sqlite ist seit Node 22.5 in Node
// eingebaut, gleiche synchrone API-Philosophie wie better-sqlite3.
const DB_PATH = path.join(__dirname, "..", "nutrition.sqlite3");

export const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS food_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    brand TEXT,
    barcode TEXT,
    mealType TEXT NOT NULL CHECK (mealType IN ('breakfast','lunch','dinner','snack')),
    quantityGrams REAL NOT NULL,
    calories REAL NOT NULL,
    proteinG REAL NOT NULL,
    carbsG REAL NOT NULL,
    fatG REAL NOT NULL,
    loggedAt TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'manual',
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_food_entries_loggedAt ON food_entries (loggedAt);
`);

const insertStmt = db.prepare(`
  INSERT INTO food_entries
    (name, brand, barcode, mealType, quantityGrams, calories, proteinG, carbsG, fatG, loggedAt, source)
  VALUES
    (@name, @brand, @barcode, @mealType, @quantityGrams, @calories, @proteinG, @carbsG, @fatG, @loggedAt, @source)
`);

export function insertFoodEntry(input: NewFoodEntryInput): FoodEntry {
  const row = {
    name: input.name,
    brand: input.brand ?? null,
    barcode: input.barcode ?? null,
    mealType: input.mealType,
    quantityGrams: input.quantityGrams,
    calories: input.calories,
    proteinG: input.proteinG,
    carbsG: input.carbsG,
    fatG: input.fatG,
    loggedAt: input.loggedAt,
    source: input.source ?? "manual",
  };
  const result = insertStmt.run(row);
  return getFoodEntryById(Number(result.lastInsertRowid))!;
}

export function getFoodEntryById(id: number): FoodEntry | undefined {
  // node:sqlite typisiert Zeilen generisch als Record<string, SQLOutputValue>,
  // da es das Tabellenschema nicht kennt - Cast ueber unknown ist hier bewusst
  // und sicher, weil db.ts das Schema (siehe CREATE TABLE oben) selbst definiert.
  return db.prepare("SELECT * FROM food_entries WHERE id = ?").get(id) as unknown as
    | FoodEntry
    | undefined;
}

export function getEntriesByDate(date: string): FoodEntry[] {
  return db
    .prepare("SELECT * FROM food_entries WHERE loggedAt = ? ORDER BY createdAt ASC")
    .all(date) as unknown as FoodEntry[];
}

export function deleteFoodEntry(id: number): boolean {
  const result = db.prepare("DELETE FROM food_entries WHERE id = ?").run(id);
  return result.changes > 0;
}

export function getEntriesInRange(fromDate: string, toDate: string): FoodEntry[] {
  return db
    .prepare(
      "SELECT * FROM food_entries WHERE loggedAt BETWEEN ? AND ? ORDER BY loggedAt ASC, createdAt ASC"
    )
    .all(fromDate, toDate) as unknown as FoodEntry[];
}
