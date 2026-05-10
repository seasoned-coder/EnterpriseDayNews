import { useState } from "react";

// Thresholds — tune these if needed
const THRESHOLDS = {
  Porn: 0.50,
  Hentai: 0.50,
  Sexy: 0.70,
};

// Singleton so the ~30 MB model file is only fetched once per session
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let modelPromise: Promise<any> | null = null;

function getModel() {
  if (!modelPromise) {
    // Dynamic import keeps the huge tfjs bundle out of the initial chunk
    modelPromise = Promise.all([
      import("@tensorflow/tfjs"),
      import("nsfwjs"),
    ]).then(([, nsfwjs]) => nsfwjs.load());
  }
  return modelPromise;
}

export type NsfwScanStatus = "idle" | "scanning" | "clean" | "flagged";

export function useNsfwCheck() {
  const [scanStatus, setScanStatus] = useState<NsfwScanStatus>("idle");

  async function scanFile(file: File): Promise<NsfwScanStatus> {
    // ── DEV-ONLY shortcut ────────────────────────────────────────────────────
    // Rename any innocent photo to include "__flag__" in the filename
    // (e.g. "my_selfie__flag__.jpg") to simulate a rejected image without
    // needing real inappropriate content. Stripped out in production builds.
    if (import.meta.env.DEV && file.name.includes("__flag__")) {
      setScanStatus("flagged");
      return "flagged";
    }
    // ────────────────────────────────────────────────────────────────────────

    // Non-image files (video, PDF) pass through — no model for those
    if (!file.type.startsWith("image/")) {
      setScanStatus("clean");
      return "clean";
    }

    setScanStatus("scanning");
    let objectUrl: string | null = null;

    try {
      const model = await getModel();

      objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.src = objectUrl;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Could not load image for scan"));
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const predictions: { className: string; probability: number }[] =
        await model.classify(img);

      const isFlagged = predictions.some(({ className, probability }) => {
        const threshold = THRESHOLDS[className as keyof typeof THRESHOLDS];
        return threshold !== undefined && probability >= threshold;
      });

      const result: NsfwScanStatus = isFlagged ? "flagged" : "clean";
      setScanStatus(result);
      return result;
    } catch (err) {
      // If the scan itself fails, fail open so a network hiccup doesn't block
      // legitimate uploads — the staff review step still acts as backstop.
      console.warn("[nsfwjs] scan error, failing open:", err);
      setScanStatus("clean");
      return "clean";
    } finally {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    }
  }

  function resetScan() {
    setScanStatus("idle");
  }

  return { scanStatus, scanFile, resetScan };
}


