import { Router } from "express";
import { z } from "zod";
import { insertFoodEntry, deleteFoodEntry, getEntriesByDate } from "../db";

export const entriesRouter = Router();

const newEntrySchema = z.object({
  name: z.string().min(1),
  brand: z.string().nullable().optional(),
  barcode: z.string().nullable().optional(),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  quantityGrams: z.number().positive(),
  calories: z.number().nonnegative(),
  proteinG: z.number().nonnegative(),
  carbsG: z.number().nonnegative(),
  fatG: z.number().nonnegative(),
  loggedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "loggedAt muss YYYY-MM-DD sein"),
  source: z.enum(["openfoodfacts", "manual"]).optional(),
});

// POST /entries - einen Food-Eintrag loggen
entriesRouter.post("/", (req, res) => {
  const parsed = newEntrySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const entry = insertFoodEntry(parsed.data);
  res.status(201).json({ entry });
});

// GET /entries?date=YYYY-MM-DD
entriesRouter.get("/", (req, res) => {
  const date = req.query.date;
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: "Query-Parameter 'date' (YYYY-MM-DD) erforderlich" });
  }
  res.json({ entries: getEntriesByDate(date) });
});

// DELETE /entries/:id
entriesRouter.delete("/:id", (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "Ungueltige id" });
  }
  const deleted = deleteFoodEntry(id);
  if (!deleted) {
    return res.status(404).json({ error: "Eintrag nicht gefunden" });
  }
  res.status(204).send();
});
