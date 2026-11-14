import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from "@tanstack/react-router";
import { Footer } from "./components/Footer";
import { FreePage } from "./components/FreePage";
import { ImpressumPage } from "./components/ImpressumPage";
import { TestSessionPage } from "./components/TestSessionPage";

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const rootRoute = createRootRoute({
  component: () => (
    <>
      <Outlet />
      <Footer />
    </>
  ),
});

export const freeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: FreePage,
});

export const testSessionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/tests/$testId",
  component: TestSessionPage,
});

export const impressumRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/impressum",
  component: ImpressumPage,
});

const routeTree = rootRoute.addChildren([
  freeRoute,
  testSessionRoute,
  impressumRoute,
]);

export const router = createRouter({
  routeTree,
  scrollRestoration: true,
});
