// API client for the BT Enterprise Day News backend.
// In development with Vite, requests to /api and /uploads are proxied to the backend.
// For other environments, override the base URL by setting VITE_API_BASE_URL (e.g. in .env.local).

import { FILE_SIZE_LIMITS } from "@/lib/fileSizeCheck";

const RAW_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";
export const API_BASE = RAW_BASE.replace(/\/$/, "");
export const UPLOADS_BASE = `${API_BASE}/uploads`;

export type Role = "STUDENT" | "STAFF";

interface HandleOptions {
  /** Whose session a 401 ends. Omit for public endpoints and for sign-in itself. */
  role?: Role;
}

export type SubmissionStatusApi = "NEW" | "APPROVED" | "REJECTED";

export interface ApiSubmission {
  id: number;
  filePath: string;
  /** Server-provided image URL (signed when the item isn't public); null for text-only messages. */
  imageUrl?: string | null;
  /** Small preview for cards and lists (issue #42), same access as imageUrl; null until made. */
  thumbnailUrl?: string | null;
  originalFileName: string;
  uploadedBy: string;
  uploadedAt: string;
  status: SubmissionStatusApi;
  vettedBy: string | null;
  vettedAt: string | null;
  /** Why staff rejected it (issue #38), shown to the student. */
  rejectionReason?: string | null;
  display: boolean;
  /** Goes on screen as soon as it's approved (true) or waits for the student to publish it (false). */
  publishOnApproval: boolean;
  displayOrder: number;
  priority: number;
  durationSeconds: number;
  /** What the team was charged, at the prices when it was uploaded (locked in; issue #47). */
  totalCost: number;
  /** Those prices as a percentage of normal (a price wobble); 100 = normal. Missing on older data. */
  pricePercent?: number;
  isInfoMessage: boolean;
  isFlashMode: boolean;
  messageText: string | null;
}

export interface ProjectorSettings {
  id: string;
  /** Staff content interval: seconds of student adverts between staff items (0 = after every advert). */
  intervalSpeedSeconds: number;
  /** How long each staff item stays on screen. Student adverts use their paid duration. */
  displayDurationSeconds: number;
  /** How often the projector checks for changes. */
  imageRefreshSeconds: number;
}

/** One choice on the price list and what it costs (event money). */
export interface PriceOption {
  value: number;
  cost: number;
}

/** The price list: the single source is the backend (PriceList.java). */
export interface PriceList {
  priority: PriceOption[];
  durationSeconds: PriceOption[];
  /** The price wobble in force (issue #41); the costs above already include it. */
  wobble?: PriceWobble | null;
}

/** Prices up or down for a while (issue #41). */
export interface PriceWobble {
  /** Prices as a percentage of normal: 50 = half price, 200 = double. */
  percent: number;
  message: string | null;
  /** null: started straight away. */
  startsAt: string | null;
  /** null: until staff end it. */
  endsAt: string | null;
  /** false while it's scheduled to start later. */
  activeNow: boolean;
}

export interface PriceWobbleRequest {
  percent: number;
  message: string | null;
  startsAt: string | null;
  endsAt: string | null;
}

export interface ApiUser {
  username: string;
  role: Role;
}

/** A student or staff sign-in account, as staff see it. */
export interface ApiAccount {
  id: number;
  username: string;
  locked: boolean;
  manuallyLocked: boolean;
  failedLoginAttempts: number;
  temporaryLockUntil: string | null;
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A team's sign-in details for a login slip (issue #37). The password is only returned once. */
export interface TeamLogin {
  username: string;
  password: string | null;
  status: "CREATED" | "RESET" | "SKIPPED";
  message: string | null;
}

/** Printed on login slips (issue #37). Empty fields are left off the slip. */
export interface EventDetails {
  wifiName: string | null;
  wifiPassword: string | null;
  /** e.g. http://192.168.1.10; when empty, the address the staff page was opened from. */
  appAddress: string | null;
}

/** One team's results (issue #40). */
export interface TeamResult {
  team: string;
  /** Approved adverts. */
  adverts: number;
  /** Event money spent on approved adverts. */
  spent: number;
  /** Times shown on the projector. */
  plays: number;
  /** Total time on the projector. */
  seconds: number;
  /** Spent per minute on screen (lower is better value); null until shown. */
  costPerMinute: number | null;
}

export interface EventResults {
  /** Most screen time first. */
  teams: TeamResult[];
  /** When the projector last recorded a showing; null if never (not opened from the staff app). */
  lastPlayAt: string | null;
}

export interface StudentResults {
  team: TeamResult;
  adverts: { imageId: number; plays: number; seconds: number }[];
}

/** A team's account, in event money (issue #48). */
export interface TeamBalance {
  team: string;
  /** Approved adverts' prices. */
  charged: number;
  /** Given back for approved adverts later rejected. */
  credited: number;
  /** Taken from the team's bank by staff. */
  paid: number;
  /** charged - credited - paid; negative = in credit. */
  owed: number;
  /** Adverts the team has in the system now. */
  advertsUploaded: number;
  /** Adverts it has been charged for (approved), net of any rejected later. */
  advertsCharged: number;
}

export interface LedgerLine {
  kind: "CHARGE" | "CREDIT" | "PAYMENT";
  amount: number;
  description: string | null;
  at: string;
  recordedBy: string | null;
}

export interface TeamAccount {
  balance: TeamBalance;
  entries: LedgerLine[];
}

// ── Sessions ────────────────────────────────────────────────────────────────
// Students and staff each have their own stored session, so signing in to one app in this browser
// doesn't sign you out of the other (handy when testing both on one machine).

interface Session extends ApiUser {
  token: string;
}

const sessionKey = (role: Role) => `session.${role}`;
const LOGIN_PAGE: Record<Role, string> = { STUDENT: "/student/login", STAFF: "/staff/login" };

/** Full-page navigation (an object so tests can observe it; jsdom doesn't navigate). */
export const navigation = {
  go(path: string) {
    window.location.href = path;
  },
};

/** Moves a session saved by older versions (single "token"/"user" pair) to its per-role slot. */
function migrateLegacySession() {
  const token = localStorage.getItem("token");
  const user = localStorage.getItem("user");
  if (!token || !user) return;
  try {
    const parsed = JSON.parse(user) as ApiUser;
    if ((parsed.role === "STUDENT" || parsed.role === "STAFF") && !localStorage.getItem(sessionKey(parsed.role))) {
      localStorage.setItem(sessionKey(parsed.role), JSON.stringify({ ...parsed, token }));
    }
  } catch {
    // Unreadable legacy data: just drop it.
  }
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

function readSession(role: Role): Session | null {
  migrateLegacySession();
  const raw = localStorage.getItem(sessionKey(role));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

const authHeaders = (role: Role): Record<string, string> => {
  const session = readSession(role);
  return session ? { Authorization: `Bearer ${session.token}` } : {};
};

/** An API failure. `message` is safe to show to users (including students); `status` is the HTTP status. */
export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * The message to show for a failed response. The backend sends its own explanation as plain text
 * (e.g. "Student account is locked"); anything else (HTML error pages, stack traces, empty bodies)
 * is replaced with a plain-English message based on the status.
 */
async function friendlyErrorMessage(res: Response): Promise<string> {
  if (res.status === 413) {
    return `That file is too big to upload. The limit is ${FILE_SIZE_LIMITS.maxMb} MB.`;
  }
  const text = (await res.text().catch(() => "")).trim();
  let message = "";
  if (text) {
    try {
      const json = JSON.parse(text);
      if (typeof json?.message === "string") message = json.message.trim();
    } catch {
      if (!text.startsWith("<")) message = text;
    }
  }
  if (message && message.length <= 300) return message;
  if (res.status >= 500) return "Something went wrong on our side. Please try again in a moment.";
  if (res.status === 403) return "You don't have permission to do that.";
  if (res.status === 404) return "That item couldn't be found. It may have been deleted.";
  return "Something went wrong. Please try again.";
}

async function handle<T>(res: Response, options: HandleOptions = {}): Promise<T> {
  if (options.role && res.status === 401) {
    // That role's session has expired or is no longer valid: sign in again.
    localStorage.removeItem(sessionKey(options.role));
    navigation.go(LOGIN_PAGE[options.role]);
  }
  if (!res.ok) {
    throw new ApiError(await friendlyErrorMessage(res), res.status);
  }
  // Some endpoints return no body
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) return (await res.json()) as T;
  return undefined as T;
}

/** Authenticated request as `role`. A JSON `body` is serialised; FormData and strings are sent as-is. */
function request<T>(role: Role, path: string, init: { method?: string; body?: unknown; contentType?: string } = {}) {
  const headers: Record<string, string> = { ...authHeaders(role) };
  let body: BodyInit | undefined;
  if (init.body instanceof FormData || typeof init.body === "string") {
    body = init.body;
    if (init.contentType) headers["Content-Type"] = init.contentType;
  } else if (init.body !== undefined) {
    body = JSON.stringify(init.body);
    headers["Content-Type"] = "application/json";
  }
  return fetch(`${API_BASE}${path}`, { method: init.method ?? "GET", headers, body }).then((res) =>
    handle<T>(res, { role }),
  );
}

const staff = <T>(path: string, init?: Parameters<typeof request>[2]) => request<T>("STAFF", path, init);
const student = <T>(path: string, init?: Parameters<typeof request>[2]) => request<T>("STUDENT", path, init);

export const api = {
  async login(username: string, role: Role, password?: string) {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, role, password }),
    });
    const data = await handle<{ token: string; username: string; role: Role }>(res);
    const session: Session = { token: data.token, username: data.username, role: data.role };
    localStorage.setItem(sessionKey(data.role), JSON.stringify(session));
    return data;
  },

  logout(role: Role) {
    localStorage.removeItem(sessionKey(role));
    navigation.go("/");
  },

  /** The signed-in user for `role`, or null. */
  getCurrentUser(role: Role): ApiUser | null {
    const session = readSession(role);
    return session ? { username: session.username, role: session.role } : null;
  },

  /**
   * Where to load an item's image from. The backend supplies `imageUrl`, which is signed for anything
   * not currently on the projector (pending, hidden, rejected), so always prefer it.
   */
  imageUrl(item: Pick<ApiSubmission, "imageUrl" | "filePath">) {
    if (item.imageUrl) return `${API_BASE}${item.imageUrl}`;
    return `${UPLOADS_BASE}/${encodeURIComponent(item.filePath)}`;
  },

  /**
   * A small preview for cards and lists (issue #42): about 50 KB instead of several MB over the event Wi-Fi.
   * Falls back to the full image until the server has made the preview.
   */
  thumbnailUrl(item: Pick<ApiSubmission, "imageUrl" | "filePath" | "thumbnailUrl">) {
    return item.thumbnailUrl ? `${API_BASE}${item.thumbnailUrl}` : api.imageUrl(item);
  },

  studentUpload(
    _name: string,
    file: File,
    priority: number = 1,
    durationSeconds: number = 10,
    publishOnApproval: boolean = true,
  ) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("priority", priority.toString());
    fd.append("durationSeconds", durationSeconds.toString());
    fd.append("publishOnApproval", publishOnApproval.toString());
    return student<ApiSubmission>("/api/student/upload", { method: "POST", body: fd });
  },

  /** Put an approved advert on screen or take it off; before approval, choose whether it goes on when approved. */
  studentSetPublished(id: number, published: boolean) {
    return student<ApiSubmission>(`/api/student/uploads/${id}/publish?published=${published}`, { method: "POST" });
  },

  studentPrices() {
    return student<PriceList>("/api/student/prices");
  },

  studentGetMyUploads(_name: string) {
    return student<ApiSubmission[]>("/api/student/uploads");
  },

  studentDeleteMyUpload(id: number, _name: string) {
    return student<void>(`/api/student/uploads/${id}`, { method: "DELETE" });
  },

  list(kind: "new" | "approved" | "rejected", _staffName = "staff") {
    return staff<ApiSubmission[]>(`/api/staff/${kind}`);
  },

  approve(id: number, _staffName = "staff") {
    return staff<ApiSubmission>(`/api/staff/approve/${id}`, { method: "POST" });
  },

  /** Rejects an advert; the optional reason is shown to the student (issue #38). */
  reject(id: number, _staffName = "staff", reason: string | null = null) {
    return staff<ApiSubmission>(`/api/staff/reject/${id}`, { method: "POST", body: { reason } });
  },

  toggleDisplay(id: number, display: boolean, _staffName = "staff") {
    return staff<ApiSubmission>(`/api/staff/toggle-display/${id}?display=${display}`, { method: "POST" });
  },

  updateDisplayOrder(ids: number[], _staffName = "staff") {
    return staff<void>("/api/staff/order", { method: "POST", body: ids });
  },

  delete(id: number, _staffName = "staff") {
    return staff<void>(`/api/staff/${id}`, { method: "DELETE" });
  },

  /** End of Day: delete all student adverts and restore default projector settings. */
  resetEvent() {
    return staff<{ deletedAdverts: number }>("/api/staff/reset-event", { method: "POST" });
  },

  listInfo(_staffName = "staff") {
    return staff<ApiSubmission[]>("/api/staff/info");
  },

  uploadInfo(file: File, flash: boolean, _staffName = "staff") {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("flash", flash.toString());
    return staff<ApiSubmission>("/api/staff/info/upload", { method: "POST", body: fd });
  },

  postFreeText(text: string, flash: boolean, _staffName = "staff") {
    return staff<ApiSubmission>(`/api/staff/info/free-text?flash=${flash}`, {
      method: "POST",
      body: text,
      contentType: "text/plain",
    });
  },

  toggleFlash(id: number, flash: boolean, _staffName = "staff") {
    return staff<ApiSubmission>(`/api/staff/toggle-flash/${id}?flash=${flash}`, { method: "POST" });
  },

  /** The signal lets the projector give up on a request that hangs (issue #39). */
  projectorImages(signal?: AbortSignal) {
    return fetch(`${API_BASE}/api/projector/images`, { signal }).then((res) => handle<ApiSubmission[]>(res));
  },

  projectorSettings(signal?: AbortSignal) {
    return fetch(`${API_BASE}/api/projector/settings`, { signal }).then((res) => handle<ProjectorSettings>(res));
  },

  updateProjectorSettings(settings: Omit<ProjectorSettings, "id">) {
    return staff<ProjectorSettings>("/api/projector/settings", { method: "POST", body: settings });
  },

  // ── Team setup and login slips (issue #37) ──
  createTeams(usernames: string[]) {
    return staff<TeamLogin[]>("/api/staff/students/teams", { method: "POST", body: { usernames } });
  },

  newTeamPassword(id: number) {
    return staff<TeamLogin>(`/api/staff/students/${id}/generated-password`, { method: "POST" });
  },

  eventDetails() {
    return staff<EventDetails>("/api/staff/event-details");
  },

  saveEventDetails(details: EventDetails) {
    return staff<EventDetails>("/api/staff/event-details", { method: "PUT", body: details });
  },

  // ── Results (issue #40) ──
  eventResults() {
    return staff<EventResults>("/api/staff/results");
  },

  studentResults() {
    return student<StudentResults>("/api/student/results");
  },

  // ── Balances (issue #48) ──
  balances() {
    return staff<TeamBalance[]>("/api/staff/balances");
  },

  teamAccount(team: string) {
    return staff<TeamAccount>(`/api/staff/balances/${encodeURIComponent(team)}`);
  },

  /** Staff took the whole balance (the amount shown) from the team's bank. */
  markPaid(team: string, amount: number) {
    return staff<TeamBalance>(`/api/staff/balances/${encodeURIComponent(team)}/paid`, {
      method: "POST",
      body: { amount },
    });
  },

  /** Every team's account, for printing invoices (issue #50); by default only teams that owe. */
  invoices(owingOnly = true) {
    return staff<TeamAccount[]>(`/api/staff/invoices?owing=${owingOnly}`);
  },

  myBalance() {
    return student<TeamAccount>("/api/student/balance");
  },

  // ── Price wobble (issue #41) ──
  /** The wobble in force or scheduled; undefined at normal prices. */
  priceWobble() {
    return staff<PriceWobble | undefined>("/api/staff/price-wobble");
  },

  setPriceWobble(request: PriceWobbleRequest) {
    return staff<PriceWobble>("/api/staff/price-wobble", { method: "PUT", body: request });
  },

  stopPriceWobble() {
    return staff<void>("/api/staff/price-wobble", { method: "DELETE" });
  },

  /** The price list at a percentage of normal, to preview a wobble. */
  staffPrices(percent: number) {
    return staff<PriceList>(`/api/staff/prices?percent=${percent}`);
  },

  /** A key so the projector can record what it shows; see lib/playRecorder.ts. */
  projectorKey() {
    return staff<{ key: string }>("/api/staff/projector-key", { method: "POST" });
  },
};

// ── Account management (staff only) ─────────────────────────────────────────

export type AccountKind = "student" | "staff";

const ACCOUNT_PATHS: Record<AccountKind, string> = {
  student: "/api/staff/students",
  staff: "/api/staff/staff-accounts",
};

/** The same operations for student and staff accounts. */
export function accountApi(kind: AccountKind) {
  const base = ACCOUNT_PATHS[kind];
  return {
    list: () => staff<ApiAccount[]>(base),
    create: (username: string, password: string) =>
      staff<ApiAccount>(base, { method: "POST", body: { username, password } }),
    setLocked: (id: number, locked: boolean) =>
      staff<ApiAccount>(`${base}/${id}/lock?locked=${locked}`, { method: "POST" }),
    changePassword: (id: number, password: string) =>
      staff<ApiAccount>(`${base}/${id}/password`, { method: "PUT", body: { password } }),
    rename: (id: number, username: string) =>
      staff<ApiAccount>(`${base}/${id}/username`, { method: "PUT", body: { username } }),
    remove: (id: number) => staff<void>(`${base}/${id}`, { method: "DELETE" }),
  };
}
// Format a backend ISO timestamp into a friendly relative string.
export function formatRelative(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso;
  const diff = Date.now() - t;
  const min = Math.round(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hr${hr === 1 ? "" : "s"} ago`;
  const d = Math.round(hr / 24);
  if (d < 7) return `${d} day${d === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString();
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "Never";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
}
