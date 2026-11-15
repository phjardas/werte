export interface Wert {
  name: string;
  synonyme: string[];
  definition: string[];
  beschreibung: string[];
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

  getNames(): string[] {
    return this.werte.map((w) => w.name);
  }

  get(name: string): Wert | undefined {
    return this.werteMap.get(name);
  }

  has(name: string): boolean {
    return this.werteMap.has(name);
  }
}
