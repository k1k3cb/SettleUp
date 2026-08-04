import { chromium } from "playwright";
import * as fs from "fs";
import * as path from "path";

const WEB_URL = "http://localhost:5173";
const SCREENSHOTS_DIR = path.join(__dirname, "..", "apps", "web", "public", "screenshots");

const VIEWPORT = { width: 1280, height: 900 };

async function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function shot(
  page: import("playwright").Page,
  name: string,
  options?: { fullPage?: boolean },
) {
  const filePath = path.join(SCREENSHOTS_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: options?.fullPage ?? true });
  console.log(`  ✓ ${name}.png`);
}

async function main() {
  await ensureDir(SCREENSHOTS_DIR);
  console.log(`Saving screenshots to ${SCREENSHOTS_DIR}\n`);

  const browser = await chromium.launch({ headless: true });

  // === 1. Landing (signed out) ===
  console.log("1. Landing page (signed out)");
  {
    const ctx = await browser.newContext({ viewport: VIEWPORT });
    const page = await ctx.newPage();
    await page.goto(WEB_URL, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    await shot(page, "01-landing-signed-out");
    await ctx.close();
  }

  // === 2. Sign in page ===
  console.log("\n2. Sign-in page");
  {
    const ctx = await browser.newContext({ viewport: VIEWPORT });
    const page = await ctx.newPage();
    await page.goto(`${WEB_URL}/signin`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    await shot(page, "02-signin");
    await ctx.close();
  }

  // === 3. Sign up page ===
  console.log("\n3. Sign-up page");
  {
    const ctx = await browser.newContext({ viewport: VIEWPORT });
    const page = await ctx.newPage();
    await page.goto(`${WEB_URL}/signup`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    await shot(page, "03-signup");
    await ctx.close();
  }

  // === 4. Authenticated flow ===
  console.log("\n4. Logging in as Usuario 1…");
  const ctx = await browser.newContext({ viewport: VIEWPORT });
  const page = await ctx.newPage();

  await page.goto(`${WEB_URL}/signin`, { waitUntil: "networkidle" });
  await page.fill("#signin-email", "demo@settleup.dev");
  await page.fill("#signin-password", "demo12345");
  await page.click('button[type="submit"]');
  // Wait for either redirect or form error
  try {
    await page.waitForURL(WEB_URL + "/", { timeout: 8000 });
  } catch (e) {
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "_debug-signin.png") });
    console.log("  ✗ Sign-in failed, screenshot saved to _debug-signin.png");
    console.log("  Current URL:", page.url());
    const errorAlert = await page.locator('[role="alert"]').textContent().catch(() => null);
    console.log("  Error message:", errorAlert);
    throw e;
  }
  await page.waitForTimeout(800);
  console.log("  ✓ signed in");

  // 4a. Home (signed in)
  console.log("\n5. Home (signed in)");
  await shot(page, "04-home-signed-in");

  // 4b. Groups list (pending tab)
  console.log("\n6. Groups list (pending)");
  await page.goto(`${WEB_URL}/groups`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await shot(page, "05-groups-pending");

  // 4c. Groups list (settled tab)
  console.log("\n7. Groups list (settled)");
  const settledTab = page.locator('button[role="tab"]', { hasText: "Saldados" });
  if ((await settledTab.count()) > 0) {
    await settledTab.first().click();
    await page.waitForTimeout(500);
    await shot(page, "06-groups-settled");
  }

  // 4d. Group detail - go back to pending tab and click first group
  console.log("\n8. Group detail (first pending group)");
  await page.goto(`${WEB_URL}/groups`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  // Click on the pending tab
  await page.locator('button[role="tab"]', { hasText: "Pendientes" }).click();
  await page.waitForTimeout(500);

  // Find first group row and click it
  const groupRows = page.locator("ul li button");
  const rowCount = await groupRows.count();
  console.log(`  found ${rowCount} group rows`);
  if (rowCount > 0) {
    await groupRows.first().click();
    await page.waitForURL(/\/groups\/[a-f0-9-]+/, { timeout: 10000 });
    await page.waitForTimeout(1000);
    await shot(page, "07-group-signers");

    const groupUrl = page.url();
    console.log(`  group URL: ${groupUrl}`);

    // Expenses tab
    console.log("\n9. Group detail - Apuntes tab");
    await page.locator('button[role="tab"]', { hasText: "Apuntes" }).click();
    await page.waitForTimeout(700);
    await shot(page, "08-group-expenses");

    // Open expense form
    const anotaBtn = page.locator("text=/Anotar (gasto|otro)/");
    if ((await anotaBtn.count()) > 0) {
      await anotaBtn.first().click();
      await page.waitForTimeout(900);
      await shot(page, "09-expense-form");
      // Close form
      await page.keyboard.press("Escape");
      await page.waitForTimeout(400);
    } else {
      console.log("  no 'Anotar gasto' button found");
    }

    // Balances tab
    console.log("\n10. Group detail - Saldos tab");
    await page.locator('button[role="tab"]', { hasText: "Saldos" }).click();
    await page.waitForTimeout(700);
    await shot(page, "10-group-balances");
  }

  // 4e. Settled group
  console.log("\n11. Settled group");
  await page.goto(`${WEB_URL}/groups`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const settledTabBtn = page.locator('button[role="tab"]', { hasText: "Saldados" });
  if ((await settledTabBtn.count()) > 0) {
    await settledTabBtn.first().click();
    await page.waitForTimeout(700);
    const settledRow = page.locator("ul li button");
    if ((await settledRow.count()) > 0) {
      await settledRow.first().click();
      await page.waitForURL(/\/groups\/[a-f0-9-]+/, { timeout: 10000 });
      await page.waitForTimeout(1000);
      await shot(page, "11-group-settled");
    } else {
      console.log("  no settled groups to screenshot");
    }
  } else {
    console.log("  no settled tab found");
  }

  await ctx.close();
  await browser.close();
  console.log("\n✓ All screenshots saved.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
