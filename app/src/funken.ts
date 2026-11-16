const ANZAHL = 10;
const FARBEN = ["var(--gold)", "var(--secondary)", "var(--primary-light)"];

/**
 * Lets a few sparks fly from a point on the screen. The sparks are appended to the body, so they outlive the element
 * that was clicked, and remove themselves when their animation ends (the
 * spans' animationend bubbles up to the container).
 */
export function funken(x: number, y: number): void {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const container = document.createElement("div");
  container.className = "funken";
  container.style.left = `${x}px`;
  container.style.top = `${y}px`;
  for (let i = 0; i < ANZAHL; i++) {
    const funke = document.createElement("span");
    const winkel = (360 / ANZAHL) * i + Math.random() * 20;
    funke.style.setProperty("--winkel", `${winkel}deg`);
    funke.style.setProperty("--weite", `${40 + Math.random() * 30}px`);
    funke.style.background = FARBEN[i % FARBEN.length];
    container.append(funke);
  }
  container.addEventListener("animationend", () => container.remove(), {
    once: true,
  });
  document.body.append(container);
}
