import { expect, test, type Page } from "@playwright/test";

/**
 * Issue #305 — production error hierarchy.
 *
 * The shared `/api/v1/activity` request is forced to fail while the
 * independently loaded `/api/category-share` chart keeps serving fixture data.
 * The assertions prove the page explains the split, does not show a false
 * credential hint, and routes Retry at the failed activity query family.
 */

const ACTIVITY_ERROR_BODY = JSON.stringify({
  code: "INTERNAL_ERROR",
  message: "An unexpected error occurred. Please try again later.",
});

async function failActivityRequests(page: Page) {
  await page.route("**/api/v1/activity**", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: ACTIVITY_ERROR_BODY,
    });
  });
}

test.describe("activity failure hierarchy (#305)", () => {
  test.beforeEach(async ({ context, page }) => {
    // Network isolation: only localhost requests are allowed.
    await context.route("**/*", async (route) => {
      const url = route.request().url();
      const isLocal =
        /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?(\/|$)/.test(url) ||
        url.startsWith("data:") ||
        url.startsWith("blob:") ||
        url.startsWith("about:");
      if (isLocal) await route.continue();
      else await route.abort();
    });

    await failActivityRequests(page);
    await page.goto("/");
  });

  test("explains that shared activity widgets failed while independent charts live", async ({
    page,
  }) => {
    const banner = page.getByTestId("activity-error-banner");
    await expect(banner).toBeVisible();
    await expect(banner).toContainText("KPIs, the treemap, time series, and heatmaps");
    await expect(banner).toContainText(/may still be live/);

    // KPIs, treemap, and time series each surface an explicit failure instead
    // of endless skeletons.
    await expect(page.getByTestId("kpi-error")).toBeVisible();
    await expect(page.getByTestId("treemap-error")).toBeVisible();
    await expect(page.getByTestId("timeseries-error")).toBeVisible();

    // The category-share chart uses a separate request and is still live.
    await expect(page.getByTestId("category-share-independent")).toBeVisible();
    await expect(
      page.getByTestId("category-share-independent"),
    ).toContainText(/separate request and is still live/);
  });

  test("does not show a false GOOGLE_APPLICATION_CREDENTIALS hint", async ({
    page,
  }) => {
    await expect(page.getByTestId("timeseries-error")).toBeVisible();
    await expect(page.locator("body")).not.toContainText(
      "GOOGLE_APPLICATION_CREDENTIALS",
    );
  });

  test("Retry refetches the activity query family", async ({ page }) => {
    await expect(page.getByTestId("activity-error-banner")).toBeVisible();

    const activityRequest = page.waitForRequest((request) =>
      request.url().includes("/api/v1/activity"),
    );
    await page.getByTestId("activity-retry").first().click();
    await activityRequest;
  });
});
