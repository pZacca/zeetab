// Generates the store-listing screenshots from the web demo (which renders
// the same app as the extension). Output: docs/store-assets/*.png at
// 1280×800 — the size the Chrome Web Store expects; AMO accepts the same
// images.
//
//   npm run screenshots
//
// The demo seeds demo/public/zeetab-sample-config.json on first visit, and
// every Playwright context starts with empty localStorage, so the captures
// are deterministic apart from favicon lookups (icons.duckduckgo.com). If
// the network is down the letter-tile fallbacks render instead — check the
// images before uploading.

import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { build, preview } from "vite";
import { chromium } from "playwright";

const root = fileURLToPath(new URL("..", import.meta.url));
const outDir = new URL("../docs/store-assets/", import.meta.url);
const configFile = `${root}vite.demo.config.ts`;

const VIEWPORT = { width: 1280, height: 800 };
const FAVICON_TIMEOUT_MS = 15_000;

await mkdir(outDir, { recursive: true });

console.log("building demo…");
await build({ configFile, logLevel: "warn" });

const server = await preview({ configFile });
const url = server.resolvedUrls.local[0];
console.log(`demo served at ${url}`);

const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    colorScheme: "dark",
    reducedMotion: "reduce",
  });

  await page.goto(url);
  await page.waitForSelector('a[aria-label="Gmail"]');

  // Give favicons a chance to arrive; fall through on timeout so an offline
  // run still produces images (with letter-tile fallbacks).
  await page
    .waitForFunction(
      () =>
        [...document.querySelectorAll("img")].every(
          (img) => img.complete && img.naturalWidth > 0
        ),
      undefined,
      { timeout: FAVICON_TIMEOUT_MS }
    )
    .catch(() => console.warn("warning: some favicons never loaded"));

  const shot = async (name) => {
    await page.screenshot({
      path: fileURLToPath(new URL(name, outDir)),
      animations: "disabled",
    });
    console.log(`captured ${name}`);
  };

  // 1 — the grid, nothing else.
  await page.mouse.move(0, 0);
  await shot("01-grid.png");

  // 2 — settings sheet (Ctrl+, toggles it).
  await page.keyboard.press("Control+Comma");
  await page.waitForSelector('[role="dialog"]');
  await shot("02-settings.png");
  await page.keyboard.press("Escape");
  await page.waitForSelector('[role="dialog"]', { state: "detached" });

  // 3 — context menu on a tile, "move to" submenu open.
  await page.click('a[aria-label="GitHub"]', { button: "right" });
  await page.waitForSelector('[role="menu"]');
  await page.hover('[role="menuitem"]:has-text("move to")');
  await page.waitForSelector('[data-radix-menu-content][data-state="open"] >> text=news');
  await shot("03-context-menu.png");
  await page.keyboard.press("Escape");
  await page.waitForSelector('[role="menu"]', { state: "detached" });

  // 4 — the "new shortcut" dialog.
  await page.click('button[aria-label="Add shortcut"]');
  await page.waitForSelector('[role="dialog"]');
  await shot("04-new-shortcut.png");
} finally {
  await browser.close();
  await new Promise((resolve, reject) => {
    server.httpServer.close((err) => (err ? reject(err) : resolve()));
  });
}

console.log("done → docs/store-assets/");
