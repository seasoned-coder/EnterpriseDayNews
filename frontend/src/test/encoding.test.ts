import { describe, expect, it } from "vitest";

// Every source file's text, as the build sees it.
const sources = import.meta.glob("/src/**/*.{ts,tsx,css}", { query: "?raw", import: "default", eager: true }) as Record<
  string,
  string
>;

// What "…", "·", "–", "’" and friends turn into when a UTF-8 file is read as Windows-1252 and saved again
// (e.g. Windows PowerShell's Get-Content/Set-Content), which showed up on the projector as "Loading the feedâ€¦".
const MOJIBAKE = /â€|Â·|Â |Ã©|Ã¨/;

describe("source file encoding", () => {
  it("has no garbled characters", () => {
    const garbled = Object.entries(sources)
      .filter(([path, text]) => !path.endsWith("encoding.test.ts") && MOJIBAKE.test(text))
      .map(([path]) => path);

    expect(garbled).toEqual([]);
  });

  it("actually checked the source files", () => {
    expect(Object.keys(sources).length).toBeGreaterThan(20);
  });
});
