import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/cv/parse-ai/route";

const mocks = vi.hoisted(() => ({
  createChatCompletion: vi.fn(),
}));

vi.mock("@/lib/ai/chat", () => ({
  createChatCompletion: mocks.createChatCompletion,
}));

describe("CV AI parse API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createChatCompletion.mockResolvedValue({
      content: JSON.stringify({
        personal: { name: "Krystian Thiede", headline: "AI Engineer" },
        skills: ["RAG", "TypeScript"],
      }),
      model: "openrouter/test",
    });
  });

  it("returns normalized draft from model JSON", async () => {
    const response = await POST(createJsonRequest({ text: "Krystian Thiede AI Engineer with RAG and TypeScript" }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.model).toBe("openrouter/test");
    expect(payload.draft.personal.name).toBe("Krystian Thiede");
    expect(payload.draft.skills).toContain("TypeScript");
  });

  it("rejects malformed model JSON", async () => {
    mocks.createChatCompletion.mockResolvedValueOnce({
      content: "not json",
      model: "openrouter/test",
    });

    const response = await POST(createJsonRequest({ text: "Krystian Thiede AI Engineer with RAG and TypeScript" }));
    const payload = await response.json();

    expect(response.status).toBe(502);
    expect(payload.error).toBe("AI parser returned invalid CV JSON.");
  });
});

function createJsonRequest(body: unknown) {
  return new Request("http://localhost:3000/api/cv/parse-ai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}
