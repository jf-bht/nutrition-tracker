import { Router } from "express";
import { z } from "zod";
import { searchFoods, getFoodByBarcode } from "../services/usdaFoodData";

export const foodsRouter = Router();

const searchQuerySchema = z.object({
  q: z.string().min(2, "Suchbegriff muss mindestens 2 Zeichen haben"),
});

// GET /foods/search?q=haferflocken
foodsRouter.get("/search", async (req, res) => {
  const parsed = searchQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  try {
    const results = await searchFoods(parsed.data.q);
    res.json({ results });
  } catch (err) {
    res.status(502).json({ error: "USDA FoodData Central nicht erreichbar", detail: String(err) });
  }
});

// GET /foods/barcode/:code
foodsRouter.get("/barcode/:code", async (req, res) => {
  try {
    const result = await getFoodByBarcode(req.params.code);
    if (!result) {
      return res.status(404).json({ error: "Kein Produkt zu diesem Barcode gefunden" });
    }
    res.json({ result });
  } catch (err) {
    res.status(502).json({ error: "USDA FoodData Central nicht erreichbar", detail: String(err) });
  }
});
