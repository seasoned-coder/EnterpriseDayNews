// Simulates a full event against a running stack (issue #36). See loadtest/README.md.
//
//   TEAMS x 2 student phones (two phones share each team account). Default 52 teams = 104 phones,
//     a big event; a normal event is 26 teams (TEAMS=26).
//    3 staff on the Advert Dashboard
//    1 projector
//
// SCENARIO=steady (default): everyone using the apps at once for DURATION, at a pace well above a
//   real event (students upload far more often than they would), to leave headroom.
// SCENARIO=burst: the worst moment, every phone signs in and uploads at the same time.
import http from "k6/http";
import { check, sleep } from "k6";
import { Counter } from "k6/metrics";

const BASE = __ENV.BASE_URL || "http://frontend";
const ADMIN_USER = __ENV.ADMIN_USER;
const ADMIN_PASS = __ENV.ADMIN_PASS;
const SCENARIO = __ENV.SCENARIO || "steady";
const DURATION = __ENV.DURATION || "5m";

const TEAMS = Number(__ENV.TEAMS || 52);
const PHONES = TEAMS * 2;
const TEAM_PASSWORD = "LoadTestTeam42";
const STAFF_PASSWORD = "LoadTestStaff42";
const ADVERT = open("./advert.jpg", "b");

const uploads = new Counter("adverts_uploaded");
const approvals = new Counter("adverts_approved");
const publishes = new Counter("adverts_published");

const steady = {
  // Phones arrive over the first 30s (the burst scenario covers everyone at once), then all stay busy.
  students: {
    executor: "ramping-vus",
    stages: [{ duration: "30s", target: PHONES }, { duration: DURATION, target: PHONES }],
    exec: "student",
  },
  staff: { executor: "constant-vus", vus: 3, duration: DURATION, exec: "staff" },
  projector: { executor: "constant-vus", vus: 1, duration: DURATION, exec: "projector" },
};
const burst = {
  everyoneAtOnce: { executor: "per-vu-iterations", vus: PHONES, iterations: 1, maxDuration: "2m", exec: "burstStudent" },
  projector: { executor: "constant-vus", vus: 1, duration: "1m", exec: "projector" },
};

export const options = {
  scenarios: SCENARIO === "burst" ? burst : steady,
  setupTimeout: "15m", // creating hundreds of team accounts takes a while
  summaryTrendStats: ["avg", "med", "p(95)", "max"],
  thresholds: {
    http_req_failed: ["rate<0.01"],
    // In the burst every phone's password is checked at once (deliberately slow hashing), which briefly
    // slows everything else, so allow list refreshes a little longer there.
    "http_req_duration{kind:poll}": [SCENARIO === "burst" ? "p(95)<1000" : "p(95)<300"],
    "http_req_duration{kind:action}": ["p(95)<1000"],
    "http_req_duration{kind:login}": ["p(95)<1500"],
    "http_req_duration{kind:upload}": ["p(95)<5000"],
    "http_req_duration{kind:image}": ["p(95)<1500"],
  },
};

const json = { "Content-Type": "application/json" };
const auth = (token) => ({ Authorization: `Bearer ${token}` });
const teamName = (n) => `loadteam${String(n).padStart(2, "0")}`;

function login(username, password, role) {
  const res = http.post(`${BASE}/api/auth/login`, JSON.stringify({ username, password, role }), {
    headers: json,
    tags: { kind: "login" },
  });
  check(res, { "signed in": (r) => r.status === 200 });
  return res.status === 200 ? res.json("token") : null;
}

/** Creates the test accounts (ignores "already exists"). */
export function setup() {
  if (!ADMIN_USER || !ADMIN_PASS) throw new Error("Set ADMIN_USER and ADMIN_PASS (a staff login)");
  const admin = login(ADMIN_USER, ADMIN_PASS, "STAFF");
  if (!admin) throw new Error("Could not sign in as the admin staff account");
  const headers = { ...json, ...auth(admin) };
  for (let t = 1; t <= TEAMS; t++) {
    http.post(`${BASE}/api/staff/students`, JSON.stringify({ username: teamName(t), password: TEAM_PASSWORD }), {
      headers,
      responseCallback: http.expectedStatuses(201, 409),
    });
  }
  for (let s = 1; s <= 3; s++) {
    http.post(`${BASE}/api/staff/staff-accounts`, JSON.stringify({ username: `loadstaff${s}`, password: STAFF_PASSWORD }), {
      headers,
      responseCallback: http.expectedStatuses(201, 409),
    });
  }
  return {};
}

function uploadAdvert(token, publishOnApproval) {
  const res = http.post(
    `${BASE}/api/student/upload`,
    {
      file: http.file(ADVERT, "advert.jpg", "image/jpeg"),
      priority: String(1 + Math.floor(Math.random() * 4)),
      durationSeconds: String([10, 20, 30][Math.floor(Math.random() * 3)]),
      publishOnApproval: String(publishOnApproval),
    },
    { headers: auth(token), tags: { kind: "upload" } },
  );
  if (check(res, { "upload accepted": (r) => r.status === 200 })) uploads.add(1);
}

// One student phone. Two phones (VUs) share each team account, like two students on the same team.
let studentToken = null;
export function student() {
  const team = teamName(((__VU - 1) % TEAMS) + 1);
  if (!studentToken) {
    studentToken = login(team, TEAM_PASSWORD, "STUDENT");
    http.get(`${BASE}/api/student/prices`, { headers: auth(studentToken), tags: { kind: "poll" } });
  }
  const mine = http.get(`${BASE}/api/student/uploads`, { headers: auth(studentToken), tags: { kind: "poll" } });
  check(mine, { "uploads listed": (r) => r.status === 200 });

  const roll = Math.random();
  if (roll < 0.06) {
    uploadAdvert(studentToken, Math.random() < 0.7);
  } else if (roll < 0.12 && mine.status === 200) {
    // Publish or withdraw one of the team's approved adverts.
    const approved = mine.json().filter((u) => u.status === "APPROVED");
    if (approved.length > 0) {
      const advert = approved[Math.floor(Math.random() * approved.length)];
      const res = http.post(`${BASE}/api/student/uploads/${advert.id}/publish?published=${!advert.display}`, null, {
        headers: auth(studentToken),
        tags: { kind: "action" },
      });
      if (check(res, { "publish/withdraw ok": (r) => r.status === 200 })) publishes.add(1);
    }
  } else if (roll < 0.2 && mine.status === 200 && mine.json().length > 0) {
    // Look at one of their own adverts' cards (signed link; the small preview once made, #42).
    const list = mine.json();
    const advert = list[Math.floor(Math.random() * list.length)];
    const url = advert.thumbnailUrl || advert.imageUrl;
    if (url) http.get(`${BASE}${url}`, { tags: { kind: "image" } });
  }
  sleep(8 + Math.random() * 4); // the page refreshes every ~10s
}

// One staff member on the Advert Dashboard.
let staffToken = null;
export function staff() {
  if (!staffToken) staffToken = login(`loadstaff${__VU % 3 + 1}`, STAFF_PASSWORD, "STAFF");
  const headers = auth(staffToken);
  const fresh = http.get(`${BASE}/api/staff/new`, { headers, tags: { kind: "poll" } });
  http.get(`${BASE}/api/staff/approved`, { headers, tags: { kind: "poll" } });
  http.get(`${BASE}/api/staff/rejected`, { headers, tags: { kind: "poll" } });
  http.get(`${BASE}/api/staff/info`, { headers, tags: { kind: "poll" } });

  if (fresh.status === 200) {
    // The New tab's cards load small previews (#42)...
    for (const advert of fresh.json()) {
      if (advert.thumbnailUrl) http.get(`${BASE}${advert.thumbnailUrl}`, { tags: { kind: "image" } });
    }
    // ...then review a few: open the full picture, then approve (mostly) or reject.
    for (const advert of fresh.json().slice(0, 3)) {
      if (advert.imageUrl) http.get(`${BASE}${advert.imageUrl}`, { tags: { kind: "image" } });
      const verb = Math.random() < 0.9 ? "approve" : "reject";
      const res = http.post(`${BASE}/api/staff/${verb}/${advert.id}`, null, {
        headers,
        tags: { kind: "action" },
        responseCallback: http.expectedStatuses(200, 409),
      });
      // 409: another staff member reviewed it first, which is fine.
      check(res, { "review ok (or already done)": (r) => r.status === 200 || r.status === 409 });
      if (res.status === 200 && verb === "approve") approvals.add(1);
    }
  }
  sleep(13 + Math.random() * 4); // dashboards refresh every 15s
}

// The projector: checks the feed every 3s and loads the image of each new slide.
export function projector() {
  const feed = http.get(`${BASE}/api/projector/images`, { tags: { kind: "poll" } });
  check(feed, { "feed ok": (r) => r.status === 200 });
  if (__ITER % 4 === 0 && feed.status === 200) {
    const items = feed.json().filter((i) => i.imageUrl);
    if (items.length > 0) {
      const slide = items[__ITER % items.length];
      http.get(`${BASE}${slide.imageUrl}`, { tags: { kind: "image" } });
    }
  }
  if (__ITER % 20 === 0) http.get(`${BASE}/api/projector/settings`, { tags: { kind: "poll" } });
  sleep(3);
}

// Worst case: every phone signs in and uploads at the same moment.
export function burstStudent() {
  const token = login(teamName(((__VU - 1) % TEAMS) + 1), TEAM_PASSWORD, "STUDENT");
  if (!token) return;
  http.get(`${BASE}/api/student/prices`, { headers: auth(token), tags: { kind: "poll" } });
  uploadAdvert(token, true);
  http.get(`${BASE}/api/student/uploads`, { headers: auth(token), tags: { kind: "poll" } });
}
