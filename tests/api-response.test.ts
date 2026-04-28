import { describe, expect, it } from "vitest";
import { readApiResponse } from "@/lib/api-response";

describe("readApiResponse", () => {
  it("reads JSON API responses", async () => {
    const response = Response.json({ ok: true });

    await expect(readApiResponse(response)).resolves.toEqual({ ok: true });
  });

  it("explains HTML platform errors instead of leaking JSON parse errors", async () => {
    const response = new Response("<!DOCTYPE html><html><body>Function error</body></html>", {
      headers: {
        "content-type": "text/html; charset=utf-8",
      },
      status: 500,
      statusText: "Internal Server Error",
    });

    await expect(readApiResponse(response)).rejects.toThrow(
      "HTTP 500 Internal Server Error: Server returned an HTML error page instead of JSON.",
    );
  });

  it("includes a short preview for non-HTML unexpected responses", async () => {
    const response = new Response("plain text failure", {
      headers: {
        "content-type": "text/plain",
      },
      status: 502,
      statusText: "Bad Gateway",
    });

    await expect(readApiResponse(response)).rejects.toThrow(
      "HTTP 502 Bad Gateway: plain text failure",
    );
  });
});
