/** Must match KontextId in backend/src/domain/kontext.ts. */
export type KontextId = "beruf" | "privat" | "fuehrung" | "ehrenamt" | "partnerschaft";

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
  {
    id: "fuehrung",
    titel: "Führung",
    beschreibung: "Was dir als Führungskraft wichtig ist: bei Entscheidungen, im Feedback und im Umgang mit deinem Team.",
    icon: "👥",
    imLebensbereich: "in deiner Rolle als Führungskraft",
  },
  {
    id: "ehrenamt",
    titel: "Ehrenamt und Verein",
    beschreibung: "Was dir in deinem Engagement wichtig ist: bei Feuerwehr, THW und Hilfsorganisationen, im Verein und mit anderen Freiwilligen.",
    icon: "🤝",
    imLebensbereich: "in deinem Ehrenamt",
  },
  {
    id: "partnerschaft",
    titel: "Partnerschaft",
    beschreibung: "Was dir in deiner Beziehung wichtig ist: im Alltag zu zweit, bei gemeinsamen Plänen, beim Geld und mit Familie und Freunden.",
    icon: "💞",
    imLebensbereich: "in deiner Partnerschaft",
  },
];

export function kontextInfo(id: KontextId): KontextInfo {
  return KONTEXTE.find((k) => k.id === id) ?? KONTEXTE[0];
}

export const ELTERN_KOMPASS_URL = "https://werte.jessica-kioschis.de/";
