import { expect, test } from "@playwright/test";

/**
 * Flow ego handoff (issue #311).
 *
 * Selecting a fixture account with Flow enabled (`?view=flow`) opens the
 * ego graph; treemap-only behavior without the flag is unchanged.
 * Runs against fixture data (playwright.config.ts), fully offline.
 */

test("search selection with flow enabled opens the ego graph", async ({
  page,
}) => {
  await page.goto("/?view=flow");

  // No selection yet: the prompt shows, treemap stays intact.
  await expect(page.getByText("Search for an account")).toBeVisible();

  const search = page.getByRole("combobox", { name: /search loaded/i });
  await search.fill("Kraken");
  const option = page.getByRole("option", { name: /kraken/i }).first();
  await expect(option).toBeVisible();
  await search.press("Enter");

  const ego = page.getByTestId("flow-view");
  await expect(ego).toBeVisible();
  await expect(ego).toContainText("Kraken");
});

test("treemap-only search is unchanged without the flow flag", async ({
  page,
}) => {
  await page.goto("/");

  const search = page.getByRole("combobox", { name: /search loaded/i });
  await search.fill("Kraken");
  const option = page.getByRole("option", { name: /kraken/i }).first();
  await expect(option).toBeVisible();
  await search.press("Enter");

  await expect(page.getByTestId("flow-view")).toHaveCount(0);
});
