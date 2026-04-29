import { NextResponse } from "next/server";
import { z } from "zod";
import { compareCvWithLinkedIn } from "@/lib/cv/linkedin/diff";

export const runtime = "nodejs";

const requestSchema = z.object({
  draft: z.unknown(),
  profile: z.unknown(),
});

export async function POST(request: Request) {
  try {
    const payload = requestSchema.parse(await request.json());

    return NextResponse.json(compareCvWithLinkedIn(payload.draft, payload.profile));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid LinkedIn compare request." },
        { status: 400 },
      );
    }

    console.error("[api/cv/linkedin/compare] failed", error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown LinkedIn compare error" },
      { status: 500 },
    );
  }
}
