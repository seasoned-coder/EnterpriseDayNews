import { beforeEach, describe, expect, it, vi } from "vitest";
import { adoptProjectorKey, MAX_QUEUE, projectorKey, queueShowing, sendShowings, unsentShowings } from "@/lib/playRecorder";

const showing = (imageId: number, seconds = 10) => ({ imageId, seconds, playedAt: "2026-10-03T10:00:00Z" });
const fakeLocation = (hash: string) => ({ hash, pathname: "/projector", search: "" }) as Location;
const fakeHistory = () => ({ replaceState: vi.fn() }) as unknown as History;
const reply = (status: number) => vi.fn().mockResolvedValue(new Response("{}", { status }));

describe("playRecorder (issue #40)", () => {
  beforeEach(() => localStorage.clear());

  it("takes the key from the address and then hides it", () => {
    const history = fakeHistory();

    expect(adoptProjectorKey(fakeLocation("#key=abc.def"), history)).toBe("abc.def");
    expect(history.replaceState).toHaveBeenCalledWith(null, "", "/projector");
    // Opened again later without the key: it remembers it.
    expect(adoptProjectorKey(fakeLocation(""), fakeHistory())).toBe("abc.def");
  });

  it("doesn't record anything without a key", () => {
    queueShowing(showing(1));
    expect(unsentShowings()).toEqual([]);
  });

  it("queues showings and sends them with the key", async () => {
    adoptProjectorKey(fakeLocation("#key=k1"), fakeHistory());
    queueShowing(showing(1));
    queueShowing(showing(2, 0)); // not really shown: ignored
    queueShowing(showing(3));
    const fetchImpl = reply(200);

    expect(await sendShowings(fetchImpl)).toBe(2);

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("/api/projector/plays");
    expect(init.headers.Authorization).toBe("Bearer k1");
    expect(JSON.parse(init.body).map((s: { imageId: number }) => s.imageId)).toEqual([1, 3]);
    expect(unsentShowings()).toEqual([]);
  });

  it("keeps showings while offline and sends them later", async () => {
    adoptProjectorKey(fakeLocation("#key=k1"), fakeHistory());
    queueShowing(showing(1));

    expect(await sendShowings(vi.fn().mockRejectedValue(new TypeError("Failed to fetch")))).toBe(0);
    expect(await sendShowings(reply(502))).toBe(0);
    expect(unsentShowings()).toHaveLength(1);

    expect(await sendShowings(reply(200))).toBe(1);
  });

  it("stops recording if the key is refused (e.g. the staff member was locked)", async () => {
    adoptProjectorKey(fakeLocation("#key=old"), fakeHistory());
    queueShowing(showing(1));

    await sendShowings(reply(401));

    expect(projectorKey()).toBeNull();
    expect(unsentShowings()).toEqual([]);
  });

  it("never keeps more than the limit", () => {
    adoptProjectorKey(fakeLocation("#key=k1"), fakeHistory());
    for (let i = 0; i < MAX_QUEUE + 5; i++) queueShowing(showing(i));

    expect(unsentShowings()).toHaveLength(MAX_QUEUE);
    expect(unsentShowings()[0].imageId).toBe(5); // oldest dropped first
  });
});
