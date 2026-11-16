import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from "@tanstack/react-router";
import { DatenschutzPage } from "./components/DatenschutzPage";
import { Footer } from "./components/Footer";
import { FreePage } from "./components/FreePage";
import { ImpressumPage } from "./components/ImpressumPage";
import { AppBar } from "./components/Logo";
import { LandingPage } from "./components/LandingPage";
import { StatistikPage } from "./components/StatistikPage";
import { TestSessionPage } from "./components/TestSessionPage";

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const rootRoute = createRootRoute({
  component: () => (
    <>
      <AppBar />
      <Outlet />
      <Footer />
    </>
  ),
});

export const landingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: LandingPage,
});

export const freeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/tests",
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

export const datenschutzRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/datenschutz",
  component: DatenschutzPage,
});

export const statistikRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/statistik",
  component: StatistikPage,
});

const routeTree = rootRoute.addChildren([
  landingRoute,
  freeRoute,
  testSessionRoute,
  impressumRoute,
  datenschutzRoute,
  statistikRoute,
]);

export const router = createRouter({
  routeTree,
  scrollRestoration: true,
});
