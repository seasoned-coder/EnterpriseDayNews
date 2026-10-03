// Fills the demo stack with made-up teams and adverts, then captures the README screenshots (issue #44).
// Run through make-screenshots.ps1, which starts and removes the demo stack.
import { execSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import puppeteer from "puppeteer-core";

const BASE = "http://127.0.0.1:3100";
const OUT = process.argv[2] ?? "screenshots";
const STAFF = { username: "ms.okafor", password: process.env.DEMO_STAFF_PASSWORD };
const TEAM_PASSWORD = "DemoTeam42";

const CHROME = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].find((p) => p && existsSync(p));

/** Made-up student companies and their adverts. */
const ADVERTS = [
  { team: "rocket-lemonade", title: "ROCKET LEMONADE", line: "Fizz that's out of this world", price: "50p a cup · Stand 4", colours: ["#ffe259", "#ffa751"], ink: "#3b1d00", status: "APPROVED", priority: 4, duration: 20 },
  { team: "pixel-pals", title: "PIXEL PALS", line: "Custom stickers for your phone", price: "3 for £1 · Stand 9", colours: ["#7f00ff", "#00d4ff"], ink: "#ffffff", status: "APPROVED", priority: 2, duration: 10 },
  { team: "green-bean-co", title: "Green Bean Co.", line: "Grow-your-own desk plant kits", price: "£2 · Stand 2", colours: ["#11998e", "#38ef7d"], ink: "#05291f", status: "APPROVED", priority: 3, duration: 30 },
  { team: "rocket-lemonade", title: "HAPPY HOUR", line: "Two lemonades for 80p at 2 o'clock!", price: "Rocket Lemonade · Stand 4", colours: ["#f857a6", "#ff5858"], ink: "#ffffff", status: "APPROVED", publishOnApproval: false, priority: 2, duration: 10 },
  { team: "byte-bakery", title: "BYTE BAKERY", line: "Cookies with extra chips", price: "40p · Stand 6", colours: ["#8e5b3a", "#e0b084"], ink: "#2a1608", status: "NEW", priority: 1, duration: 20 },
  { team: "sock-it", title: "SOCK IT!", line: "Odd socks, perfectly paired", price: "£1.50 · Stand 11", colours: ["#fc466b", "#3f5efb"], ink: "#ffffff", status: "NEW", priority: 3, duration: 10 },
  { team: "rocket-lemonade", title: "NEW FLAVOUR", line: "Blue raspberry blast-off", price: "Rocket Lemonade · Stand 4", colours: ["#2193b0", "#6dd5ed"], ink: "#002a36", status: "NEW", priority: 1, duration: 10 },
  { team: "solar-snacks", title: "solar snacks", line: "crisps", price: "", colours: ["#bdc3c7", "#d7dde2"], ink: "#9aa0a6", status: "REJECTED", priority: 1, duration: 10 },
];
const TEAMS = [...new Set([...ADVERTS.map((a) => a.team), "comet-crafts", "the-fudge-lab", "eco-pens"])];

async function api(path, { token, json, form, method = "POST" } = {}) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  let body;
  if (json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(json);
  } else if (form) {
    body = form;
  }
  const res = await fetch(`${BASE}${path}`, { method, headers, body });
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${await res.text()}`);
  return res.headers.get("content-type")?.includes("json") ? res.json() : res.text();
}

const login = (username, password, role) => api("/api/auth/login", { json: { username, password, role } });

async function waitForStack() {
  for (let i = 0; i < 45; i++) {
    try {
      const res = await fetch(`${BASE}/api/projector/settings`);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("demo stack did not start");
}

/** Renders an advert design to a PNG, like a poster a team might make. */
async function renderAdvert(browser, a) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900 });
  await page.setContent(`
    <body style="margin:0;width:1600px;height:900px;display:flex;flex-direction:column;justify-content:center;
      align-items:center;text-align:center;font-family:'Segoe UI',Arial,sans-serif;color:${a.ink};
      background:linear-gradient(135deg,${a.colours[0]},${a.colours[1]})">
      <div style="font-size:170px;font-weight:900;letter-spacing:4px;line-height:1">${a.title}</div>
      <div style="font-size:72px;font-weight:600;margin-top:40px">${a.line}</div>
      <div style="font-size:52px;margin-top:60px;padding:16px 48px;border:6px solid currentColor;border-radius:999px;
        ${a.price ? "" : "display:none"}">${a.price}</div>
    </body>`);
  const png = await page.screenshot({ type: "png" });
  await page.close();
  return new Blob([png], { type: "image/png" });
}

async function seed(browser) {
  const staff = (await login(STAFF.username, STAFF.password, "STAFF")).token;
  for (const team of TEAMS) {
    await api("/api/staff/students", { token: staff, json: { username: team, password: TEAM_PASSWORD } });
  }
  const tokens = {};
  for (const a of ADVERTS) {
    tokens[a.team] ??= (await login(a.team, TEAM_PASSWORD, "STUDENT")).token;
    const form = new FormData();
    form.append("file", await renderAdvert(browser, a), `${a.team}-advert.png`);
    form.append("priority", String(a.priority));
    form.append("durationSeconds", String(a.duration));
    form.append("publishOnApproval", String(a.publishOnApproval ?? true));
    const upload = await api("/api/student/upload", { token: tokens[a.team], form });
    if (a.status === "APPROVED") await api(`/api/staff/approve/${upload.id}`, { token: staff });
    if (a.status === "REJECTED") await api(`/api/staff/reject/${upload.id}`, { token: staff });
  }
  // A staff notice for the projector.
  const notice = new FormData();
  notice.append(
    "file",
    await renderAdvert(browser, {
      title: "LUNCH 12:30",
      line: "Main hall · bring your sales sheets",
      price: "Enterprise Day",
      colours: ["#0f2027", "#2c5364"],
      ink: "#ffffff",
    }),
    "lunch-notice.png",
  );
  const info = await api("/api/staff/info/upload", { token: staff, form: notice });
  await api(`/api/staff/toggle-display/${info.id}?display=true`, { token: staff });

  // Some screen time for the Results tab (#40), recorded the way the projector does it, with its key.
  const { key } = await api("/api/staff/projector-key", { token: staff });
  const live = (await (await fetch(`${BASE}/api/projector/images`)).json()).filter((i) => !i.isInfoMessage);
  const plays = live.flatMap((item, n) =>
    Array.from({ length: 4 + item.priority * 3 + n }, () => ({
      imageId: item.id,
      seconds: item.durationSeconds,
      playedAt: new Date().toISOString(),
    })),
  );
  await api("/api/projector/plays", { token: key, json: plays });
  return { staff, student: tokens["rocket-lemonade"] };
}

async function signedInPage(browser, viewport, sessions) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
  await page.evaluate((s) => {
    for (const [key, value] of Object.entries(s)) localStorage.setItem(key, JSON.stringify(value));
  }, sessions);
  return page;
}

async function shoot(page, path, name) {
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle0" });
  await settle(page);
  await page.screenshot({ path: join(OUT, `${name}.png`) });
  console.log(`  ${name}.png`);
}

async function settle(page, ms = 1200) {
  await page.evaluate(() => document.fonts.ready);
  await new Promise((r) => setTimeout(r, ms));
}

async function clickTab(page, label) {
  await page.evaluate((text) => {
    const tab = [...document.querySelectorAll('[role="tab"]')].find((t) => t.textContent.trim().startsWith(text));
    tab.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    tab.click();
  }, label);
  await settle(page);
}

const desktop = { width: 1440, height: 900, deviceScaleFactor: 1 };
const phone = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

async function main() {
  if (!CHROME) throw new Error("Chrome or Edge not found; set CHROME_PATH");
  await mkdir(OUT, { recursive: true });
  await waitForStack();
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  try {
    console.log("Adding demo teams and adverts...");
    const { staff, student } = await seed(browser);
    const sessions = {
      "session.STAFF": { token: staff, username: STAFF.username, role: "STAFF" },
      "session.STUDENT": { token: student, username: "rocket-lemonade", role: "STUDENT" },
    };

    console.log(`Capturing into ${OUT}:`);
    const home = await signedInPage(browser, desktop, {});
    await shoot(home, "/", "home");

    const mobile = await signedInPage(browser, phone, sessions);
    await shoot(mobile, "/student", "student-upload");

    // Choose an advert and show the tap-to-choose prices and total.
    const advertFile = join(tmpdir(), "news-demo-advert.png");
    await writeFile(
      advertFile,
      Buffer.from(await (await renderAdvert(browser, {
        title: "COMET CRAFTS", line: "Hand-made space keyrings", price: "£1 · Stand 7",
        colours: ["#141e30", "#6a3093"], ink: "#ffffff",
      })).arrayBuffer()),
    );
    const input = await mobile.$('input[type="file"]');
    await input.uploadFile(advertFile);
    await settle(mobile, 4000); // the in-browser image check
    await mobile.evaluate(() => {
      const radios = [...document.querySelectorAll('[role="radio"]')];
      radios.find((r) => r.getAttribute("aria-label").startsWith("3,"))?.click();
      radios.find((r) => r.getAttribute("aria-label").startsWith("20s,"))?.click();
      document.querySelector('[role="radiogroup"]').scrollIntoView({ block: "start" });
      window.scrollBy(0, -110); // keep the label visible under the sticky banner
    });
    await settle(mobile);
    await mobile.screenshot({ path: join(OUT, "student-prices.png") });
    console.log("  student-prices.png");

    await mobile.evaluate(() => {
      const heading = [...document.querySelectorAll("h2")].find((h) => h.textContent.includes("Your uploads"));
      heading.scrollIntoView({ block: "start" });
      window.scrollBy(0, -80); // leave room under the sticky banner
    });
    await settle(mobile);
    await mobile.screenshot({ path: join(OUT, "student-uploads.png") });
    console.log("  student-uploads.png");

    const staffPage = await signedInPage(browser, desktop, sessions);
    await shoot(staffPage, "/staff", "staff-new");
    await clickTab(staffPage, "Approved");
    await staffPage.screenshot({ path: join(OUT, "staff-approved.png") });
    console.log("  staff-approved.png");
    await clickTab(staffPage, "Results");
    await staffPage.screenshot({ path: join(OUT, "staff-results.png") });
    console.log("  staff-results.png");
    await shoot(staffPage, "/staff/students", "staff-students");

    // A login slip as it comes out of the till printer (#37): demo Wi-Fi details, then create two teams.
    await api("/api/staff/event-details", {
      token: staff,
      method: "PUT",
      json: { wifiName: "EnterpriseDay", wifiPassword: "Sunflower88", appAddress: "http://192.168.1.10" },
    });
    await staffPage.reload({ waitUntil: "networkidle0" });
    await staffPage.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent === "List of names").click());
    await staffPage.type("textarea", "Nova Noodles\nStar Socks");
    await staffPage.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Create teams")).click());
    await staffPage.waitForSelector('[data-testid="slip-preview"] .slip-paper');
    await staffPage.setViewport({ ...desktop, deviceScaleFactor: 2 });
    await settle(staffPage);
    const slip = await staffPage.$('[data-testid="slip-preview"]');
    await slip.evaluate((el) => {
      // A plain desk-coloured background around the strip of paper.
      el.style.background = "#d6d0c4";
      el.style.padding = "28px";
      el.scrollIntoView({ block: "center" });
    });
    await settle(staffPage, 300);
    await slip.screenshot({ path: join(OUT, "login-slip.png") });
    console.log("  login-slip.png");

    const projector = await signedInPage(browser, { width: 1280, height: 720, deviceScaleFactor: 1 }, {});
    await projector.bringToFront();
    await projector.goto(`${BASE}/projector`, { waitUntil: "networkidle0" });
    await settle(projector, 4000);
    await projector.screenshot({ path: join(OUT, "projector.png") });
    console.log("  projector.png");

    // Last, because it stops the demo backend: the projector carries on in OFFLINE MODE (#39).
    execSync(`docker compose -p newsdemo -f "${join(import.meta.dirname, "docker-compose.yml")}" stop backend`, {
      stdio: "ignore",
    });
    await projector.waitForSelector('[role="status"]', { timeout: 60_000 });
    await settle(projector, 1500);
    await projector.screenshot({ path: join(OUT, "projector-offline.png") });
    console.log("  projector-offline.png");
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
