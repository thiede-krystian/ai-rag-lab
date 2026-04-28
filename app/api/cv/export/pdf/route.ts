import { NextResponse } from "next/server";
import { z } from "zod";
import { hasCvContent, normalizeCvDraft } from "@/lib/cv/draft";
import { renderCvPdf } from "@/lib/cv/pdf-renderer";
import { DEFAULT_CV_TEMPLATE } from "@/lib/cv/templates";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({
  draft: z.unknown(),
  template: z.enum(["classic-a4", "three-column-a4"]).default(DEFAULT_CV_TEMPLATE),
});

export async function POST(request: Request) {
  try {
    const payload = requestSchema.parse(await request.json());
    const draft = normalizeCvDraft(payload.draft);

    if (!hasCvContent(draft)) {
      return NextResponse.json({ error: "CV draft does not contain exportable content." }, { status: 400 });
    }

    const pdf = await renderCvPdf(draft, payload.template);

    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Disposition": `attachment; filename="${getPdfFilename(draft.personal.name, payload.template)}"`,
        "Content-Type": "application/pdf",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

function getPdfFilename(name: string, template: string) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `${slug || "cv"}-${template}.pdf`;
}

function jsonError(error: unknown) {
  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: "Invalid PDF export request." }, { status: 400 });
  }

  console.error("[api/cv/export/pdf] failed", error);

  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Unknown PDF export error" },
    { status: 500 },
  );
}
