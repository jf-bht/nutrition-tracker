# Teil B — Nutrition Tracker: Entwicklungsprotokoll

**Tool:** Claude Desktop App (Chat-basiertes Vibecoding, kein CLI-Einsatz für
diesen Teil — siehe Teil C für den CLI-/VS-Code-Extension-Nachweis)
**Zeitraum:** 11.–12. Juli 2026

Dieses Protokoll dokumentiert die zentralen Entscheidungspunkte und Prompts
der Entwicklung, nicht den vollständigen Chat-Verlauf. Fokus liegt auf
Architekturentscheidungen und aufgetretenen Problemen, da diese den größeren
Lernwert für die Abgabe haben als reine UI-Iteration.

---

### 1 · Projektaufsatz

> *„Backend: Node/Express/TypeScript mit einfacher SQLite-Speicherung,
> Frontend: React/Vite-Dashboard, Anbindung an eine externe Nutrition-API."*

Ergebnis: REST-API (`/foods/search`, `/entries`, `/dashboard/:date`) mit
sauber gekapselter externer API-Schicht, Datenmodell `FoodEntry` mit auf die
tatsächlich geloggte Menge skalierten Nährwerten (statt „pro 100 g"), React-
Dashboard im Meals-Grün (`#22C55E`) für optische Konsistenz zu Teil A.

### 2 · Externe API, erster Anlauf: Open Food Facts

Kostenlos, ohne Authentifizierung — auf dem Papier die naheliegende Wahl.
Die Service-Schicht wurde bewusst so entworfen, dass Routen und Datenbank
nichts vom konkreten Anbieter wissen (Prinzip: ein Anbieterwechsel betrifft
genau eine Datei).

**Befund beim lokalen Testen:** Das verwendete Such-Endpoint
(`/cgi/search.pl`) lieferte durchgehend `HTTP 503`.

### 3 · Störung #1 — natives Modul vs. Node-Version

**Symptom:** `npm install` schlug bei der Kompilierung von `better-sqlite3`
fehl (Node v26.5.0, zu neu für vorkompilierte Binaries; V8-API-Änderungen
brachen den nativen Build).

**Maßnahme:** Wechsel auf das in Node eingebaute `node:sqlite`
(`DatabaseSync`). API-kompatibel genug, dass der Großteil der
Datenzugriffsschicht unverändert blieb — kein natives Kompilieren mehr
nötig, unabhängig von der installierten Node-Version.

### 4 · Störung #2 — Open Food Facts dauerhaft nicht erreichbar

Recherche ergab: das genutzte Endpoint ist laut offizieller Open-Food-Facts-
Dokumentation deprecated. Der vorgesehene Nachfolger
(„Search-a-licious", `search.openfoodfacts.org`) lieferte beim lokalen Test
ebenfalls keine valide Antwort.

> *„sonst eine andere nutrition api?"*

**Maßnahme:** Wechsel auf **USDA FoodData Central** — offizielle
US-Regierungs-API, sofort nutzbar über den öffentlichen `DEMO_KEY`. Die
Parsing-Logik wurde vor dem Live-Test isoliert gegen die offiziell
dokumentierte Response-Struktur verifiziert (Nutrient-Codes 203/204/205/208
für Protein/Fett/Kohlenhydrate/Energie), da der API-Host in der
Entwicklungsumgebung zeitweise nicht direkt erreichbar war.

**Bewusst in Kauf genommene Einschränkungen:** kein Barcode-Index (USDA FDC
nutzt interne IDs statt EAN/UPC), Suche auf die Datentypen
`Foundation`/`SR Legacy`/`Survey (FNDDS)` beschränkt (nur diese liefern
zuverlässig einheitliche Pro-100-g-Werte), primär englischsprachige
Datenbank.

### 5 · Störung #3 — Rate-Limit des DEMO_KEY

Nach mehreren Testsuchen: `HTTP 429`. Der `DEMO_KEY` ist ein über alle
Nutzer weltweit geteiltes, niedriges Kontingent.

**Maßnahme:** Eigener kostenloser API-Key
([fdc.nal.usda.gov/api-key-signup.html](https://fdc.nal.usda.gov/api-key-signup.html)),
hinterlegt in `backend/.env`.

### 6 · Störung #4 — Umgebungsvariable wurde nicht geladen

Trotz gesetztem Key weiterhin `429`: Node/Express liest `.env`-Dateien nicht
automatisch ein. Fehlte im ursprünglichen Setup.

**Maßnahme:** `dotenv` als Abhängigkeit ergänzt, `import "dotenv/config"`
als erste Zeile in `src/index.ts`.

### 7 · Verifikation

Nach Behebung aller vier Störungen erfolgreich getestet: Volltextsuche
(„oats" → mehrere Treffer mit korrekten Nährwerten), Einträge über
verschiedene Mahlzeiten hinweg, korrekte Tages-Aggregation (641 kcal aus
drei Einträgen, Makro-Verteilung konsistent mit den Einzelwerten).

---

### Reflexion

Der größte Teil der Fehlersuche betraf nicht die Anwendungslogik selbst
(die stand nach dem ersten Prompt weitgehend), sondern die Integration der
externen Nutrition-API — teils durch eine echte Instabilität beim
ursprünglich gewählten Anbieter, teils durch zwei vermeidbare
Konfigurationsfehler (natives Modul vs. Node-Version, fehlendes
`.env`-Loading). Das bestätigt den Wert von Teil B als eigenständigem
Testfeld für die externe API-Anbindung, bevor dasselbe Architekturprinzip
in Teil C für den Grocery-Service wiederverwendet wird.
