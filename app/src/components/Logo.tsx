export default function Logo() {
  return (
    <span className="logo">
      <img src="/logo.svg" alt="" width={32} height={32} />
      Werte Kompass
    </span>
  );
}

export function HeroLogo() {
  return (
    <div className="hero-logo">
      <img src="/logo.svg" alt="" width={96} height={96} />
      <span>Werte Kompass</span>
    </div>
  );
}
