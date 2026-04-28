export async function readApiResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }

  const text = await response.text();

  throw new Error(formatUnexpectedApiResponse(response, text));
}

function formatUnexpectedApiResponse(response: Response, text: string) {
  const statusText = response.statusText || "Unexpected API response";
  const preview = text.replace(/\s+/g, " ").trim();
  const isHtml = /^<!doctype html|^<html/i.test(preview);
  const body = isHtml
    ? "Server returned an HTML error page instead of JSON."
    : preview.slice(0, 220) || "Response body was empty.";

  return `HTTP ${response.status} ${statusText}: ${body}`;
}
