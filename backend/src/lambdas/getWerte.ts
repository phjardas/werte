import { WerteService } from "../domain/werte.js";
import werteData from "../werte.json" with { type: "json" };
import { response } from "./response.js";

const werteService = new WerteService(werteData.werte);

export const handler = () => response(200, { werte: werteService.getNames() });
