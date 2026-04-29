import { NextResponse } from "next/server";
import { z } from "zod";
import { parseLinkedInFile, parseLinkedInText } from "@/lib/cv/linkedin/parser";

export const runtime = "nodejs";
export const maxDuration = 60;

const jsonSchema = z.object({
  text: z.string().trim().min(20, "LinkedIn profile text is required."),
});

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");
      const text = formData.get("text");

      if (file instanceof File && file.size > 0) {
        const result = await parseLinkedInFile(await file.arrayBuffer(), file.name);

        return NextResponse.json(result);
      }

      if (typeof text === "string" && text.trim()) {
        return NextResponse.json(parseLinkedInText(text));
      }

      return NextResponse.json({ error: "Provide a LinkedIn ZIP/CSV file or pasted profile text." }, { status: 400 });
    }

    let json: unknown;

    try {
      json = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Provide a LinkedIn ZIP/CSV file or pasted profile text." },
        { status: 400 },
      );
    }

    const payload = jsonSchema.parse(json);

    return NextResponse.json(parseLinkedInText(payload.text));
  } catch (error) {
    return jsonError(error);
  }
}

function jsonError(error: unknown) {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: error.issues[0]?.message ?? "Invalid LinkedIn import request." },
      { status: 400 },
    );
  }

  if (error instanceof Error && error.message.includes("Only LinkedIn ZIP or CSV")) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  console.error("[api/cv/linkedin/import] failed", error);

  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Unknown LinkedIn import error" },
    { status: 500 },
  );
}
