import type { KontextId } from "./kontext.js";

/** The colour of a value in the four-colour model (red: results, yellow: inspiration, green: relationships, blue: accuracy). */
export type Farbe = "rot" | "gelb" | "gruen" | "blau";
export const FARBEN: readonly Farbe[] = ["rot", "gelb", "gruen", "blau"];

export interface Wert {
  name: string;
  synonyme: string[];
  definition: string[];
  beschreibung: string[];
  /** The contexts this value is offered in. Missing means every context. */
  kontexte?: string[];
  /** One sentence shown in the app when someone is unsure what the value means. */
  kurzbeschreibung?: string;
  /** Related values, used by the app to suggest values that fit the selection. */
  verwandt?: string[];
  farbe?: string;
  /**
   * Values with the same group are near-synonyms. A test that selects several of them keeps only the one the person
   * picks, because a scenario cannot make anyone choose between them.
   */
  synonymgruppe?: string;
}

/** What the app gets for a value offered in a context. */
export interface WertAngebot {
  name: string;
  kurzbeschreibung: string;
  verwandt: string[];
  farbe: Farbe;
  /** The other values offered in the context that are near-synonyms of this one. */
  gleichbedeutend: string[];
}

/** The comparison runs on at most this many values, see the filter step in the app. */
export const MAX_FINALE_WERTE = 10;

export class WerteService {
  private readonly werteMap: ReadonlyMap<string, Wert>;

  constructor(private readonly werte: readonly Wert[]) {
    this.werteMap = new Map(werte.map((w) => [w.name, w]));
  }

  getAll(): readonly Wert[] {
    return this.werte;
  }

  /** Names of the values offered in a context, or of all values without one. */
  getNames(kontext?: KontextId): string[] {
    return this.werte.filter((w) => !kontext || !w.kontexte || w.kontexte.includes(kontext)).map((w) => w.name);
  }

  /** The values offered in a context, with related values restricted to those offered there too. */
  getAngebot(kontext: KontextId): WertAngebot[] {
    const namen = new Set(this.getNames(kontext));
    return this.werte
      .filter((w) => namen.has(w.name))
      .map((w) => ({
        name: w.name,
        kurzbeschreibung: w.kurzbeschreibung ?? "",
        verwandt: (w.verwandt ?? []).filter((v) => namen.has(v)),
        farbe: w.farbe as Farbe,
        gleichbedeutend: this.werte
          .filter((v) => w.synonymgruppe && v.synonymgruppe === w.synonymgruppe && v !== w && namen.has(v.name))
          .map((v) => v.name),
      }));
  }

  get(name: string): Wert | undefined {
    return this.werteMap.get(name);
  }

  has(name: string): boolean {
    return this.werteMap.has(name);
  }
}
