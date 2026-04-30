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
        personal: {
          name: "Krystian Thiede",
          headline: "AI Engineer",
          secondHeadline: "RAG and vector search",
        },
        skills: ["RAG", "TypeScript"],
        experience: [{ role: "AI Engineer", company: "Product Lab", period: "2024 - now", bullets: [] }],
      }),
      model: "openrouter/test",
    });
  });

  it("returns normalized draft from model JSON", async () => {
    const response = await POST(createJsonRequest({ text: "Krystian Thiede AI Engineer with RAG and TypeScript" }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.model).toBe("openrouter/test");
    expect(payload.parser).toBe("openrouter-cv-classifier-v2");
    expect(payload.quality).toMatchObject({
      detectedSecondHeadline: true,
      experienceCount: 1,
    });
    expect(payload.draft.personal.name).toBe("Krystian Thiede");
    expect(payload.draft.personal.secondHeadline).toBe("RAG and vector search");
    expect(payload.draft.skills).toContain("TypeScript");
  });

  it("repairs malformed model JSON once", async () => {
    mocks.createChatCompletion.mockResolvedValueOnce({
      content: "not json",
      model: "openrouter/test",
    });
    mocks.createChatCompletion.mockResolvedValueOnce({
      content: JSON.stringify({
        personal: { name: "Krystian Thiede", headline: "AI Engineer" },
        skills: ["RAG"],
      }),
      model: "openrouter/test",
    });

    const response = await POST(createJsonRequest({ text: "Krystian Thiede AI Engineer with RAG and TypeScript" }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.warnings).toContain("Initial AI response was invalid JSON and was repaired.");
    expect(mocks.createChatCompletion).toHaveBeenCalledTimes(2);
  });

  it("rejects malformed model JSON when repair fails", async () => {
    mocks.createChatCompletion.mockResolvedValue({
      content: "not json",
      model: "openrouter/test",
    });

    const response = await POST(createJsonRequest({ text: "Krystian Thiede AI Engineer with RAG and TypeScript" }));
    const payload = await response.json();

    expect(response.status).toBe(502);
    expect(payload.error).toBe("AI parser returned invalid CV JSON.");
  });

  it("uses the strict CV classifier prompt", async () => {
    await POST(createJsonRequest({ text: "Krystian Thiede AI Engineer with RAG and TypeScript" }));

    const messages = mocks.createChatCompletion.mock.calls[0]?.[0];
    const systemPrompt = messages?.[0]?.content ?? "";

    expect(systemPrompt).toContain("openrouter-cv-classifier-v2");
    expect(systemPrompt).toContain("secondHeadline");
    expect(systemPrompt).toContain("Preserve every role, employer, project, and education entry");
    expect(systemPrompt).toContain("Put spoken or natural languages");
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
