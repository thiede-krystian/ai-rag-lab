import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/match/route";
import type { ChunkRecord } from "@/lib/types";

const mocks = vi.hoisted(() => ({
  createChatCompletion: vi.fn(),
  getDocumentChunks: vi.fn(),
}));

vi.mock("@/lib/ai/chat", () => ({
  createChatCompletion: mocks.createChatCompletion,
}));

vi.mock("@/lib/qdrant", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/qdrant")>();

  return {
    ...actual,
    getDocumentChunks: mocks.getDocumentChunks,
  };
});

const cvChunks: ChunkRecord[] = [
  {
    id: "cv-chunk-1",
    documentId: "cv",
    title: "Imported CV",
    text: "Candidate has RAG, embeddings, evals, Next.js, Node.js, and TypeScript experience.",
    chunkIndex: 0,
    sourceType: "cv",
    tags: ["pdf"],
  },
];

const jobChunks: ChunkRecord[] = [
  {
    id: "job-chunk-1",
    documentId: "job",
    title: "AI Engineer Role",
    text: "Role requires RAG, vector search, prompting, evals, Node.js, Next.js, and TypeScript.",
    chunkIndex: 0,
    sourceType: "job",
    tags: ["job"],
  },
];

describe("match scoring API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDocumentChunks.mockImplementation(
      async ({ sourceType }: { title: string; sourceType: string }) =>
        sourceType === "cv" ? cvChunks : jobChunks,
    );
    mocks.createChatCompletion
      .mockResolvedValueOnce({
        model: "openrouter-test-model",
        content: JSON.stringify({
          roleTitle: "AI Engineer",
          seniority: "Senior",
          mustHave: [
            {
              label: "RAG systems",
              category: "must-have",
              importance: "high",
              evidence: ["Role requires RAG."],
            },
            {
              label: "TypeScript",
              category: "must-have",
              importance: "high",
              evidence: ["Role requires TypeScript."],
            },
          ],
          niceToHave: [
            {
              label: "Evaluation pipelines",
              category: "nice-to-have",
              importance: "medium",
              evidence: ["Role mentions evals."],
            },
          ],
          domainContext: [],
        }),
      })
      .mockResolvedValueOnce({
        model: "openrouter-test-model",
        content: JSON.stringify({
          score: 88,
          summary: "Strong job-specific match.",
          strengths: ["RAG", "TypeScript"],
          gaps: ["Production eval automation"],
          evidence: ["CV and role both mention RAG."],
          requirementMatches: [
            {
              requirement: "RAG systems",
              category: "must-have",
              status: "strong",
              evidence: ["Candidate has RAG experience."],
            },
            {
              requirement: "Evaluation pipelines",
              category: "nice-to-have",
              status: "partial",
              evidence: ["Candidate mentions evals."],
            },
          ],
        }),
      });
  });

  it("requires selected CV and Job titles", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/match", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cvTitle: "",
          jobTitle: "AI Engineer Role",
        }),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("Too small");
    expect(mocks.getDocumentChunks).not.toHaveBeenCalled();
    expect(mocks.createChatCompletion).not.toHaveBeenCalled();
  });

  it("scores a selected CV against a selected job from Qdrant", async () => {
    const response = await POST(createMatchRequest());
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      cvTitle: "Imported CV",
      jobTitle: "AI Engineer Role",
      score: 88,
      summary: "Strong job-specific match.",
      strengths: ["RAG", "TypeScript"],
      gaps: ["Production eval automation"],
      model: "openrouter-test-model",
      rubric: {
        roleTitle: "AI Engineer",
        seniority: "Senior",
        mustHave: [
          {
            label: "RAG systems",
            category: "must-have",
            importance: "high",
            evidence: ["Role requires RAG."],
          },
          {
            label: "TypeScript",
            category: "must-have",
            importance: "high",
            evidence: ["Role requires TypeScript."],
          },
        ],
      },
      requirementMatches: [
        {
          requirement: "RAG systems",
          category: "must-have",
          status: "strong",
          evidence: ["Candidate has RAG experience."],
        },
        {
          requirement: "Evaluation pipelines",
          category: "nice-to-have",
          status: "partial",
          evidence: ["Candidate mentions evals."],
        },
      ],
    });
    expect(mocks.getDocumentChunks).toHaveBeenCalledWith({
      title: "Imported CV",
      sourceType: "cv",
    });
    expect(mocks.getDocumentChunks).toHaveBeenCalledWith({
      title: "AI Engineer Role",
      sourceType: "job",
    });
    expect(mocks.createChatCompletion).toHaveBeenCalledTimes(2);
    expect(mocks.createChatCompletion.mock.calls[0]?.[0][0]?.content).toContain(
      "job-specific scoring rubric",
    );
    expect(mocks.createChatCompletion.mock.calls[1]?.[0][0]?.content).toContain(
      "Do not use a generic AI Engineer checklist",
    );
    expect(mocks.createChatCompletion.mock.calls[1]?.[0][0]?.content).not.toContain(
      "AI engineering, embeddings, vector search",
    );
  });

  it("returns 400 when the selected CV has no indexed chunks", async () => {
    mocks.getDocumentChunks.mockImplementationOnce(async () => []);

    const response = await POST(createMatchRequest());
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("No indexed CV document found");
    expect(mocks.createChatCompletion).not.toHaveBeenCalled();
  });
});

function createMatchRequest() {
  return new Request("http://localhost:3000/api/match", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      cvTitle: "Imported CV",
      jobTitle: "AI Engineer Role",
    }),
  });
}
