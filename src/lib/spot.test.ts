import { describe, expect, it } from "vitest";

import { normalizePlay } from "@/lib/espn";
import { saneCoordinate } from "@/lib/spot";

describe("court spot", () => {
  it("keeps a shot that the feed actually placed", () => {
    expect(saneCoordinate({ x: 9, y: 23 })).toEqual({ x: 9, y: 23 });
    expect(saneCoordinate({ x: 25, y: 0 })).toEqual({ x: 25, y: 0 });
  });

  it("drops the empty sentinel and anything off the half court", () => {
    expect(saneCoordinate({ x: -214748340, y: -214748365 })).toBeUndefined();
    expect(saneCoordinate({ x: -1, y: 10 })).toBeUndefined();
    expect(saneCoordinate({ x: 12, y: 80 })).toBeUndefined();
    expect(saneCoordinate(undefined)).toBeUndefined();
    expect(saneCoordinate({ x: Number.NaN, y: 4 })).toBeUndefined();
  });

  it("does not attach a coordinate the feed did not give", () => {
    const play = normalizePlay({
      id: "9",
      text: "76ers Full timeout",
      type: { text: "Full Timeout" },
      coordinate: { x: -214748340, y: -214748365 },
    });
    expect(play?.coordinate).toBeUndefined();

    const shot = normalizePlay({
      id: "10",
      text: "makes a three",
      type: { text: "Jump Shot" },
      coordinate: { x: 9, y: 23 },
    });
    expect(shot?.coordinate).toEqual({ x: 9, y: 23 });
  });
});
