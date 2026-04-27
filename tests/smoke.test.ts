import { describe, expect, it } from "vitest";

describe("project scaffold", () => {
  it("runs the initial test harness", () => {
    expect("ai-rag-lab").toContain("rag");
  });
});
