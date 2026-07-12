import { Router } from "express";
import { getEntriesByDate } from "../db";
import type { DashboardSummary } from "../types";

export const dashboardRouter = Router();

// GET /dashboard/:date - aggregierte Tagesuebersicht (Kalorien + Makros)
// Aggregation passiert hier zur Laufzeit statt in einer eigenen Tabelle - siehe
// Begruendung in types.ts. Bei taeglich wenigen Eintraegen ist das performant genug
// und vermeidet Inkonsistenzen zwischen Rohdaten und einer separaten Summen-Tabelle.
dashboardRouter.get("/:date", (req, res) => {
  const date = req.params.date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: "Datum muss im Format YYYY-MM-DD sein" });
  }

  const entries = getEntriesByDate(date);

  const totals = entries.reduce(
    (acc, e) => {
      acc.calories += e.calories;
      acc.proteinG += e.proteinG;
      acc.carbsG += e.carbsG;
      acc.fatG += e.fatG;
      return acc;
    },
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  );

  const summary: DashboardSummary = {
    date,
    totals: {
      calories: round1(totals.calories),
      proteinG: round1(totals.proteinG),
      carbsG: round1(totals.carbsG),
      fatG: round1(totals.fatG),
    },
    entries,
  };

  res.json(summary);
});

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
