# Nutrition Tracker

Eigenständiges Pet-Project für die SWT-Abschlussaufgabe (Teil B): eine schlanke
MyFitnessPal-artige Instanz zum Loggen von Mahlzeiten und zum Einsehen einer
Tages-Nährwertübersicht. Bewusst **kein** Teil des `meals`-Monorepos — dieses
Repo ist eigenständig lauffähig und wird in Teil C ausschließlich über seine
REST-API von der Meals-Hauptarchitektur (Grocery-Service) angesprochen.

## Architektur

```
meals-nutrition-tracker/
├── backend/     Express + TypeScript API, SQLite-Persistenz
└── frontend/    React + Vite Dashboard
```

- **Backend** kapselt die externe Nutrition-API (USDA FoodData Central)
  vollständig in `backend/src/services/usdaFoodData.ts`. Die Routen kennen nur
  `/foods/search`, nicht USDA-Spezifika — ein API-Wechsel würde nur diese eine
  Datei betreffen.
- **Persistenz** über `node:sqlite` (in Node eingebaut seit 22.5, synchrone
  API). Bewusst *kein* `better-sqlite3`: das ist ein natives Modul, das beim
  `npm install` gegen die installierte Node-Version kompiliert wird und bei
  sehr neuen Node-Versionen ohne vorkompilierte Binaries fehlschlagen kann.
  `node:sqlite` läuft ohne Kompilierschritt, unabhängig von der Node-Version.
- **Datenmodell**: ein `FoodEntry` ist eine geloggte Portion (bereits auf die
  geloggte Menge skalierte Nährwerte, nicht "pro 100g" — vereinfacht die
  Tages-Aggregation auf reines Summieren).
- **Aggregation** (Tagesübersicht) passiert zur Laufzeit in
  `backend/src/routes/dashboard.ts`, nicht als eigene Tabelle — bei diesem
  Datenvolumen unnötige Komplexität.
- Kein Onboarding, keine Nutzer-Ziele: dieser Service liefert reine Ist-Werte.
  Ziele/Soll-Werte sind Aufgabe von Meals (REQ-001/REQ-002), falls dieser
  Tracker später eingebunden wird.

## Setup

Voraussetzung: Node.js ≥ 22.5 (wegen `node:sqlite`). Prüfen mit `node -v`.

### Backend

```bash
cd backend
npm install
npm run dev        # startet auf http://localhost:3001
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local   # zeigt standardmäßig auf localhost:3001
npm run dev                  # startet auf http://localhost:5173
```

Beide Services müssen parallel laufen (zwei Terminals).

## API

| Methode | Pfad                     | Beschreibung                                  |
|---------|--------------------------|------------------------------------------------|
| GET     | `/health`                | Health-Check                                   |
| GET     | `/foods/search?q=...`    | Volltextsuche über Open Food Facts             |
| GET     | `/foods/barcode/:code`   | Produkt per Barcode                            |
| POST    | `/entries`                | Food-Eintrag anlegen                          |
| GET     | `/entries?date=YYYY-MM-DD` | Einträge eines Tages                        |
| DELETE  | `/entries/:id`            | Eintrag löschen                               |
| GET     | `/dashboard/:date`        | Aggregierte Tagesübersicht (kcal + Makros)    |

## Hinweis zur externen API

Nutrition-Daten kommen von [USDA FoodData Central](https://fdc.nal.usda.gov/),
einer offiziellen US-Regierungs-API (öffentliche Domain-Daten, kein API-Key
zwingend nötig — funktioniert sofort mit dem geteilten `DEMO_KEY`). Für
intensiveren Gebrauch: eigenen kostenlosen Key unter
[fdc.nal.usda.gov/api-key-signup.html](https://fdc.nal.usda.gov/api-key-signup.html)
holen und als `USDA_API_KEY` in `backend/.env` setzen (siehe `.env.example`).

**Bekannte Einschränkung**: USDA FDC hat keinen Barcode-Index (kein EAN/UPC wie
bei Open Food Facts) — `GET /foods/barcode/:code` ist daher als Route
vorhanden, liefert aber technisch bedingt immer `404`. Für den Scope dieses
Trackers unkritisch, da die Textsuche der primäre Weg ist.

Ursprünglich war Open Food Facts vorgesehen (siehe `docs/`), das
Volltext-Such-Backend war zum Entwicklungszeitpunkt aber nicht zuverlässig
erreichbar (offiziell deprecated altes Endpoint + instabiler Nachfolger) —
daher der Wechsel zu USDA FDC.

## Entwicklungs-Doku

Siehe `docs/` für die Step-by-Step-Dokumentation der Entwicklung
(Datenmodell-Entscheidungen, Prompt-Verlauf mit Claude Code).
