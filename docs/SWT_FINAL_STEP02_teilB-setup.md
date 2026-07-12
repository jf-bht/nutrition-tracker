# SWT Abschlussaufgabe — Teil B: Nutrition Tracker (Setup)

## Ziel des Schritts
Eigenständiges Pet-Project gemäß Aufgabenteil B aufsetzen: eine schlanke,
MyFitnessPal-artige Instanz zum Loggen von Mahlzeiten mit Tages-Dashboard.
Bewusst als **eigenes Repo** statt als Teil des Meals-Monorepos, um in Teil C
eine echte Modul-Grenze (Kommunikation nur per REST) nachweisen zu können.

## Werkzeug
Claude Code CLI im Terminal (Standard-Workflow für Backend/Web-Projekte ohne
IDE-spezifische Funktionen). VS-Code-Extension wird für Teil C (Mobile-Client
mit Expo) verwendet — siehe `docs/SWT_FINAL_STEP0X_teilC-*.md`.

## Architekturentscheidungen

### 1. Tech-Stack
- **Backend**: Express + TypeScript + SQLite (`better-sqlite3`)
- **Frontend**: React + Vite (kein zusätzliches UI-Framework, reines CSS)
- Bewusst *kein* Expo/React Native wie bei Meals — B soll sich klar von Meals
  abgrenzen und schnell umsetzbar bleiben (kein Mobile-Build-Overhead).

### 2. Datenmodell
Ein `FoodEntry` speichert Nährwerte bereits **skaliert auf die geloggte
Menge** (nicht "pro 100g"). Begründung: vereinfacht die Tages-Aggregation auf
reines Summieren und macht jeden Eintrag für sich genommen korrekt, auch wenn
sich Referenzwerte einer Marke bei Open Food Facts später ändern.

### 3. Aggregation ohne eigene Tabelle
Die Tagesübersicht (`GET /dashboard/:date`) aggregiert zur Laufzeit aus den
Rohdaten statt in einer separaten Summen-Tabelle geführt zu werden. Bei
Einzelnutzer-Datenvolumen ist das performant genug und vermeidet
Inkonsistenzen zwischen Rohdaten und Aggregat.

### 4. Kapselung der externen API
`services/openFoodFacts.ts` ist die einzige Datei, die weiß, dass Open Food
Facts die Datenquelle ist. Routen und Datenbankschicht kennen nur die eigene
`FoodSearchResult`-Struktur. Das ist genau der Punkt, an dem Meals (Teil C)
später per REST andockt — ein Wechsel der Nutrition-API würde nur diese eine
Datei betreffen.

## Nachweis: lokal getestet
- `POST /entries` → Eintrag wird korrekt persistiert (siehe Response mit `id`)
- `GET /dashboard/:date` → Summe über mehrere Einträge korrekt aggregiert
  (Beispiel: 320 + 540 kcal → 860 kcal, Makros analog summiert)
- Validierung greift: negative Menge wird mit 400 + Fehlermeldung abgelehnt
- Frontend-Build (`npm run build`) läuft fehlerfrei durch, TypeScript
  strict-mode ohne Fehler in Backend und Frontend

## Bekannte Einschränkung
Der Live-Test von `/foods/search` gegen die echte Open-Food-Facts-API war in
der Entwicklungsumgebung durch eine Netzwerk-Allowlist blockiert (kein
Code-Fehler, reine Sandbox-Restriktion). Lokal auf dem eigenen Rechner ohne
solche Einschränkung funktioniert der Call unverändert.

## Nachtrag: better-sqlite3 → node:sqlite (lokales Setup)

Beim ersten lokalen `npm install` auf dem eigenen Rechner (Node v26.5.0, ganz
neu) schlug die native Kompilierung von `better-sqlite3` fehl: die
V8-Engine-API hat sich seit der letzten `better-sqlite3`-Version geändert
(`GetPrototype`, `info.This()` existieren so nicht mehr), und es gab noch
keine vorkompilierten Binaries für diese Node-Version.

**Lösung**: Wechsel auf `node:sqlite` (`DatabaseSync`), seit Node 22.5 fest
in Node eingebaut — kein natives Kompilieren mehr nötig. Die API ist zur
`better-sqlite3`-API fast identisch (synchrone `prepare().run()/get()/all()`,
Named Parameters mit `@name`-Syntax, gleiche Rückgabestruktur
`{lastInsertRowid, changes}`), daher blieb der Rest der Datenzugriffsschicht
unverändert. Einzige TS-Anpassung: `node:sqlite` typisiert Zeilen generisch
als `Record<string, SQLOutputValue>`, daher Cast über `unknown` beim Mapping
auf `FoodEntry`.

Das macht den Tracker zusätzlich robuster: er läuft unabhängig von der
installierten Node-Version, ohne Abhängigkeit von plattform-/versionsspezifisch
vorkompilierten nativen Binaries.

## Nachtrag: Open Food Facts → USDA FoodData Central

Nach dem `node:sqlite`-Fix hakte es bei der Nutrition-API selbst: der
ursprünglich genutzte `/cgi/search.pl`-Endpoint von Open Food Facts lieferte
lokal durchgehend `HTTP 503` ("Page temporarily unavailable ... not available
to anonymous users"). Recherche ergab: dieses Endpoint ist laut offizieller
OFF-Doku **deprecated** und wird durch eine neue Elasticsearch-basierte
Suche ("Search-a-licious", `search.openfoodfacts.org`) ersetzt — die zum
Testzeitpunkt aber ebenfalls keine valide Response lieferte.

**Entscheidung**: Wechsel auf USDA FoodData Central (`api.nal.usda.gov`), eine
offizielle, öffentlich dokumentierte US-Regierungs-API mit stabilem Betrieb.
Funktioniert sofort über den öffentlichen `DEMO_KEY`, kein Pflicht-Signup.

**Trade-offs, bewusst in Kauf genommen**:
- Kein Barcode-Index (USDA FDC nutzt interne `fdcId`s statt EAN/UPC) —
  `/foods/barcode/:code` liefert daher technisch bedingt immer 404
- Suche auf Datentypen `Foundation`/`SR Legacy`/`Survey (FNDDS)` beschränkt
  (schließt `Branded` aus), da nur diese drei zuverlässig einheitlich pro
  100g normierte Nährwerte liefern — Branded-Foods nutzen teils
  portionsgrößen-bezogene Werte, was `scaleToQuantity()` ohne weitere
  Normalisierung verfälschen würde
- Primär US-amerikanische/englischsprachige Lebensmitteldatenbank statt der
  eher europäisch geprägten Open-Food-Facts-Daten — für den Nachweiszweck
  dieses Pet-Projects unkritisch

Parsing-Logik (`findNutrientValue`/`mapFood`) wurde isoliert gegen die
offiziell dokumentierte USDA-Response-Struktur getestet (Nutrient-Nummern
203/204/205/208 für Protein/Fett/Carbs/Energie), sowie end-to-end gegen die
komplette Express-Route mit gemocktem Fetch — beides erfolgreich, da der
echte API-Host in der Entwicklungsumgebung netzwerkseitig nicht erreichbar
war. Finale Verifikation gegen die echte API erfolgte lokal.

## Nächster Schritt
Frontend-Feinschliff (Screenshots für die Abgabe) und Übergang zu Teil C:
Anbindung dieses Trackers als externes Modul im Grocery-Service.
