// Writes dist/index.html with the prerendered landing page and dist/404.html as an empty shell.
// CloudFront serves 404.html for all client-side routes, so they never show the landing page
// before the client renders, and they carry noindex because test results must not be indexed.
// NOINDEX=1 (preview builds) also keeps the landing page out of search results.
import { readFile, rm, writeFile } from "node:fs/promises";

const { renderLandingPage } = await import("../dist-ssr/prerender.js");
const dist = (name) => new URL(`../dist/${name}`, import.meta.url);
const html = await readFile(dist("index.html"), "utf8");
const root = '<div id="root"></div>';
const head = "</head>";
if (!html.includes(root) || !html.includes(head)) throw new Error("unexpected dist/index.html");

const noindex = '<meta name="robots" content="noindex" />';
const canonical = '<link rel="canonical" href="https://werte.jardas.de/" />';
const landingHead = process.env.NOINDEX ? noindex : canonical;

await writeFile(dist("404.html"), html.replace(head, `  ${noindex}\n  ${head}`));
await writeFile(
  dist("index.html"),
  html
    .replace(head, `  ${landingHead}\n  ${head}`)
    .replace(root, `<div id="root">${await renderLandingPage()}</div>`),
);
await rm(new URL("../dist-ssr", import.meta.url), { recursive: true });
