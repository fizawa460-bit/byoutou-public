import { chromium } from "playwright";
import { spawn } from "node:child_process";

const server = spawn("python3", ["-m", "http.server", "4173", "--directory", "build/web"], {
  stdio: ["ignore", "pipe", "pipe"],
});
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  const messages = [];
  page.on("console", (message) => messages.push(message.text()));
  page.on("pageerror", (error) => messages.push(`PAGE_ERROR: ${error.message}`));
  await page.goto("http://127.0.0.1:4173/", { waitUntil: "load" });

  const mapDeadline = Date.now() + 15000;
  while (!messages.some((message) => message.includes("MAP_BUILD_SUCCESS")) && Date.now() < mapDeadline) {
    await page.waitForTimeout(250);
  }
  if (!messages.some((message) => message.includes("MAP_BUILD_SUCCESS"))) {
    throw new Error(`Web build did not generate the map. Browser log:\n${messages.join("\n")}`);
  }

  const cdp = await context.newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: 115, y: 530, radiusX: 12, radiusY: 12, force: 1, id: 1 }],
  });
  await page.waitForTimeout(100);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: 175, y: 530, radiusX: 12, radiusY: 12, force: 1, id: 1 }],
  });
  await page.waitForTimeout(500);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });

  await page.screenshot({ path: "build/web-smoke.png" });
  if (!messages.some((message) => message.includes("MOBILE_MOVE_INPUT_DETECTED"))) {
    throw new Error(`Dragging from a left-side touch origin did not start movement. Browser log:\n${messages.join("\n")}`);
  }
} finally {
  await browser.close();
  server.kill();
}
