import { describe, expect, it } from "vitest";
import {
  appAddress,
  studentLoginUrl,
  studentPortalAddress,
  teamNamesFromList,
  teamNamesFromPattern,
  toUsername,
  wifiQrText,
} from "@/lib/loginSlips";

describe("teamNamesFromPattern", () => {
  it("numbers the teams with padding so they sort and line up", () => {
    expect(teamNamesFromPattern("team", 3)).toEqual(["team01", "team02", "team03"]);
    expect(teamNamesFromPattern("Year 9 team", 2, 9)).toEqual(["year-9-team09", "year-9-team10"]);
  });

  it("pads to the widest number", () => {
    expect(teamNamesFromPattern("t", 100).at(-1)).toBe("t100");
    expect(teamNamesFromPattern("t", 100)[0]).toBe("t001");
  });

  it("never makes more than 200 or fewer than none", () => {
    expect(teamNamesFromPattern("t", 500)).toHaveLength(200);
    expect(teamNamesFromPattern("t", -3)).toEqual([]);
  });
});

describe("teamNamesFromList", () => {
  it("turns company names into usernames, one per line or comma", () => {
    expect(teamNamesFromList("Rocket Lemonade\n  Pixel Pals!,\n\nByte  Bakery ")).toEqual([
      "rocket-lemonade",
      "pixel-pals",
      "byte-bakery",
    ]);
  });
});

describe("toUsername", () => {
  it("keeps only characters a username may have", () => {
    expect(toUsername(" Sock It! ")).toBe("sock-it");
    expect(toUsername("Café Crème")).toBe("caf-crme");
    expect(toUsername("a.b_c-d")).toBe("a.b_c-d");
  });
});

describe("addresses", () => {
  it("uses the saved address, or else where the staff page is open", () => {
    expect(appAddress({ wifiName: null, wifiPassword: null, appAddress: "http://192.168.1.10/" }, "http://localhost:3000"))
      .toBe("http://192.168.1.10");
    expect(appAddress(undefined, "http://192.168.1.10")).toBe("http://192.168.1.10");
  });

  it("points the QR code at sign-in with the team filled in", () => {
    expect(studentLoginUrl("http://192.168.1.10", "rocket lemonade")).toBe(
      "http://192.168.1.10/student/login?team=rocket%20lemonade",
    );
    expect(studentPortalAddress("http://192.168.1.10")).toBe("192.168.1.10/student");
  });
});

describe("wifiQrText", () => {
  it("makes a join-Wi-Fi code, escaping special characters", () => {
    expect(wifiQrText({ wifiName: "Enterprise;Day", wifiPassword: 'pa:ss"1', appAddress: null })).toBe(
      'WIFI:T:WPA;S:Enterprise\\;Day;P:pa\\:ss\\"1;;',
    );
  });

  it("handles an open network and no network", () => {
    expect(wifiQrText({ wifiName: "Open", wifiPassword: "", appAddress: null })).toBe("WIFI:T:nopass;S:Open;;");
    expect(wifiQrText({ wifiName: " ", wifiPassword: "x", appAddress: null })).toBeNull();
    expect(wifiQrText(undefined)).toBeNull();
  });
});
