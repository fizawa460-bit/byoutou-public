import { chromium } from "playwright";
import { spawn } from "node:child_process";

const server = spawn("python3", ["-m", "http.server", "4173", "--directory", "build/web"], {
  stdio: ["ignore", "pipe", "pipe"],
});
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const messages = [];
  page.on("console", (message) => messages.push(message.text()));
  page.on("pageerror", (error) => messages.push(`PAGE_ERROR: ${error.message}`));
  await page.goto("http://127.0.0.1:4173/", { waitUntil: "load" });
  await page.waitForFunction(
    () => performance.now() > 1000,
    null,
    { timeout: 5000 },
  );
  const deadline = Date.now() + 15000;
  while (!messages.some((message) => message.includes("MAP_BUILD_SUCCESS")) && Date.now() < deadline) {
    await page.waitForTimeout(250);
  }
  await page.screenshot({ path: "build/web-smoke.png" });
  if (!messages.some((message) => message.includes("MAP_BUILD_SUCCESS"))) {
    throw new Error(`Web build did not generate the map. Browser log:\n${messages.join("\n")}`);
  }
} finally {
  await browser.close();
  server.kill();
}
