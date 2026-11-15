/**
 * The area of life a test is about. The context only changes the prompts for scenarios
 * and summaries; the values are the same in every context.
 */
export type KontextId = "beruf" | "privat" | "fuehrung";

/** Tests created before contexts existed have none and count as this one. */
export const STANDARD_KONTEXT: KontextId = "beruf";

export interface Kontext {
  id: KontextId;
  /** Who takes the test, in the plural: "Quiz-Fragen für {zielgruppe}". */
  zielgruppe: string;
  /** One such person, lower case and feminine ("eine …"), used as "{person} muss …" and "für {person}, die …". */
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
    person: "eine erwachsene Person",
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
  fuehrung: {
    id: "fuehrung",
    zielgruppe: "Führungskräfte",
    person: "eine Führungskraft",
    alltag: "Führungsalltag",
    lebensbereich: "als Führungskraft",
    szenenort:
      "z.B. bei der Verteilung von Aufgaben und Arbeitslast, in Feedback- und Beurteilungsgesprächen, bei Konflikten im Team, beim Setzen von Prioritäten, bei Entscheidungen unter Unsicherheit, gegenüber der eigenen Vorgesetzten oder der Geschäftsleitung, bei Einstellungen oder bei Veränderungen",
    abgrenzung:
      "Die Szene muss eine Entscheidung zeigen, die du als Führungskraft triffst und die andere Menschen betrifft, etwa dein Team, einzelne Mitarbeitende oder Bewerberinnen und Bewerber. Sie spielt nicht im Privatleben und nicht in Situationen, in denen du nur als Teammitglied handelst. Sie soll für Führungskräfte in ganz unterschiedlichen Branchen und auf allen Ebenen nachvollziehbar sein, von der Teamleitung bis zur Geschäftsführung; vermeide Fachjargon, branchenspezifische Details und Annahmen über die Größe des Unternehmens.",
    beispiel: {
      gedanke:
        "Aktivität bedeutet aktives Handeln und Bewegung (verwechselbar mit Fleiß). Ruhe bedeutet bewusstes Innehalten und Stille (verwechselbar mit Gelassenheit). Der Kernunterschied: Aktivität drängt zur Bewegung, Ruhe zum Verweilen. Wer als Führungskraft nach einer anstrengenden Phase über die nächsten Wochen des Teams entscheidet, muss zwischen Anpacken und Durchatmen wählen – das passt nur zu Aktivität vs. Ruhe. Antwort 1 (nächstes Vorhaben anstoßen) ist ausschließlich Aktivität, Antwort 2 (ruhigere Woche einplanen) ist ausschließlich Ruhe.",
      szenario:
        "Dein Team hat gerade eine anstrengende Phase hinter sich, und für die nächsten Wochen steht nichts Dringendes an. Würdest du eher gleich mit allen das nächste Vorhaben anstoßen, oder dem Team bewusst eine ruhigere Woche geben?",
      antworten: ["Nächstes Vorhaben gleich anstoßen", "Eine ruhigere Woche einplanen"],
    },
    zusammenfassungsbereich:
      "in ihrer Führungsrolle zeigen könnten, etwa im Umgang mit dem Team, bei Entscheidungen, in Feedback und Konflikten oder unter Druck von oben",
    tippbeispiele:
      "z.B. Gesprächsimpulse in Mitarbeitergesprächen, Prioritäten bei Teamentscheidungen, kleine Führungsgewohnheiten",
    zusatzregeln: [
      "Beide Antworten sind Handlungen, die du selbst als Führungskraft wählst und die spürbare Folgen für andere haben. Die Frage ist nicht, wie du selbst arbeitest, sondern wie du führst.",
      "Wähle das Thema der Szene passend zum Wertepaar und greife nicht immer auf ein Gespräch mit einem einzelnen Teammitglied zurück. Ebenso gut passen Arbeitsverteilung, Einstellungen, Prioritäten, Veränderungen, Entscheidungen mit unsicherer Lage oder das Auftreten gegenüber der Geschäftsleitung.",
      "Werte, die vor allem das eigene Leben betreffen (z.B. Wohlstand, Familie, Gesundheit), dürfen dein eigenes Interesse meinen, solange die Entscheidung in deiner Führungsrolle fällt und andere betrifft, etwa dein Bonus, deine Erreichbarkeit oder deine Belastung im Vergleich zu der des Teams.",
    ],
  },
};

export const KONTEXT_IDS = Object.keys(KONTEXTE) as KontextId[];

/** Missing values count as STANDARD_KONTEXT; unknown values return null. */
export function parseKontext(wert: unknown): KontextId | null {
  if (wert === undefined || wert === null || wert === "") return STANDARD_KONTEXT;
  return typeof wert === "string" && Object.hasOwn(KONTEXTE, wert) ? (wert as KontextId) : null;
}
