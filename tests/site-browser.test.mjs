import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import { once } from "node:events";
import { test } from "node:test";
import { chromium } from "playwright";

const routes = [
  "/",
  "/platform/",
  "/honeypots/",
  "/quarantine/",
  "/integrations/",
  "/developers/",
  "/security/",
  "/pricing/",
  "/company/",
  "/login/",
];

const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function freePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address === "object");
  await new Promise((resolve) => server.close(resolve));
  return address.port;
}

async function waitForPreview(url, child, logs) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (child.exitCode !== null && child.exitCode !== 0) {
      throw new Error(
        "Astro preview exited early (" +
          child.exitCode +
          "):\n" +
          logs.join(""),
      );
    }
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Preview has not bound the port yet.
    }
    await delay(250);
  }
  throw new Error("Astro preview did not become ready:\n" + logs.join(""));
}

async function startPreview() {
  const port = await freePort();
  const url = "http://127.0.0.1:" + port;
  const logs = [];
  const child = spawn(
    "npm",
    ["run", "preview", "--", "--host", "127.0.0.1", "--port", String(port)],
    {
      cwd: new URL("..", import.meta.url).pathname,
      env: { ...process.env },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  child.stdout.on("data", (chunk) => logs.push(chunk.toString()));
  child.stderr.on("data", (chunk) => logs.push(chunk.toString()));
  await waitForPreview(url + "/", child, logs);

  return {
    url,
    async stop() {
      if (child.exitCode === null) {
        child.kill("SIGTERM");
        await Promise.race([once(child, "exit"), delay(3000)]);
      }
      const stopper = spawn("npm", ["run", "preview", "--", "stop"], {
        cwd: new URL("..", import.meta.url).pathname,
        env: { ...process.env },
        stdio: "ignore",
      });
      await Promise.race([once(stopper, "exit"), delay(3000)]);
    },
  };
}

function chromeExecutablePath() {
  const candidates = [
    process.env.CHROME_BIN,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate));
}

test(
  "desktop and mobile visitors can navigate every public route",
  { timeout: 120_000 },
  async (t) => {
    const preview = await startPreview();
    t.after(() => preview.stop());

    const executablePath = chromeExecutablePath();
    const browser = await chromium.launch({
      headless: true,
      ...(executablePath ? { executablePath } : {}),
    });
    t.after(() => browser.close());

    const desktop = await browser.newPage({
      viewport: { width: 1440, height: 960 },
    });
    const pageErrors = [];
    desktop.on("pageerror", (error) => pageErrors.push(error.message));

    const response = await desktop.goto(preview.url + "/", {
      waitUntil: "networkidle",
    });
    assert.equal(response?.status(), 200);
    await desktop.getByRole("heading", {
      level: 1,
      name: /Catch attackers/,
    }).waitFor();
    assert.equal(
      await desktop.locator(".site-header").evaluate(
        (element) => getComputedStyle(element).position,
      ),
      "sticky",
    );
    assert.equal(
      await desktop.getByRole("link", { name: "User login" }).getAttribute("href"),
      "https://user.honeypotrus.com",
    );
    assert.equal(
      await desktop
        .getByRole("link", { name: "Organization login" })
        .getAttribute("href"),
      "https://org.honeypotrus.com",
    );

    for (const route of routes) {
      const routeResponse = await desktop.goto(preview.url + route, {
        waitUntil: "domcontentloaded",
      });
      assert.equal(routeResponse?.status(), 200, "failed route: " + route);
      await desktop.locator("main h1").waitFor();
      await desktop.locator(".site-footer").scrollIntoViewIfNeeded();
      await desktop.locator(".site-footer").waitFor();
    }

    const missing = await desktop.goto(preview.url + "/not-a-real-page/", {
      waitUntil: "domcontentloaded",
    });
    assert.equal(missing?.status(), 404);
    await desktop.getByRole("heading", {
      level: 1,
      name: /decoy for lost URLs/,
    }).waitFor();
    assert.deepEqual(pageErrors, []);

    const mobile = await browser.newPage({
      viewport: { width: 390, height: 844 },
    });
    await mobile.goto(preview.url + "/", { waitUntil: "networkidle" });
    await mobile.locator(".mobile-menu summary").click();
    await mobile.getByRole("navigation", { name: "Mobile" }).waitFor();
    await mobile.getByRole("navigation", { name: "Mobile" })
      .getByRole("link", { name: "Quarantine" })
      .click();
    await mobile.waitForURL(/\/quarantine\/$/);
    await mobile.getByRole("heading", {
      level: 1,
      name: /Contain the session/,
    }).waitFor();
    const overflow = await mobile.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    assert.ok(overflow <= 1, "mobile page overflows by " + overflow + "px");
  },
);
