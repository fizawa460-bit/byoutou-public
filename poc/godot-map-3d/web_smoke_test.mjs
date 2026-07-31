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
    touchPoints: [{ x: 120, y: 590, radiusX: 12, radiusY: 12, force: 1, id: 1 }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: 120, y: 500, radiusX: 12, radiusY: 12, force: 1, id: 1 }],
  });
  await page.waitForTimeout(500);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });

  async function tap(x, y, id) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y, radiusX: 8, radiusY: 8, force: 1, id }],
    });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await page.waitForTimeout(200);
  }

  // Verify that the full-screen mobile control does not block the Inspect UI.
  await tap(1200, 40, 2);
  await tap(640, 360, 3);
  await tap(1100, 210, 4);
  await page.waitForTimeout(500);

  await page.screenshot({ path: "build/web-smoke.png" });
  if (!messages.some((message) => message.includes("MOBILE_MOVE_INPUT_DETECTED"))) {
    throw new Error(`Left-side touch did not reach the movement stick. Browser log:\n${messages.join("\n")}`);
  }
  if (!messages.some((message) => message.includes("INSPECTION_COPY_REQUESTED"))) {
    throw new Error(`Inspect selection or Copy request did not respond to touch. Browser log:\n${messages.join("\n")}`);
  }
} finally {
  await browser.close();
  server.kill();
}
