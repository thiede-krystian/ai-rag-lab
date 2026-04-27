import { NextResponse } from "next/server";
import { listIndexedDocuments } from "@/lib/qdrant";

export const runtime = "nodejs";

export async function GET() {
  try {
    const documents = await listIndexedDocuments();

    return NextResponse.json({
      documents,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown document inventory error";

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 },
    );
  }
}
