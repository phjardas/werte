import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="site-footer">
      made with <span role="img" aria-label="Liebe">❤️</span> by Philipp
      Jardas · <Link to="/statistik">Statistik</Link> ·{" "}
      <Link to="/impressum">Impressum</Link> ·{" "}
      <Link to="/datenschutz">Datenschutz</Link>
    </footer>
  );
}
