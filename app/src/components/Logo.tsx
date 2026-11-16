import { Link, useLocation } from "@tanstack/react-router";

/** Small horizontal logo at the top of every page except the landing page, which has its own large one. */
export function AppBar() {
  const { pathname } = useLocation();
  if (pathname === "/") return null;
  return (
    <header className="app-bar">
      <Link to="/" className="app-bar-logo">
        <img src="/logo.svg" alt="" width={28} height={28} />
        <span>Werte Kompass</span>
      </Link>
    </header>
  );
}
