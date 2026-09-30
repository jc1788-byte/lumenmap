import { chromium } from "playwright";

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

async function captureScreenshots() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const viewports = [
    { name: "desktop-1440px", width: 1440, height: 900 },
    { name: "mobile-390px", width: 390, height: 844 },
  ];

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(BASE_URL);
    
    // Wait for the page to load
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000); // Additional wait for any animations
    
    // Capture full page screenshot
    await page.screenshot({
      path: `screenshots/dashboard-${viewport.name}-after.png`,
      fullPage: true,
    });
    
    console.log(`Captured screenshot for ${viewport.name}`);
  }

  await browser.close();
  console.log("Screenshots captured successfully");
}

captureScreenshots().catch((error) => {
  console.error("Error capturing screenshots:", error);
  process.exit(1);
});
