import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/cv/export/pdf/route";

const mocks = vi.hoisted(() => ({
  renderCvPdf: vi.fn(),
}));

vi.mock("@/lib/cv/pdf-renderer", () => ({
  renderCvPdf: mocks.renderCvPdf,
}));

describe("CV PDF export API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.renderCvPdf.mockResolvedValue(Buffer.from("%PDF-1.4"));
  });

  it("returns a classic PDF attachment", async () => {
    const response = await POST(
      createJsonRequest({
        template: "classic-a4",
        draft: {
          personal: { name: "Krystian Thiede", headline: "AI Engineer" },
          summary: "Builds AI products.",
        },
      }),
    );
    const payload = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toContain("krystian-thiede-classic-a4.pdf");
    expect(payload).toBe("%PDF-1.4");
    expect(mocks.renderCvPdf).toHaveBeenCalledWith(expect.any(Object), "classic-a4");
  });

  it("supports the 3-column template", async () => {
    const response = await POST(
      createJsonRequest({
        template: "three-column-a4",
        draft: {
          personal: { name: "Krystian Thiede", headline: "AI Engineer" },
          summary: "Builds AI products.",
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toContain("krystian-thiede-three-column-a4.pdf");
    expect(mocks.renderCvPdf).toHaveBeenCalledWith(expect.any(Object), "three-column-a4");
  });

  it("rejects removed 3-column template ids", async () => {
    const response = await POST(
      createJsonRequest({
        template: "polished-three-column-a4",
        draft: {
          personal: { name: "Krystian Thiede", headline: "AI Engineer" },
          summary: "Builds AI products.",
        },
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe("Invalid PDF export request.");
    expect(mocks.renderCvPdf).not.toHaveBeenCalled();
  });

  it("rejects empty drafts", async () => {
    const response = await POST(createJsonRequest({ template: "classic-a4", draft: {} }));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe("CV draft does not contain exportable content.");
    expect(mocks.renderCvPdf).not.toHaveBeenCalled();
  });
});

function createJsonRequest(body: unknown) {
  return new Request("http://localhost:3000/api/cv/export/pdf", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}
