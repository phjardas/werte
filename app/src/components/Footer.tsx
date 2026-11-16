import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="site-footer">
      <p>
        made with{" "}
        <span role="img" aria-label="Liebe">
          ❤️
        </span>{" "}
        by Philipp Jardas
      </p>
      <p>
        <Link to="/statistik">Statistik</Link> ·{" "}
        <Link to="/impressum">Impressum</Link> ·{" "}
        <Link to="/datenschutz">Datenschutz</Link>
      </p>
      <p className="site-footer-version">Version {__GIT_SHA__}</p>
    </footer>
  );
}
