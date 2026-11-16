export type Farbe = "rot" | "gelb" | "gruen" | "blau";

export const FARBEN: Record<Farbe, { titel: string; beschreibung: string }> = {
  rot: {
    titel: "Rot",
    beschreibung:
      "Ergebnisse, Entschlossenheit und Wirkung. Du willst etwas bewegen.",
  },
  gelb: {
    titel: "Gelb",
    beschreibung:
      "Begeisterung, Ideen und Freiheit. Du suchst das Neue und steckst andere an.",
  },
  gruen: {
    titel: "Grün",
    beschreibung:
      "Beziehungen, Harmonie und Verlässlichkeit. Dir liegen die Menschen um dich am Herzen.",
  },
  blau: {
    titel: "Blau",
    beschreibung:
      "Klarheit, Sorgfalt und Gerechtigkeit. Du willst, dass die Dinge stimmen.",
  },
};

export interface FarbAnteil {
  farbe: Farbe;
  /** Share in percent, rounded, so the four shares add up to about 100. */
  anteil: number;
  werte: string[];
}

/**
 * Distribution of the ranked values over the four colours. `werte` is ordered by rank, and the value on place i
 * of n counts n - i times (5, 4, 3, 2, 1 for the top 5). Each value also counts inversely to how many offered
 * values have its colour, so a colour with many values in the list does not win just by being common.
 */
export function farbVerteilung(
  werte: string[],
  angebot: { name: string; farbe: Farbe }[],
): FarbAnteil[] {
  const farbeVon = new Map(angebot.map((w) => [w.name, w.farbe]));
  const basis = new Map<Farbe, number>();
  for (const w of angebot) basis.set(w.farbe, (basis.get(w.farbe) ?? 0) + 1);

  const anteile = (Object.keys(FARBEN) as Farbe[]).map((farbe) => {
    const passend = werte.filter((w) => farbeVon.get(w) === farbe);
    return {
      farbe,
      werte: passend,
      gewicht:
        passend.reduce((g, w) => g + werte.length - werte.indexOf(w), 0) /
        (basis.get(farbe) ?? 1),
    };
  });
  const summe = anteile.reduce((s, a) => s + a.gewicht, 0) || 1;
  return anteile
    .map(({ farbe, werte, gewicht }) => ({
      farbe,
      werte,
      anteil: Math.round((100 * gewicht) / summe),
    }))
    .sort((a, b) => b.anteil - a.anteil);
}
