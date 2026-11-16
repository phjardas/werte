import assert from "node:assert/strict";
import { test } from "node:test";
import { ordne, seiten, vorschlaege } from "./auswahl.ts";

const wert = (name: string, verwandt: string[] = []) => ({
  name,
  kurzbeschreibung: "",
  verwandt,
});

test("ordne keeps the saved order, drops unknown values and appends new ones", () => {
  assert.deepEqual(ordne(["C", "X", "A"], ["A", "B", "C", "D"]), [
    "C",
    "A",
    "B",
    "D",
  ]);
});

test("ordne uses the given order without a saved one", () => {
  assert.deepEqual(ordne(undefined, ["B", "A"]), ["B", "A"]);
});

test("seiten splits into pages of 20", () => {
  const namen = Array.from({ length: 45 }, (_, i) => `W${i}`);
  assert.deepEqual(
    seiten(namen).map((s) => s.length),
    [20, 20, 5],
  );
});

test("vorschlaege ranks unselected values by how often they are related to the selection", () => {
  const werte = [
    wert("A", ["C", "D"]),
    wert("B", ["D", "A"]),
    wert("C"),
    wert("D"),
    wert("E"),
  ];
  assert.deepEqual(vorschlaege(["A", "B"], werte, ["E", "C", "D", "B", "A"]), [
    "D",
    "C",
  ]);
});

test("vorschlaege breaks ties by the order of the values", () => {
  const werte = [wert("A", ["C", "D"]), wert("C"), wert("D")];
  assert.deepEqual(vorschlaege(["A"], werte, ["D", "C", "A"]), ["D", "C"]);
});

test("vorschlaege is empty when nothing is related", () => {
  assert.deepEqual(vorschlaege(["A"], [wert("A"), wert("B")], ["A", "B"]), []);
});

test("vorschlaege returns at most 12 values", () => {
  const namen = Array.from({ length: 20 }, (_, i) => `W${i}`);
  const werte = [wert("A", namen), ...namen.map((n) => wert(n))];
  assert.equal(vorschlaege(["A"], werte, ["A", ...namen]).length, 12);
});
