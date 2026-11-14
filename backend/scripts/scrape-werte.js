import * as cheerio from "cheerio";
import { writeFile } from "node:fs/promises";
import PQueue from "p-queue";

const inputs = await ladeÜbersicht();

console.log("Lade %d Werte…", inputs.length);
const queue = new PQueue({ concurrency: 4 });

const werte = [];

for (const input of inputs) {
  queue.add(async () => {
    console.log("Lade Wert: %s…", input.name);
    const wert = await ladeWert(input);
    werte.push(wert);
  });
}

await new Promise((resolve) => setTimeout(resolve, 1000));
await queue.onIdle();

const filename = "functions/werte.json";
await writeFile(filename, JSON.stringify({ werte }, null, 2), "utf-8");
console.log("Gespeichert: " + filename);

// --------------------------------------------------------------

async function ladeÜbersicht() {
  const $ = await ladeSeite("https://www.values-academy.de/alle-werte/");

  return $(".werte_link_color li")
    .filter((_, el) => !$(el).text().includes("("))
    .map((_, el) => ({
      name: $(el).text(),
      url: $(el).find("a").attr("href"),
    }))
    .get();
}

async function ladeWert({ name, url }) {
  const $ = await ladeSeite(url);
  const synonyme = $("h2")
    .filter((_, el) => $(el).text().trim() === "Synonyme")
    .nextUntil("h2")
    .map((_, el) => $(el).text())
    .get()
    .map((text) => text.trim().replace(/\s+/g, " "))
    .filter((text) => text.length);

  const definition = [
    ...$("h2")
      .filter((_, el) => $(el).text().trim() === "Definition")
      .nextUntil("h2")
      .map((_, el) => $(el).text())
      .get(),
    ...$("h2")
      .filter((_, el) => $(el).text().trim() === "Definition")
      .next()
      .find("li")
      .map((_, el) => $(el).text())
      .get(),
  ]
    .map((text) => text.trim().replace(/\s+/g, " "))
    .filter((text) => text.length);

  const beschreibung = $("h2")
    .filter((_, el) => $(el).text().trim() === "Beschreibung")
    .nextUntil("h2")
    .map((_, el) => $(el).text())
    .get()
    .map((text) => text.trim().replace(/\s+/g, " "))
    .filter((text) => text.length);

  return { name, synonyme, definition, beschreibung };
}

async function ladeSeite(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Fehler beim Abrufen der Seite ${url}: ${response.status} ${response.statusText}`,
    );
  }
  const html = await response.text();
  return cheerio.load(html);
}
