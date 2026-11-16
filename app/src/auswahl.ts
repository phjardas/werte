import type { WertInfo } from "./types";

export const SEITENGROESSE = 20;
export const MAX_VORSCHLAEGE = 12;
/** Most values the comparison runs on, as in the backend. */
export const MAX_FINALE_WERTE = 10;

/**
 * The order in which a test shows its values: the saved order without values that are no longer offered,
 * followed by newly offered values in the order given (which the caller shuffles).
 */
export function ordne(
  gespeichert: string[] | undefined,
  namen: string[],
): string[] {
  const angeboten = new Set(namen);
  const bekannt = (gespeichert ?? []).filter((n) => angeboten.has(n));
  const vorhanden = new Set(bekannt);
  return [...bekannt, ...namen.filter((n) => !vorhanden.has(n))];
}

export function seiten(reihenfolge: string[]): string[][] {
  const ergebnis: string[][] = [];
  for (let i = 0; i < reihenfolge.length; i += SEITENGROESSE)
    ergebnis.push(reihenfolge.slice(i, i + SEITENGROESSE));
  return ergebnis;
}

/** Unselected values ranked by how many selected values list them as related, ties in the test's order. */
export function vorschlaege(
  gewaehlt: string[],
  werte: WertInfo[],
  reihenfolge: string[],
): string[] {
  const auswahl = new Set(gewaehlt);
  // Near-synonyms of a selected value would only be merged again before the filter.
  const ausgeschlossen = new Set(
    werte.filter((w) => auswahl.has(w.name)).flatMap((w) => w.gleichbedeutend),
  );
  const treffer = new Map<string, number>();
  for (const wert of werte) {
    if (!auswahl.has(wert.name)) continue;
    for (const v of wert.verwandt)
      if (!auswahl.has(v) && !ausgeschlossen.has(v))
        treffer.set(v, (treffer.get(v) ?? 0) + 1);
  }
  const position = (n: string) => reihenfolge.indexOf(n);
  return [...treffer.keys()]
    .sort(
      (a, b) => treffer.get(b)! - treffer.get(a)! || position(a) - position(b),
    )
    .slice(0, MAX_VORSCHLAEGE);
}

/** The groups of near-synonyms of which the selection holds more than one, each in the order of the selection. */
export function synonymgruppen(
  gewaehlt: string[],
  werte: WertInfo[],
): string[][] {
  const gleichbedeutend = new Map(
    werte.map((w) => [w.name, w.gleichbedeutend]),
  );
  const gruppen: string[][] = [];
  const erfasst = new Set<string>();
  for (const name of gewaehlt) {
    if (erfasst.has(name)) continue;
    const gruppe = [
      name,
      ...gewaehlt.filter((n) => gleichbedeutend.get(name)?.includes(n)),
    ];
    gruppe.forEach((n) => erfasst.add(n));
    if (gruppe.length > 1) gruppen.push(gruppe);
  }
  return gruppen;
}
