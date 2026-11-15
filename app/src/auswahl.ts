import type { WertInfo } from "./types";

export const SEITENGROESSE = 20;
export const MAX_VORSCHLAEGE = 12;
/** Most values the comparison runs on, as in the backend. */
export const MAX_FINALE_WERTE = 10;

/**
 * The order in which a test shows its values: the saved order without values that are no longer offered,
 * followed by newly offered values in the order given (which the caller shuffles).
 */
export function ordne(gespeichert: string[] | undefined, namen: string[]): string[] {
  const angeboten = new Set(namen);
  const bekannt = (gespeichert ?? []).filter((n) => angeboten.has(n));
  const vorhanden = new Set(bekannt);
  return [...bekannt, ...namen.filter((n) => !vorhanden.has(n))];
}

export function seiten(reihenfolge: string[]): string[][] {
  const ergebnis: string[][] = [];
  for (let i = 0; i < reihenfolge.length; i += SEITENGROESSE) ergebnis.push(reihenfolge.slice(i, i + SEITENGROESSE));
  return ergebnis;
}

/** Unselected values ranked by how many selected values list them as related, ties in the test's order. */
export function vorschlaege(gewaehlt: string[], werte: WertInfo[], reihenfolge: string[]): string[] {
  const auswahl = new Set(gewaehlt);
  const treffer = new Map<string, number>();
  for (const wert of werte) {
    if (!auswahl.has(wert.name)) continue;
    for (const v of wert.verwandt) if (!auswahl.has(v)) treffer.set(v, (treffer.get(v) ?? 0) + 1);
  }
  const position = (n: string) => reihenfolge.indexOf(n);
  return [...treffer.keys()]
    .sort((a, b) => treffer.get(b)! - treffer.get(a)! || position(a) - position(b))
    .slice(0, MAX_VORSCHLAEGE);
}
