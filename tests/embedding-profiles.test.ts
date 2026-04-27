import { describe, expect, it } from "vitest";
import {
  defaultEmbeddingProfileId,
  getEmbeddingProfile,
  getEmbeddingProfileOptions,
} from "@/lib/embedding-profiles";

describe("embedding profiles", () => {
  it("provides balanced and large embedding options", () => {
    const profiles = getEmbeddingProfileOptions();

    expect(profiles.map((profile) => profile.id)).toEqual(["balanced", "large"]);
    expect(getEmbeddingProfile("balanced")).toMatchObject({
      model: "text-embedding-3-small",
      dimensions: 1536,
    });
    expect(getEmbeddingProfile("large")).toMatchObject({
      model: "text-embedding-3-large",
      dimensions: 3072,
    });
  });

  it("falls back to the default profile for unknown values", () => {
    expect(defaultEmbeddingProfileId).toBe("balanced");
    expect(getEmbeddingProfile("unknown")).toEqual(getEmbeddingProfile("balanced"));
  });
});
