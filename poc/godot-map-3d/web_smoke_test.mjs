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
  const fixtureDimensions = messages.find((message) => message.includes("TOILET_SINK_DIMENSIONS"));
  if (!fixtureDimensions) {
    throw new Error(`CC0 toilet/sink model was not loaded. Browser log:\n${messages.join("\n")}`);
  }
  const height = Number(fixtureDimensions.match(/height=([0-9.]+)/)?.[1]);
  if (!Number.isFinite(height) || height < 0.95 || height > 1.01) {
    throw new Error(`Toilet/sink height is outside human scale: ${fixtureDimensions}`);
  }
  console.log(fixtureDimensions);

  const cdp = await context.newCDPSession(page);
  const leftStart = { x: 115, y: 530, radiusX: 12, radiusY: 12, force: 1, id: 1 };
  const leftDrag = { ...leftStart, x: 185 };
  const rightStart = { x: 1040, y: 420, radiusX: 12, radiusY: 12, force: 1, id: 2 };
  const rightDrag = { ...rightStart, x: 1090 };

  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [leftStart],
  });
  await page.waitForTimeout(100);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [leftDrag],
  });
  await page.waitForTimeout(100);

  // Add and drag a second finger while the movement finger remains held.
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [leftDrag, rightStart],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [leftDrag, rightDrag],
  });
  await page.waitForTimeout(500);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });

  await page.screenshot({ path: "build/web-smoke.png" });
  if (!messages.some((message) => message.includes("MOBILE_MOVE_INPUT_DETECTED"))) {
    throw new Error(`Dynamic left joystick did not produce movement. Browser log:\n${messages.join("\n")}`);
  }
  if (!messages.some((message) => message.includes("MOBILE_LOOK_INPUT_DETECTED"))) {
    throw new Error(`Right-side look did not work while movement was held. Browser log:\n${messages.join("\n")}`);
  }
} finally {
  await browser.close();
  server.kill();
}
