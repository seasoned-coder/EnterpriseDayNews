import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";

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
      "Request failed [401]: Invalid username or password",
    );

    expect(window.location.pathname).toBe("/student/login");
    expect(localStorage.getItem("token")).toBe("existing-token");
    expect(localStorage.getItem("user")).toBe(JSON.stringify({ username: "student", role: "STUDENT" }));
  });
});

