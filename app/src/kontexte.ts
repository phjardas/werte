/** Must match KontextId in backend/src/domain/kontext.ts. */
export type KontextId = "beruf" | "privat";

export interface KontextInfo {
  id: KontextId;
  titel: string;
  beschreibung: string;
  icon: string;
  /** Completes "welche dir … am wichtigsten sind". */
  imLebensbereich: string;
}

export const KONTEXTE: KontextInfo[] = [
  {
    id: "beruf",
    titel: "Berufsleben",
    beschreibung: "Was dir bei der Arbeit wichtig ist: im Team, mit Vorgesetzten und mit Kundschaft.",
    icon: "💼",
    imLebensbereich: "in deinem Berufsleben",
  },
  {
    id: "privat",
    titel: "Privatleben",
    beschreibung: "Was dir außerhalb der Arbeit wichtig ist: mit Freunden, in der Freizeit, beim Wohnen und beim Geld.",
    icon: "🏡",
    imLebensbereich: "in deinem Privatleben",
  },
];

export function kontextInfo(id: KontextId): KontextInfo {
  return KONTEXTE.find((k) => k.id === id) ?? KONTEXTE[0];
}

export const ELTERN_KOMPASS_URL = "https://werte.jessica-kioschis.de/";
