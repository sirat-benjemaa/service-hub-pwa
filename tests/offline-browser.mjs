// Real Chromium test, using its DevTools protocol without additional dependencies.
// Run a production server first: npm run start -- --port 3100
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const origin = process.env.TEST_ORIGIN || "http://localhost:3100";
const browserPath = process.env.BROWSER_PATH || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const profile = await mkdtemp(path.join(tmpdir(), "servicehub-offline-test-"));
const browser = spawn(browserPath, ["--headless=new", "--disable-gpu", "--no-sandbox", "--no-first-run", "--remote-debugging-port=9229", `--user-data-dir=${profile}`, "about:blank"], { windowsHide: true, stdio: "ignore" });
let socket;
let sequence = 0;
const pending = new Map();
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function until(check, description) {
  const deadline = Date.now() + 25000;
  while (Date.now() < deadline) {
    try { if (await check()) return; } catch { /* Navigation temporarily replaces the execution context. */ }
    await pause(150);
  }
  throw new Error(`Timed out: ${description}`);
}

function command(method, params = {}, sessionId) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`Timed out: ${method}`)); }, 15000);
    pending.set(id, { resolve, reject, timeout });
    socket.send(JSON.stringify({ id, method, params, sessionId }));
  });
}

async function evaluate(expression) {
  const result = await command("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

try {
  await until(async () => (await fetch("http://127.0.0.1:9229/json/version")).ok, "browser startup");
  const target = await (await fetch("http://127.0.0.1:9229/json/new?about:blank", { method: "PUT" })).json();
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    const task = pending.get(message.id);
    if (!task) return;
    pending.delete(message.id);
    clearTimeout(task.timeout);
    if (message.error) task.reject(new Error(message.error.message));
    else task.resolve(message.result);
  };
  await command("Page.enable");
  await command("Network.enable");
  // Disable the HTTP cache: offline success must come from the service worker.
  await command("Network.setCacheDisabled", { cacheDisabled: true });
  await command("Page.navigate", { url: origin });
  await until(() => evaluate('!!navigator.serviceWorker.controller'), "worker activation and complete precache");
  assert.equal(await evaluate('document.querySelector("aside[role=status]")'), null, "No status box while online");
  assert.equal(await evaluate("document.querySelectorAll('article').length"), 3);
  console.log("PASS: fresh browser installs worker and prepares catalogue.");

  const manifest = await command("Page.getAppManifest");
  assert.equal(new URL(manifest.url).pathname, "/manifest.webmanifest");
  assert.deepEqual(manifest.errors, [], "Browser parses the linked manifest without errors");
  const { installabilityErrors } = await command("Page.getInstallabilityErrors");
  assert.deepEqual(installabilityErrors, [], "Browser reports no installation blockers");
  console.log("PASS: linked manifest is valid and browser reports no installation blockers.");

  for (const width of [320, 375, 390, 640, 768, 844, 1024, 1440]) {
    await command("Emulation.setDeviceMetricsOverride", { width, height: 844, deviceScaleFactor: 1, mobile: width < 640 });
    const layout = await evaluate(`(async () => {
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return {
        viewport: innerWidth,
        content: document.documentElement.scrollWidth,
        titleSize: parseFloat(getComputedStyle(document.querySelector('h1')).fontSize),
        sidePadding: parseFloat(getComputedStyle(document.querySelector('main')).paddingLeft),
        skipLinkBottom: document.querySelector('.skip-link').getBoundingClientRect().bottom,
        columns: getComputedStyle(document.querySelector('[data-service-grid]')).gridTemplateColumns.split(' ').length,
        controls: [...document.querySelectorAll('header a, section a')].map(element => {
          const rect = element.getBoundingClientRect();
          return { width: rect.width, height: rect.height };
        }),
        cards: [...document.querySelectorAll('article')].map(element => {
          const rect = element.getBoundingClientRect();
          return { left: rect.left, right: rect.right };
        }),
      };
    })()`);
    assert(layout.content <= width, `No horizontal overflow at ${width}px`);
    assert.equal(layout.viewport, width, `Viewport matches device at ${width}px`);
    assert(layout.titleSize >= 32, `Hero typography loads at ${width}px`);
    assert(layout.sidePadding >= 16, `Readable side margins at ${width}px`);
    assert(layout.skipLinkBottom <= 0, "Skip link is hidden until keyboard focus");
    assert.equal(layout.columns, width < 640 ? 1 : width < 1024 ? 2 : 3);
    assert(layout.controls.every(control => control.height >= 44 && control.width >= 44), `Comfortable touch targets at ${width}px`);
    assert(layout.cards.every(card => card.left >= 0 && card.right <= width), `Cards fit at ${width}px`);
    console.log(`PASS: responsive layout at ${width}px, ${layout.columns} column(s), no overflow, touch targets >= 44px.`);

    if (process.env.TEST_SCREENSHOTS && [390, 1440].includes(width)) {
      await mkdir(".next/responsive-preview", { recursive: true });
      const { cssContentSize } = await command("Page.getLayoutMetrics");
      const { data } = await command("Page.captureScreenshot", {
        format: "png", captureBeyondViewport: true,
        clip: { x: 0, y: 0, width, height: cssContentSize.height, scale: 1 },
      });
      await writeFile(`.next/responsive-preview/${width}.png`, Buffer.from(data, "base64"));
    }
  }
  // Check text enlargement on a narrow viewport without disabling browser zoom.
  await command("Emulation.setDeviceMetricsOverride", { width: 320, height: 740, deviceScaleFactor: 1, mobile: true });
  await evaluate('document.documentElement.style.fontSize = "200%"');
  assert(await evaluate("document.documentElement.scrollWidth <= innerWidth"), "No horizontal overflow with enlarged text");
  await evaluate('document.documentElement.style.fontSize = ""');
  console.log("PASS: narrow viewport remains usable with text enlarged to 200%.");

  const offline = { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 };
  // CDP's page emulation alone does not disable network in the separate worker target.
  const { targetInfos } = await command("Target.getTargets");
  const workerTarget = targetInfos.find((target) => target.type === "service_worker" && target.url === `${origin}/sw.js`);
  assert(workerTarget, "Service worker target exists");
  const { sessionId: workerSession } = await command("Target.attachToTarget", { targetId: workerTarget.targetId, flatten: true });
  await command("Network.enable", {}, workerSession);
  await command("Network.emulateNetworkConditions", offline, workerSession);
  await command("Network.emulateNetworkConditions", offline);
  await evaluate("window.__beforeOfflineReload = true");
  await command("Page.reload", { ignoreCache: true });
  await until(() => evaluate('!window.__beforeOfflineReload && document.readyState === "complete" && document.body.innerText.includes("Vous êtes hors ligne")'), "offline reload and React hydration");
  assert.equal(await evaluate("document.querySelectorAll('article').length"), 3);
  assert(await evaluate("document.documentElement.scrollWidth <= innerWidth"), "Offline status fits mobile viewport");
  assert(await evaluate("document.querySelector('aside button').getBoundingClientRect().height >= 44"), "Offline button is touch accessible");
  console.log("PASS: offline hard reload retains catalogue, styles, and interactive status.");

  await command("Page.navigate", { url: `${origin}/page-non-visitee` });
  await until(() => evaluate('document.body.innerText.includes("Cette page n’est pas disponible hors ligne.")'), "uncached route fallback");
  console.log("PASS: uncached route serves the offline fallback.");
  assert(await evaluate("document.documentElement.scrollWidth <= innerWidth"), "Offline fallback fits mobile viewport");

  await command("Page.navigate", { url: origin });
  await until(() => evaluate('document.body.innerText.includes("Vous êtes hors ligne")'), "return to catalogue offline");
  await command("Network.emulateNetworkConditions", { ...offline, offline: false }, workerSession);
  await command("Network.emulateNetworkConditions", { ...offline, offline: false });
  await until(() => evaluate('navigator.onLine && !document.querySelector("aside[role=status]")'), "status box disappears after reconnection");
  console.log("PASS: status box is hidden online and disappears after reconnection without reloading.");

  const cached = await evaluate(`(async () => {
    const names = await caches.keys();
    const cache = await caches.open(names.find(name => name.startsWith('servicehub-offline-')));
    return (await cache.keys()).map(request => new URL(request.url).pathname);
  })()`);
  assert(cached.includes("/") && cached.includes("/offline.html"));
  assert(cached.some((url) => url.endsWith(".css")));
  assert(cached.some((url) => url.endsWith(".js")));
  assert(!cached.some((url) => url.startsWith("/api/")));
  console.log("PASS: cache contains the public shell, JavaScript, and CSS.");
} catch (error) {
  console.error(await evaluate('JSON.stringify({url: location.href, text: document.body.innerText, controlled: !!navigator.serviceWorker?.controller})').catch(() => "Browser context unavailable"));
  throw error;
} finally {
  if (socket?.readyState === WebSocket.OPEN) {
    try { await command("Browser.close"); } catch { /* Browser may close before replying. */ }
  }
  socket?.close();
  browser.kill();
  for (const task of pending.values()) clearTimeout(task.timeout);
  // Only remove the temporary profile created by this test, within the OS temp directory.
  if (path.dirname(profile) === path.resolve(tmpdir()) && path.basename(profile).startsWith("servicehub-offline-test-")) {
    await rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
}
