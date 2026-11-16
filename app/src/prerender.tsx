import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { renderToString } from "react-dom/server";
import { router } from "./routes";

// Renders the landing page to static HTML at build time, so crawlers see its content without
// running JavaScript. main.tsx renders over it with createRoot
// instead of hydrating, which clears the container on the first render.
export async function renderLandingPage() {
  // scrollRestoration would inject an inline script that the CSP blocks.
  router.update({
    ...router.options,
    scrollRestoration: false,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  await router.load();
  return renderToString(<RouterProvider router={router} />);
}
