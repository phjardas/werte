import { describe, expect, it } from "vitest";
import { berechneStatistik } from "./statistik.js";

describe("berechneStatistik", () => {
  it("weights each rank with the point scale and sorts by points", () => {
    const statistik = berechneStatistik(
      {
        tests: 3,
        platzierungen: {
          Mut: [0, 2, 1], // 2*6 + 1*4 = 16
          Freiheit: [1, 0, 0, 0, 0, 0, 5], // 10, rank 7 scores nothing
          Ruhe: [0, 0, 0, 0, 0, 0, 3], // 0, left out
          Ordnung: [1], // 10, ties sorted by name
        },
      },
      [10, 6, 4],
    );
    expect(statistik.tests).toBe(3);
    expect(statistik.punkteskala).toEqual([10, 6, 4]);
    expect(statistik.rangliste.map((e) => [e.name, e.punkte])).toEqual([
      ["Mut", 16],
      ["Freiheit", 10],
      ["Ordnung", 10],
    ]);
  });
});
