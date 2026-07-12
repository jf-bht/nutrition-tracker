import "dotenv/config";
import express from "express";
import cors from "cors";
import { foodsRouter } from "./routes/foods";
import { entriesRouter } from "./routes/entries";
import { dashboardRouter } from "./routes/dashboard";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "meals-nutrition-tracker-backend" });
});

app.use("/foods", foodsRouter);
app.use("/entries", entriesRouter);
app.use("/dashboard", dashboardRouter);

app.listen(PORT, () => {
  console.log(`meals-nutrition-tracker backend laeuft auf http://localhost:${PORT}`);
});
