import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "@/lib/api";

describe("api.studentDeleteMyUpload", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("sends DELETE to the student upload endpoint with auth header", async () => {
    localStorage.setItem("token", "test-token");

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
    localStorage.setItem("token", "existing-token");
    localStorage.setItem("user", JSON.stringify({ username: "student", role: "STUDENT" }));

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Invalid username or password", { status: 401, statusText: "Unauthorized" }),
    );

    await expect(api.login("student", "STUDENT", "wrongpass")).rejects.toThrow(
      /^Invalid username or password$/,
    );

    expect(window.location.pathname).toBe("/student/login");
    expect(localStorage.getItem("token")).toBe("existing-token");
    expect(localStorage.getItem("user")).toBe(JSON.stringify({ username: "student", role: "STUDENT" }));
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
    localStorage.setItem("token", "staff-token");
    localStorage.setItem("user", JSON.stringify({ username: "staff1", role: "STAFF" }));

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Forbidden", { status: 403, statusText: "Forbidden" }),
    );

    await expect(api.createStudentAccount("year10", "fred", "staff1")).rejects.toThrow(/^Forbidden$/);

    expect(window.location.pathname).toBe("/staff/students");
    expect(localStorage.getItem("token")).toBe("staff-token");
    expect(localStorage.getItem("user")).toBe(JSON.stringify({ username: "staff1", role: "STAFF" }));
  });
});

