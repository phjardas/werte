import { execSync } from "node:child_process";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const gitSha = execSync("git rev-parse --short=7 HEAD").toString().trim();

// The CSP lives in the HTML because the free CloudFront plan does not allow custom response
// headers policies. Build only: in dev, `connect-src 'self'` would block calls to the preview API.
// style-src 'unsafe-inline': the dev pages use inline style attributes.
// frame-src: the Ko-fi donation panel on the results screen.
const CSP =
  "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-src https://ko-fi.com; base-uri 'self'; form-action 'self'";

const csp: Plugin = {
  name: "csp",
  apply: "build",
  transformIndexHtml: (html) =>
    html.replace(
      '<meta charset="UTF-8" />',
      `$&\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`,
    ),
};

export default defineConfig({
  plugins: [react(), csp],
  define: {
    __GIT_SHA__: JSON.stringify(gitSha),
  },
  base: "/",
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: "dist",
  },
});
