// Writes the prerendered landing page into dist/index.html. dist/404.html stays empty and serves
// all other routes, so they never show the landing page content before the client renders.
import { readFile, rm, writeFile } from "node:fs/promises";

const { renderLandingPage } = await import("../dist-ssr/prerender.js");
const file = new URL("../dist/index.html", import.meta.url);
const html = await readFile(file, "utf8");
const root = '<div id="root"></div>';
if (!html.includes(root)) throw new Error(`${root} not found in dist/index.html`);
await writeFile(file, html.replace(root, `<div id="root">${await renderLandingPage()}</div>`));
await rm(new URL("../dist-ssr", import.meta.url), { recursive: true });
