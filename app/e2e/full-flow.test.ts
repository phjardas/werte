import { expect, test } from "@playwright/test";

/**
 * Fixed values for deterministic test runs. Exactly 5 so the filter step
 * is skipped (selection → suggestions → comparison-intro).
 */
const FIXED_VALUES = [
  "Ehrlichkeit",
  "Freiheit",
  "Kreativität",
  "Respekt",
  "Vertrauen",
];

test("full integration flow", async ({ page }) => {
  // ── 1. Picking a context creates a test session and redirects ────────────

  await page.goto("/tests");
  await page.getByRole("button", { name: /^Berufsleben/ }).click();
  await page.waitForURL(/\/tests\/[^/]+$/, { timeout: 15_000 });

  // ── 3. Selection pages: select the fixed values wherever they appear ──────

  await expect(page.locator(".values-grid")).toBeVisible();
  // Wait until chips are rendered (values loaded from API)
  await expect(page.locator(".value-chip").first()).toBeVisible();

  const remaining = new Set(FIXED_VALUES);
  const seitenInfo = page.locator(".test-progress span").filter({ hasText: /^Seite \d+ von \d+$/ });
  while (await seitenInfo.count()) {
    for (const value of [...remaining]) {
      const chip = page.getByRole("button", { name: value, exact: true });
      if (await chip.count()) {
        await chip.click();
        remaining.delete(value);
      }
    }
    const seite = await seitenInfo.innerText();
    await page.getByRole("button", { name: "Weiter" }).click();
    await expect(page.getByText(seite, { exact: true })).toHaveCount(0);
  }
  expect([...remaining]).toEqual([]);

  // ── 3b. Suggestions page (shown when related values exist): select none ──

  if (await page.getByRole("heading", { name: "Noch etwas vergessen?" }).count()) {
    await expect(page.locator(".counter")).toContainText(
      `${FIXED_VALUES.length} ausgewählt`,
    );
    await page.getByRole("button", { name: "Weiter" }).click();
  }

  // ── 4. Comparison intro ───────────────────────────────────────────────────

  await expect(page.locator(".step-intro")).toBeVisible();
  await expect(page.locator(".step-intro")).toContainText(
    `${FIXED_VALUES.length} Werte`,
  );

  await page.getByRole("button", { name: "Vergleiche starten" }).click();

  // ── 5. Comparison rounds ──────────────────────────────────────────────────

  await expect(page.locator(".step-comparison")).toBeVisible();

  // Swiss system with 5 values → ceil(log2(5)) = 3 rounds → ~6 matches.
  // We cap at 30 to guard against infinite loops.
  const MAX_COMPARISONS = 30;

  for (let round = 0; round < MAX_COMPARISONS; round++) {
    // Stop if results screen has taken over
    if ((await page.locator(".step-results").count()) > 0) break;

    const comparisonScreen = page.locator(".step-comparison");
    if ((await comparisonScreen.count()) === 0) break;

    // Wait for the AI scenario to finish loading (cards leave loading state)
    await page.waitForSelector(".comparison-cards:not(.comparison-loading)", {
      timeout: 45_000,
    });

    // Validate: scenario text is non-empty
    const promptText = await page.locator(".comparison-prompt").textContent();
    expect(
      promptText?.trim().length,
      "scenario text should be non-empty",
    ).toBeGreaterThan(0);

    // Validate: answer cards carry the correct value names
    const smallTags = page.locator(".comparison-card-answer small");
    const smallCount = await smallTags.count();

    if (smallCount === 2) {
      const valueName0 = (await smallTags.nth(0).textContent())?.trim() ?? "";
      const valueName1 = (await smallTags.nth(1).textContent())?.trim() ?? "";

      expect(
        FIXED_VALUES,
        `left card value "${valueName0}" not in fixed set`,
      ).toContain(valueName0);

      expect(
        FIXED_VALUES,
        `right card value "${valueName1}" not in fixed set`,
      ).toContain(valueName1);

      expect(valueName0, "both cards show the same value").not.toBe(valueName1);
    }

    // Always vote for the first (left) option
    await page.locator(".comparison-card").first().click();

    // Give the state machine time to advance
    await page.waitForTimeout(300);
  }

  // ── 6. Results screen: top-5 list ────────────────────────────────────────

  await expect(page.locator(".step-results")).toBeVisible({ timeout: 10_000 });
  await expect(page.locator("h1")).toContainText("Deine Top 5 Werte");

  const results = page.locator(".result-item");
  await expect(results).toHaveCount(5);

  for (let i = 0; i < 5; i++) {
    const rank = (
      await results.nth(i).locator(".result-rank").textContent()
    )?.trim();
    const expectedRank = ["🥇", "🥈", "🥉"][i] ?? String(i + 1);
    expect(rank, `result at position ${i} has wrong rank`).toBe(expectedRank);

    const valueName = (
      await results.nth(i).locator(".result-value").textContent()
    )?.trim();
    expect(
      FIXED_VALUES,
      `result "${valueName}" not in fixed value set`,
    ).toContain(valueName);
  }

  // ── 7. Summary: either generated text or timeout message ──────────────────

  // The backend generates the summary asynchronously; poll for up to 65 s.
  await expect(page.locator(".summary-text, .summary-timeout")).toBeVisible({
    timeout: 65_000,
  });
});
