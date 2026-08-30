import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const read = (path) =>
  readFile(new URL("../" + path, import.meta.url), "utf8");

const routeSources = new Map([
  ["/", "src/pages/index.astro"],
  ["/platform/", "src/pages/platform/index.astro"],
  ["/honeypots/", "src/pages/honeypots/index.astro"],
  ["/quarantine/", "src/pages/quarantine/index.astro"],
  ["/integrations/", "src/pages/integrations/index.astro"],
  ["/developers/", "src/pages/developers/index.astro"],
  ["/security/", "src/pages/security/index.astro"],
  ["/pricing/", "src/pages/pricing/index.astro"],
  ["/company/", "src/pages/company/index.astro"],
  ["/login/", "src/pages/login/index.astro"],
]);

const layout = await read("src/layouts/SiteLayout.astro");
const home = await read("src/pages/index.astro");
const css = await read("src/styles/global.css");
const routeEntries = await Promise.all(
  [...routeSources.entries()].map(async ([route, path]) => [
    route,
    path,
    await read(path),
  ]),
);
const sourceBundle = [layout, ...routeEntries.map((entry) => entry[2])].join("\n");

test("every marketing destination has a separate Astro route", () => {
  assert.equal(routeSources.size, 10);
  for (const [route, path, source] of routeEntries) {
    assert.ok(source.length > 100, "empty route source: " + path);
    if (route !== "/") {
      assert.ok(
        path.endsWith("/index.astro"),
        "route must use a separate folder: " + route,
      );
    }
  }

  const hrefs = [
    ...sourceBundle.matchAll(/href="(\/[^"#?]*)"/g),
  ].map((match) => match[1]);
  for (const href of hrefs) {
    if (href === "/favicon.svg") continue;
    assert.ok(routeSources.has(href), "internal link has no route: " + href);
  }
});

test("sticky responsive navigation and footer remain present", () => {
  assert.match(layout, /<header class="site-header">/);
  assert.match(layout, /<details class="mobile-menu">/);
  assert.match(layout, /<footer class="site-footer">/);
  assert.match(css, /\.site-header\s*\{[\s\S]*position:\s*sticky;/);
  assert.match(css, /@media \(max-width: 1060px\)/);
  assert.match(css, /@media \(max-width: 720px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /min-width:\s*320px/);
});

test("the public site delegates only user and organization login links", () => {
  const publicApps = [
    "https://user.honeypotrus.com",
    "https://org.honeypotrus.com",
  ];
  for (const destination of publicApps) {
    assert.ok(layout.includes(destination), "missing layout login: " + destination);
    assert.ok(
      sourceBundle.includes(destination),
      "missing public destination: " + destination,
    );
  }

  const linkedHosts = [
    ...sourceBundle.matchAll(/href="https:\/\/([^"/]+\.honeypotrus\.com)"/g),
  ].map((match) => match[1]);
  assert.deepEqual(
    [...new Set(linkedHosts)].sort(),
    ["org.honeypotrus.com", "user.honeypotrus.com"],
  );
  assert.doesNotMatch(sourceBundle, /api-admin\.honeypotrus\.com/);
  assert.doesNotMatch(sourceBundle, /admin\.honeypotrus\.com/);
  assert.doesNotMatch(sourceBundle, /auth\.honeypotrus\.com/);
});

test("capability copy distinguishes delivery state from roadmap", () => {
  for (const label of [
    "Contract available",
    "Foundation available",
    "In development",
    "Roadmap",
    "Reserved, not live",
    "Safety invariant",
  ]) {
    assert.ok(sourceBundle.includes(label), "missing status label: " + label);
  }

  assert.match(home, /Illustrative signal graph/);
  assert.match(home, /No irreversible action from one\s+noisy signal/);
  assert.match(sourceBundle, /Evidence is not identity/);
});

test("quarantine remains reversible and the playpen remains owned", async () => {
  const quarantine = await read("src/pages/quarantine/index.astro");
  for (const phrase of [
    "tenant-scoped",
    "expiring",
    "idempotent",
    "reviewable",
    "reversible",
    "HNPT-owned",
    "No unrelated destinations",
  ]) {
    assert.ok(quarantine.includes(phrase), "missing safety phrase: " + phrase);
  }

  assert.doesNotMatch(sourceBundle, /yahoo\.com/i);
  assert.doesNotMatch(sourceBundle, /redirect[^.]{0,80}(google|bing|yahoo)/i);
});

test("the site source contains no credential handling or secret material", () => {
  assert.doesNotMatch(
    sourceBundle,
    /(SUPABASE_SERVICE_ROLE|CLOUDFLARE_API_TOKEN|CLIENT_SECRET|INTROSPECTION_SECRET)/,
  );
  assert.doesNotMatch(sourceBundle, /gh[pousr]_[A-Za-z0-9_]{20,}/);
  assert.match(sourceBundle, /static marketing site/);
});

test("zed-pkg owns the repository contract and npm stays a locked adapter", async () => {
  const manifest = await read(".zpkg.toml");
  const packageJson = JSON.parse(await read("package.json"));
  const lock = JSON.parse(await read("package-lock.json"));
  const agents = await read("AGENTS.md");

  assert.match(manifest, /\[targets\.nodejs\]/);
  assert.match(manifest, /adapter = "node"/);
  assert.match(manifest, /\[scripts\]/);
  assert.equal(packageJson.dependencies.astro, "7.2.9");
  assert.equal(lock.packages[""].dependencies.astro, "7.2.9");
  assert.match(agents, /no command surface/);
});

test("Pages workflows use pinned actions and derive the owner-specific origin", async () => {
  const ci = await read(".github/workflows/ci.yml");
  const pages = await read(".github/workflows/pages.yml");

  for (const workflow of [ci, pages]) {
    assert.match(workflow, /actions\/checkout@[a-f0-9]{40}/);
    assert.match(workflow, /actions\/setup-node@[a-f0-9]{40}/);
    assert.match(
      workflow,
      /PUBLIC_SITE_URL: https:\/\/\$\{\{ github\.repository_owner \}\}\.github\.io/,
    );
  }

  assert.match(pages, /actions\/configure-pages@[a-f0-9]{40}/);
  assert.match(pages, /actions\/upload-pages-artifact@[a-f0-9]{40}/);
  assert.match(pages, /actions\/deploy-pages@[a-f0-9]{40}/);
  assert.match(pages, /pages: write/);
  assert.match(pages, /id-token: write/);
  assert.doesNotMatch(pages, /pull_request_target/);
});

test("Astro defaults to the production organization Pages origin", async () => {
  const { default: config } = await import("../astro.config.mjs");
  assert.equal(config.site, "https://honeypot-r-us.github.io");
  assert.equal(config.output, "static");
  assert.equal(config.trailingSlash, "always");
});
