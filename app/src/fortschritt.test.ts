import assert from "node:assert/strict";
import { test } from "node:test";
import { fortschritt } from "./fortschritt.ts";

test("fortschritt starts at 10 % and grows through selection and comparison", () => {
  const werte = [
    fortschritt("selection", 0, 7, 0, 0),
    fortschritt("selection", 6, 7, 0, 0),
    fortschritt("suggestions", 6, 7, 0, 0),
    fortschritt("filter-intro", 6, 7, 0, 0),
    fortschritt("filter", 6, 7, 0, 0),
    fortschritt("comparison-intro", 6, 7, 0, 0),
    fortschritt("comparison", 6, 7, 1, 20),
    fortschritt("comparison", 6, 7, 20, 20),
  ];
  assert.equal(werte[0], 10);
  assert.equal(werte[5], 50);
  assert.equal(werte[6], 50);
  assert.ok(werte[7] < 100);
  for (let i = 1; i < werte.length; i++)
    assert.ok(werte[i] > werte[i - 1] || i === 6, `step ${i}`);
});
