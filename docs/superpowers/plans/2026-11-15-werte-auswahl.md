# Werteauswahl in Seiten – Umsetzungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die Werteauswahl läuft in Seiten zu 20 Werten mit Kurzbeschreibungen, einer Vorschlagsseite und einem klar abgesetzten Reduzierschritt.

**Architecture:** `werte.json` bekommt `kurzbeschreibung` und `verwandt`, erzeugt von einem einmaligen Skript. `GET /werte` liefert diese Felder mit. Das Frontend teilt die gemischte, im Teststand gespeicherte Reihenfolge in Seiten und berechnet die Vorschläge lokal.

**Tech Stack:** React 19, TypeScript, Vite, vitest im Backend, `node --test` für die reine Frontend-Logik (keine neue Abhängigkeit).

**Spec:** `docs/superpowers/specs/2026-11-15-werte-auswahl-design.md`

## Global Constraints

- 20 Werte pro Seite, bis zu 12 Vorschläge, Mindestauswahl 5, höchstens 10 Werte für den Vergleich (`MAX_FINALE_WERTE`).
- Keine Bedrock-Aufrufe zur Laufzeit. Prompts nutzen weiter nur `beschreibung`.
- Werte gelten pro Kontext (`kontexte` in `werte.json`). Vorschläge und `verwandt` enthalten nur Werte, die im Kontext des Tests angeboten werden.
- Alte Teststände ohne `order`/`page` funktionieren weiter.

## Review Focus

- Teststand mit `order`, der Werte enthält, die es nicht mehr gibt oder die im Kontext nicht angeboten werden: werden entfernt, neue Werte hinten angehängt (Test in Task 3).
- Auswahl, zu der kein Wert verwandt ist: Vorschlagsseite wird übersprungen (Test in Task 3).
- `verwandt` verweist auf einen Wert, der im Kontext fehlt: wird von `GET /werte` herausgefiltert (Test in Task 1).
- Genau 10 gewählte Werte: Reduzierschritt entfällt wie bisher.
- ⓘ-Button darf die Auswahl nicht umschalten.

---

### Task 1: Backend liefert Kurzbeschreibung und Verwandte

**Files:** `backend/src/domain/werte.ts`, `backend/src/lambdas/getWerte.ts`, `backend/src/lambdas/getWerte.test.ts`

**Produces:** `GET /werte?kontext=` → `{ werte: { name: string; kurzbeschreibung: string; verwandt: string[] }[] }`; `WerteService.getAngebot(kontext): WertAngebot[]`.

- [ ] Test: `getWerte` liefert für `beruf` `[{ name: "Ruhe", kurzbeschreibung: "…", verwandt: [] }]`, wenn Ruhes `verwandt` `["Sexualität"]` enthält (nur in `privat` angeboten), und für `privat` `verwandt: ["Sexualität"]`.
- [ ] `Wert` um `kurzbeschreibung?: string` und `verwandt?: string[]` erweitern, `getAngebot` implementieren, Handler umstellen. Fehlende Felder werden zu `""` bzw. `[]`.
- [ ] `pnpm test` grün, commit.

### Task 2: Kurzbeschreibungen und Verwandtschaften erzeugen

**Files:** `backend/scripts/werteinfos.ts`, `backend/package.json` (Skript `werteinfos`), `backend/src/werte.json`, `backend/src/domain/werte.test.ts`

- [ ] Tests in `werte.test.ts`: jeder Wert hat eine `kurzbeschreibung` (≤ 140 Zeichen, ohne Arbeitsbezug laut bestehendem Regex) und 4 bis 6 `verwandt`, die alle existieren, eindeutig sind und nicht den Wert selbst enthalten.
- [ ] Skript ruft Bedrock in Paketen zu etwa 20 Werten auf, mit der vollen Namensliste als erlaubte Auswahl für `verwandt`, und schreibt die Felder in `werte.json` (Einrückung wie bisher).
- [ ] `AWS_PROFILE=phjardas pnpm werteinfos` ausführen, Ergebnis stichprobenartig prüfen, Tests grün, commit.

### Task 3: Auswahl-Logik im Frontend

**Files:** `app/src/auswahl.ts`, `app/src/auswahl.test.ts`, `app/package.json` (Skript `test`: `node --test src/*.test.ts`)

**Produces:**
- `SEITENGROESSE = 20`, `MAX_VORSCHLAEGE = 12`
- `ordne(gespeichert: string[] | undefined, namen: string[]): string[]` – behält bekannte Werte in gespeicherter Reihenfolge, hängt neue gemischt an; ohne gespeicherte Reihenfolge wird alles gemischt.
- `vorschlaege(gewaehlt: string[], werte: WertInfo[], reihenfolge: string[]): string[]`

- [ ] Tests für beide Funktionen inklusive der Fälle aus Review Focus.
- [ ] Implementieren, `pnpm test` grün, commit.

### Task 4: Seitenweise Auswahl, Vorschläge, Reduzierschritt

**Files:** `app/src/api.ts`, `app/src/types.ts`, `app/src/components/{ValueChip,SelectionStep,SuggestionStep,FilterIntroStep,FilterStep,TestSessionPage}.tsx`, `app/src/styles/index.css`, `app/e2e/full-flow.test.ts`, `CLAUDE.md`

- [ ] `Step` wird `selection | suggestions | filter-intro | filter | comparison-intro | comparison`; `TestState` bekommt `order?: string[]` und `page?: number`.
- [ ] `ValueChip`: Container `.value-chip` mit Auswahl-Button (`aria-pressed`) und ⓘ-Button (`popovertarget`, `aria-label="Was bedeutet {name}?"`), Popover am unteren Rand.
- [ ] `SelectionStep` zeigt Seite `page` von `order`, speichert bei jedem Blättern; letzte Seite führt zu `suggestions` (oder direkt weiter, wenn leer).
- [ ] `SuggestionStep` mit Mindestens-5-Prüfung, danach `filter-intro` bei mehr als 10, sonst `comparison-intro`.
- [ ] `FilterIntroStep` erklärt den Wechsel, `FilterStep` zeigt zehn Plätze.
- [ ] e2e-Test und CLAUDE.md anpassen, `pnpm build` grün, im Dev-Server durchklicken, commit.
