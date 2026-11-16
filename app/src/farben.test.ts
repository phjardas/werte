import assert from "node:assert/strict";
import { test } from "node:test";
import { farbVerteilung, type Farbe } from "./farben.ts";

const angebot: { name: string; farbe: Farbe }[] = [
  { name: "Mut", farbe: "rot" },
  { name: "Spaß", farbe: "gelb" },
  { name: "Ruhe", farbe: "gruen" },
  { name: "Liebe", farbe: "gruen" },
  { name: "Treue", farbe: "gruen" },
  { name: "Ordnung", farbe: "blau" },
];

test("farbVerteilung weighs each value by its rank and by how common its colour is", () => {
  const verteilung = farbVerteilung(
    ["Mut", "Ruhe", "Liebe", "Unbekannt"],
    angebot,
  );
  assert.deepEqual(
    verteilung.map((a) => [a.farbe, a.anteil, a.werte]),
    [
      ["rot", 71, ["Mut"]],
      ["gruen", 29, ["Ruhe", "Liebe"]],
      ["gelb", 0, []],
      ["blau", 0, []],
    ],
  );
});

test("farbVerteilung returns zeros without known values", () => {
  assert.ok(farbVerteilung([], angebot).every((a) => a.anteil === 0));
});
