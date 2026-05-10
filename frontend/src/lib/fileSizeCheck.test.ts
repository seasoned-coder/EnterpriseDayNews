import { describe, it, expect } from "vitest";
import { checkFileSize, FILE_SIZE_LIMITS } from "@/lib/fileSizeCheck";
const MB = 1024 * 1024;
function makeFile(sizeBytes: number, type = "image/jpeg", name = "photo.jpg"): File {
  return new File([new ArrayBuffer(sizeBytes)], name, { type });
}
describe("checkFileSize", () => {
  describe("too-large (> 25 MB)", () => {
    it("flags a file 1 byte over the limit", () => {
      expect(checkFileSize(makeFile(FILE_SIZE_LIMITS.maxMb * MB + 1))).toBe("too-large");
    });
    it("flags a 30 MB file", () => {
      expect(checkFileSize(makeFile(30 * MB))).toBe("too-large");
    });
    it("does not flag a file exactly at 25 MB", () => {
      expect(checkFileSize(makeFile(25 * MB))).not.toBe("too-large");
    });
  });
  describe("too-small (< 3 MB, images only)", () => {
    it("warns for a 1 MB JPEG", () => {
      expect(checkFileSize(makeFile(1 * MB, "image/jpeg"))).toBe("too-small");
    });
    it("warns for a 2.9 MB PNG", () => {
      expect(checkFileSize(makeFile(2.9 * MB, "image/png"))).toBe("too-small");
    });
    it("does not warn for a small video", () => {
      expect(checkFileSize(makeFile(1 * MB, "video/mp4", "clip.mp4"))).toBe("ok");
    });
    it("does not warn for a small PDF", () => {
      expect(checkFileSize(makeFile(0.5 * MB, "application/pdf", "doc.pdf"))).toBe("ok");
    });
    it("does not warn for an image exactly at 3 MB", () => {
      expect(checkFileSize(makeFile(3 * MB, "image/jpeg"))).not.toBe("too-small");
    });
  });
  describe("ok (3-25 MB)", () => {
    it("accepts a 5 MB JPEG", () => {
      expect(checkFileSize(makeFile(5 * MB, "image/jpeg"))).toBe("ok");
    });
    it("accepts a 15 MB JPEG", () => {
      expect(checkFileSize(makeFile(15 * MB, "image/jpeg"))).toBe("ok");
    });
    it("accepts a 25 MB video", () => {
      expect(checkFileSize(makeFile(25 * MB, "video/mp4", "clip.mp4"))).toBe("ok");
    });
    it("accepts a 1 MB video (non-image skips lower bound)", () => {
      expect(checkFileSize(makeFile(1 * MB, "video/mp4", "clip.mp4"))).toBe("ok");
    });
  });
});
