import { describe, expect, it } from "vitest";
import { createStablePointId } from "@/lib/qdrant";

describe("qdrant helpers", () => {
  it("creates deterministic uuid-like point ids for chunk ids", () => {
    const pointId = createStablePointId("candidate-profile-chunk-1");

    expect(pointId).toBe(createStablePointId("candidate-profile-chunk-1"));
    expect(pointId).not.toBe(createStablePointId("candidate-profile-chunk-2"));
    expect(pointId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});
