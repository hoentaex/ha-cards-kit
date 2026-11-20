// Renders the demo page at a fixed time (20 Nov 2026, 19:00 Berlin) and saves the README screenshots: the three demo
// sections in light and dark, and the Proxmox section with an unavailable CPU sensor.
// Usage: npm run screenshots
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { serve } from "./serve.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const server = serve();
await new Promise((resolve, reject) => server.once("listening", resolve).once("error", reject));
const port = server.address().port;
const browser = await chromium.launch();
const TIME = new Date("2026-11-20T19:00:00+01:00");
const shot = (name) => `${root}screenshots/${name}.png`;

try {
  for (const [query, suffix] of [
    ["", ""],
    ["&cpuOff=1", "-unavailable"],
  ]) {
    const page = await browser.newPage({
      viewport: { width: 1100, height: 1600 },
      deviceScaleFactor: 2,
      timezoneId: "Europe/Berlin",
    });
    page.on("pageerror", (err) => console.error("page error:", err.message));
    await page.clock.setFixedTime(TIME);
    await page.goto(`http://127.0.0.1:${port}/demo/?lang=de${query}`);
    await page.locator("#light kpi-tile-card").first().waitFor();
    await page.waitForTimeout(300);
    for (const theme of ["light", "dark"]) {
      const sections = page.locator(`#${theme} .section`);
      if (suffix) {
        await sections.nth(2).screenshot({ path: shot(`server${suffix}-${theme}`) });
        console.log(`saved screenshots/server${suffix}-${theme}.png`);
        continue;
      }
      await page.locator(`#${theme}`).screenshot({ path: shot(`sections-${theme}`) });
      console.log(`saved screenshots/sections-${theme}.png`);
    }
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}
