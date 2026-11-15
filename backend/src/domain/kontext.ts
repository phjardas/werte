/**
 * The area of life a test is about. The context only changes the prompts for scenarios
 * and summaries; the values are the same in every context.
 */
export type KontextId = "beruf" | "privat";

/** Tests created before contexts existed have none and count as this one. */
export const STANDARD_KONTEXT: KontextId = "beruf";

export interface Kontext {
  id: KontextId;
  /** Who takes the test, in the plural: "Quiz-Fragen für {zielgruppe}". */
  zielgruppe: string;
  /** One such person, lower case: "{person} muss beide Optionen ernsthaft in Betracht ziehen können". */
  person: string;
  /** The everyday life the scenes come from, without article: "aus dem {alltag}", "in ihren {alltag}". */
  alltag: string;
  /** The area of life with preposition: "was sie über die Person {lebensbereich} aussagt". */
  lebensbereich: string;
  /** Examples of people and places in a scene, in parentheses after the scene. */
  szenenort: string;
  /** The rule that keeps scenes inside this context. */
  abgrenzung: string;
  /** The worked example for Aktivität vs. Ruhe. */
  beispiel: { gedanke: string; szenario: string; antworten: [string, string] };
  /** Where the values show, completing "wie sich diese Werte …". */
  zusammenfassungsbereich: string;
  /** Examples for the tips, in parentheses. */
  tippbeispiele: string;
  /** Extra rules for this context only, one per line. */
  zusatzregeln?: string[];
}

export const KONTEXTE: Record<KontextId, Kontext> = {
  beruf: {
    id: "beruf",
    zielgruppe: "Berufstätige",
    person: "eine berufstätige Person",
    alltag: "Arbeitsalltag",
    lebensbereich: "im Berufsleben",
    szenenort: "z.B. mit Kolleginnen und Kollegen, im Team, mit Vorgesetzten, Kundschaft oder Geschäftspartnern",
    abgrenzung:
      "Die Szene muss im beruflichen Kontext spielen – nicht im Privat- oder Familienleben. Sie soll für Berufstätige in ganz unterschiedlichen Branchen und Rollen nachvollziehbar sein; vermeide Fachjargon und branchenspezifische Details.",
    beispiel: {
      gedanke:
        "Aktivität bedeutet aktives Handeln und Bewegung (verwechselbar mit Fleiß). Ruhe bedeutet bewusstes Innehalten und Stille (verwechselbar mit Gelassenheit). Der Kernunterschied: Aktivität drängt zur Bewegung, Ruhe zum Verweilen. Wer nach einem anstrengenden Projekt eine freie Stunde hat, muss zwischen Anpacken und Durchatmen wählen – das passt nur zu Aktivität vs. Ruhe. Antwort 1 (nächstes Thema anstoßen) ist ausschließlich Aktivität, Antwort 2 (Pause machen) ist ausschließlich Ruhe.",
      szenario:
        "Dein Team hat gerade ein großes Projekt abgeschlossen und du hast unerwartet eine Stunde ohne Termine. Würdest du eher direkt das nächste Thema anstoßen, oder die Stunde für eine ruhige Pause nutzen?",
      antworten: ["Nächstes Thema direkt anstoßen", "Eine ruhige Pause machen"],
    },
    zusammenfassungsbereich:
      "im Berufsalltag zeigen könnten, etwa in der Zusammenarbeit, bei Entscheidungen oder im Umgang mit Druck",
    tippbeispiele: "z.B. Gesprächsimpulse im Team, Prioritäten bei Entscheidungen, kleine Arbeitsgewohnheiten",
  },
  privat: {
    id: "privat",
    zielgruppe: "Erwachsene in ihrem Privatleben",
    person: "ein erwachsener Mensch",
    alltag: "privaten Alltag",
    lebensbereich: "im Privatleben",
    szenenort:
      "z.B. allein für sich, bei Hobbys und Sport, auf Reisen, beim Wohnen, beim Einkaufen, bei Arztbesuchen oder Behördengängen, im Umgang mit Geld und Zeit, in der Nachbarschaft oder mit Freundinnen und Freunden",
    abgrenzung:
      "Die Szene muss im Privatleben spielen – nicht am Arbeitsplatz, nicht bei beruflichen Aufgaben und nicht in der Rolle als Mutter oder Vater. Sie soll für Erwachsene in ganz unterschiedlichen Lebenslagen nachvollziehbar sein; setze weder eine Partnerschaft noch Kinder, Wohneigentum oder besonderen Wohlstand voraus.",
    beispiel: {
      gedanke:
        "Aktivität bedeutet aktives Handeln und Bewegung (verwechselbar mit Fleiß). Ruhe bedeutet bewusstes Innehalten und Stille (verwechselbar mit Gelassenheit). Der Kernunterschied: Aktivität drängt zur Bewegung, Ruhe zum Verweilen. Wer nach einer anstrengenden Woche einen freien Samstag hat, muss zwischen Unternehmungslust und Erholung wählen – das passt nur zu Aktivität vs. Ruhe. Antwort 1 (Radtour organisieren) ist ausschließlich Aktivität, Antwort 2 (zu Hause bleiben) ist ausschließlich Ruhe.",
      szenario:
        "Nach einer anstrengenden Woche hast du einen Samstag ganz ohne Pläne. Würdest du eher spontan eine Radtour mit Freunden organisieren, oder den Tag in Ruhe zu Hause verbringen?",
      antworten: ["Eine Radtour organisieren", "Den Tag ruhig verbringen"],
    },
    zusammenfassungsbereich:
      "im privaten Alltag zeigen könnten, etwa in Freundschaften, in der Freizeit, bei Entscheidungen über Geld und Zeit oder im Umgang mit Belastungen",
    tippbeispiele:
      "z.B. Gesprächsimpulse mit Freunden oder Familie, Prioritäten bei der Planung freier Zeit, kleine Alltagsgewohnheiten",
  },
};

export const KONTEXT_IDS = Object.keys(KONTEXTE) as KontextId[];

/** Missing values count as STANDARD_KONTEXT; unknown values return null. */
export function parseKontext(wert: unknown): KontextId | null {
  if (wert === undefined || wert === null || wert === "") return STANDARD_KONTEXT;
  return typeof wert === "string" && Object.hasOwn(KONTEXTE, wert) ? (wert as KontextId) : null;
}
