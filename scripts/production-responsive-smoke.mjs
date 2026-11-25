#!/usr/bin/env node
import { createServer } from "node:net";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import process from "node:process";

const baseUrl = (process.env.PRODUCTION_URL || "https://cuahangtoit-9a4r8wsz.manus.space/").replace(/\/$/, "");
const cacheBust = `__responsive_smoke=${Date.now()}`;
const pageUrl = `${baseUrl}/?${cacheBust}`;
const routes = [
  "/",
  "/products?type=physical",
  "/product/fifa-asean-cup-2026-patch-tay?from_webdev=1",
  "/wholesale",
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function getFreePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const { port } = server.address();
  await new Promise(resolve => server.close(resolve));
  return port;
}

async function waitForJson(url, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
    } catch {
      // Chromium is still starting.
    }
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function createCdpClient(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl);
  let nextId = 0;
  const pending = new Map();
  const ready = new Promise((resolve, reject) => {
    socket.addEventListener("open", () => resolve());
    socket.addEventListener("error", reject);
  });
  socket.addEventListener("message", event => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    }
  });

  return {
    async send(method, params = {}) {
      await ready;
      const id = ++nextId;
      const result = new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
      socket.send(JSON.stringify({ id, method, params }));
      return result;
    },
    close() {
      socket.close();
    },
  };
}

async function waitForPageLoad(cdp) {
  await cdp.send("Runtime.evaluate", {
    expression: `new Promise(resolve => {
      const finish = () => setTimeout(resolve, 1800);
      if (document.readyState === "complete") finish();
      else window.addEventListener("load", finish, { once: true });
    })`,
    awaitPromise: true,
  });
}

async function inspectViewport(cdp, width, height, url) {
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await cdp.send("Page.navigate", { url });
  await waitForPageLoad(cdp);
  const result = await cdp.send("Runtime.evaluate", {
    awaitPromise: true,
    returnByValue: true,
    expression: `(() => {
      const headers = Array.from(document.querySelectorAll("header")).map(header => ({
        className: header.className,
        display: getComputedStyle(header).display,
      }));
      const compact = headers.find(header => header.className.includes("lg:hidden"));
      const desktop = headers.find(header => header.className.includes("lg:block"));
      return {
        width: window.innerWidth,
        height: window.innerHeight,
        compactVisible: compact?.display !== "none",
        desktopVisible: desktop?.display !== "none",
        headers,
        scrollWidth: document.documentElement.scrollWidth,
        overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
      };
    })()`,
  });
  return result.result.value;
}

async function inspectProduction() {
  const response = await fetch(pageUrl, { headers: { "cache-control": "no-cache" } });
  const html = await response.text();
  const cacheControl = response.headers.get("cache-control") || "";
  const cacheStatus = response.headers.get("cf-cache-status") || response.headers.get("x-cache") || "not-reported";
  assert(response.ok, `Production returned HTTP ${response.status}`);
  assert(/no-cache|no-store|must-revalidate/i.test(cacheControl), `Production HTML is not marked non-cacheable: ${cacheControl || "missing cache-control"}`);

  const assetUrls = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(match => new URL(match[1], pageUrl).href);
  const assets = await Promise.all(assetUrls.slice(0, 8).map(async assetUrl => {
    const assetResponse = await fetch(assetUrl, { headers: { "cache-control": "no-cache" } });
    return { url: assetUrl, status: assetResponse.status, body: await assetResponse.text() };
  }));
  const bundle = assets.map(asset => asset.body).join("\n");
  assert(bundle.includes("lg:hidden"), "Production bundle does not contain compact lg:hidden header");
  assert(bundle.includes("lg:block"), "Production bundle does not contain desktop lg header");
  assert(bundle.includes("max-lg:inset-x-0"), "Production bundle does not contain tablet cart-sheet max-lg rule");

  const port = await getFreePort();
  const profile = await mkdtemp(`${tmpdir()}/dhl-responsive-smoke-`);
  const chromium = spawn("chromium", [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--hide-scrollbars",
    `--user-data-dir=${profile}`,
    `--remote-debugging-port=${port}`,
    "about:blank",
  ], { stdio: ["ignore", "ignore", "ignore"] });

  try {
    const targets = await waitForJson(`http://127.0.0.1:${port}/json/list`);
    const pageTarget = targets.find(target => target.type === "page" && target.webSocketDebuggerUrl);
    assert(pageTarget, "Chromium did not expose a page target");
    const cdp = createCdpClient(pageTarget.webSocketDebuggerUrl);
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    const viewports = {};
    for (const route of routes) {
      const routeUrl = `${baseUrl}${route}${route.includes("?") ? "&" : "?"}${cacheBust}`;
      viewports[route] = {};
      for (const [name, dimensions] of [["mobile", [390, 844]], ["tablet", [863, 1013]], ["desktop", [1280, 900]]]) {
        viewports[route][name] = await inspectViewport(cdp, ...dimensions, routeUrl);
      }
    }
    cdp.close();

    for (const route of routes) {
      const routeViewports = viewports[route];
      assert(routeViewports.mobile.compactVisible && !routeViewports.mobile.desktopVisible, `${route}: mobile header breakpoint is incorrect`);
      assert(routeViewports.tablet.compactVisible && !routeViewports.tablet.desktopVisible, `${route}: tablet header breakpoint is incorrect`);
      assert(!routeViewports.mobile.overflowX && !routeViewports.tablet.overflowX, `${route}: mobile/tablet has horizontal overflow`);
      assert(!routeViewports.desktop.compactVisible && routeViewports.desktop.desktopVisible, `${route}: desktop header breakpoint is incorrect`);
    }

    console.log(JSON.stringify({
      url: pageUrl,
      httpStatus: response.status,
      cacheControl,
      cacheStatus,
      lastModified: response.headers.get("last-modified"),
      etag: response.headers.get("etag"),
      assetsChecked: assets.length,
      viewports,
      ok: true,
    }, null, 2));
  } finally {
    chromium.kill("SIGTERM");
    await new Promise(resolve => {
      if (chromium.exitCode !== null) return resolve();
      chromium.once("exit", resolve);
      setTimeout(resolve, 2_000);
    });
    await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 150 });
  }
}

inspectProduction().catch(error => {
  console.error(`[production-responsive-smoke] ${error.message}`);
  process.exitCode = 1;
});
