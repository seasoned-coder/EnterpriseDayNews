import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError, navigation, type Role } from "@/lib/api";

function signIn(role: Role, token: string, username: string) {
  localStorage.setItem(`session.${role}`, JSON.stringify({ token, username, role }));
}

describe("sessions per role", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    window.history.pushState({}, "", "/");
  });

  it("keeps student and staff sessions separate", async () => {
    signIn("STAFF", "staff-token", "head.teacher");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ token: "student-token", username: "year10", role: "STUDENT" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await api.login("year10", "STUDENT", "Sunrise7");

    expect(api.getCurrentUser("STAFF")).toEqual({ username: "head.teacher", role: "STAFF" });
    expect(api.getCurrentUser("STUDENT")).toEqual({ username: "year10", role: "STUDENT" });
  });

  it("sends each role's own token", async () => {
    signIn("STAFF", "staff-token", "head.teacher");
    signIn("STUDENT", "student-token", "year10");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response("[]", {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));

    await api.list("new");
    await api.studentGetMyUploads("year10");

    const auth = fetchMock.mock.calls.map(([, init]) => (init?.headers as Record<string, string>).Authorization);
    expect(auth).toEqual(["Bearer staff-token", "Bearer student-token"]);
  });

  it("moves a session saved by the old version into its role's slot", () => {
    localStorage.setItem("token", "old-token");
    localStorage.setItem("user", JSON.stringify({ username: "head.teacher", role: "STAFF" }));

    expect(api.getCurrentUser("STAFF")).toEqual({ username: "head.teacher", role: "STAFF" });
    expect(api.getCurrentUser("STUDENT")).toBeNull();
    expect(localStorage.getItem("token")).toBeNull();
  });

  it("an expired session signs out only that role and opens its sign-in page", async () => {
    signIn("STAFF", "staff-token", "head.teacher");
    signIn("STUDENT", "student-token", "year10");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 401 }));
    const go = vi.spyOn(navigation, "go").mockImplementation(() => {});

    await expect(api.list("new")).rejects.toBeInstanceOf(ApiError);

    expect(api.getCurrentUser("STAFF")).toBeNull();
    expect(api.getCurrentUser("STUDENT")).not.toBeNull();
    expect(go).toHaveBeenCalledWith("/staff/login");
  });

  it("logout clears only that role", () => {
    signIn("STAFF", "staff-token", "head.teacher");
    signIn("STUDENT", "student-token", "year10");

    vi.spyOn(navigation, "go").mockImplementation(() => {});
    api.logout("STUDENT");

    expect(api.getCurrentUser("STUDENT")).toBeNull();
    expect(api.getCurrentUser("STAFF")).not.toBeNull();
  });
});

describe("api.studentDeleteMyUpload", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("sends DELETE to the student upload endpoint with auth header", async () => {
    signIn("STUDENT", "test-token", "student1");

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 204 }));

    await api.studentDeleteMyUpload(42, "student1");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/student/uploads/42",
      expect.objectContaining({
        method: "DELETE",
        headers: expect.objectContaining({ Authorization: "Bearer test-token" }),
      }),
    );
  });
});

describe("api.imageUrl", () => {
  it("uses the server-provided (possibly signed) URL as-is", () => {
    expect(
      api.imageUrl({ filePath: "abc_advert.jpg", imageUrl: "/uploads/abc_advert.jpg?exp=1&sig=xyz" }),
    ).toBe("/uploads/abc_advert.jpg?exp=1&sig=xyz");
  });

  it("falls back to an encoded public path when the server sends no URL", () => {
    expect(api.imageUrl({ filePath: "abc_my advert #1.jpg" })).toBe("/uploads/abc_my%20advert%20%231.jpg");
    expect(api.imageUrl({ filePath: "abc.jpg", imageUrl: null })).toBe("/uploads/abc.jpg");
  });
});

describe("API error messages", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function errorFor(response: Response): Promise<ApiError> {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response);
    try {
      await api.login("someone", "STUDENT", "pw");
    } catch (e) {
      return e as ApiError;
    }
    throw new Error("expected the request to fail");
  }

  it("shows the server's own message without any technical prefix", async () => {
    const err = await errorFor(
      new Response("Too many failed attempts. This account is temporarily locked for 15 minutes.", {
        status: 423,
        headers: { "Content-Type": "text/plain" },
      }),
    );
    expect(err).toBeInstanceOf(ApiError);
    expect(err.message).toBe("Too many failed attempts. This account is temporarily locked for 15 minutes.");
    expect(err.message).not.toMatch(/Request failed|\[\d+\]/);
    expect(err.status).toBe(423);
  });

  it("explains the size limit when nginx rejects a large upload", async () => {
    const err = await errorFor(new Response("<html><body>413 Request Entity Too Large</body></html>", { status: 413 }));
    expect(err.message).toBe("That file is too big to upload. The limit is 10 MB.");
  });

  it("never shows HTML error pages", async () => {
    const err = await errorFor(new Response("<html><body>502 Bad Gateway</body></html>", { status: 502 }));
    expect(err.message).toBe("Something went wrong on our side. Please try again in a moment.");
  });

  it("uses a JSON body's message when there is one", async () => {
    const err = await errorFor(new Response(JSON.stringify({ status: 409, message: "Already exists" }), { status: 409 }));
    expect(err.message).toBe("Already exists");
  });

  it("falls back to a plain message for Spring's default error body", async () => {
    const err = await errorFor(
      new Response(JSON.stringify({ timestamp: "x", status: 404, error: "Not Found", path: "/api/x" }), { status: 404 }),
    );
    expect(err.message).toBe("That item couldn't be found. It may have been deleted.");
  });

  it("falls back for empty and overly long bodies", async () => {
    expect((await errorFor(new Response("", { status: 400 }))).message).toBe("Something went wrong. Please try again.");
    expect((await errorFor(new Response("x".repeat(500), { status: 403 }))).message).toBe(
      "You don't have permission to do that.",
    );
  });
});

describe("api.login", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    window.history.pushState({}, "", "/");
  });

  it("does not redirect to the landing page on invalid credentials", async () => {
    window.history.pushState({}, "", "/student/login");
    signIn("STUDENT", "existing-token", "student");

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Invalid username or password", { status: 401, statusText: "Unauthorized" }),
    );

    await expect(api.login("student", "STUDENT", "wrongpass")).rejects.toThrow(
      /^Invalid username or password$/,
    );

    expect(window.location.pathname).toBe("/student/login");
    expect(api.getCurrentUser("STUDENT")).toEqual({ username: "student", role: "STUDENT" });
  });
});

describe("api.createStudentAccount", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    window.history.pushState({}, "", "/");
  });

  it("does not redirect to landing on a forbidden response", async () => {
    window.history.pushState({}, "", "/staff/students");
    signIn("STAFF", "staff-token", "head.teacher");

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Forbidden", { status: 403, statusText: "Forbidden" }),
    );

    await expect(api.createStudentAccount("year10", "fred")).rejects.toThrow(/^Forbidden$/);

    expect(window.location.pathname).toBe("/staff/students");
    expect(api.getCurrentUser("STAFF")).toEqual({ username: "head.teacher", role: "STAFF" });
  });
});

