import { WerteService } from "../dist/domain/werte.js";
import { ZusammenfassungService } from "../dist/domain/zusammenfassung.js";
import { BedrockAIService } from "../dist/infrastructure/bedrock.js";
import werteJson from "../src/werte.json" with { type: "json" };

const { werte } = werteJson;

const ai = new BedrockAIService();
const werteService = new WerteService(werte);

const noCache = {
  async get() {
    return null;
  },
  async put() {},
  async increment() {},
};

const service = new ZusammenfassungService(ai, noCache, werteService);

const werteNamen = werte.slice(0, 5).map((w) => w.name);
console.log("Berechne Zusammenfassung für", werteNamen);
const startedAt = Date.now();
const zusammenfassung = await service.getOrCreate(werteNamen);
console.log("Dauer: %ds", (Date.now() - startedAt) / 1000);
console.log(zusammenfassung);
