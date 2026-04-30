import { NextResponse } from "next/server";
import { z } from "zod";
import { createChatCompletion } from "@/lib/ai/chat";
import { normalizeCvDraft } from "@/lib/cv/draft";
import {
  buildCvParseMessages,
  buildCvParseRepairMessages,
  CV_CLASSIFIER_PARSER,
  parseCvDraftJson,
} from "@/lib/cv/prompts";
import type { CvDraft } from "@/lib/cv/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({
  text: z.string().min(20, "CV text is required for AI parsing."),
  currentDraft: z.unknown().optional(),
});

export async function POST(request: Request) {
  try {
    const payload = requestSchema.parse(await request.json());
    const currentDraft = payload.currentDraft ? normalizeCvDraft(payload.currentDraft) : undefined;
    const completion = await createChatCompletion(
      buildCvParseMessages({
        text: payload.text,
        currentDraft,
      }),
      { temperature: 0.1 },
    );
    const parsed = await parseDraftJsonWithRepair(completion.content, completion.model);
    const draft = normalizeCvDraft(parsed.draft);
    const warnings = [
      ...parsed.warnings,
      ...getQualityWarnings({
        currentDraft,
        draft,
        text: payload.text,
      }),
    ];

    return NextResponse.json({
      draft,
      model: parsed.model,
      parser: CV_CLASSIFIER_PARSER,
      quality: getQuality(draft),
      warnings,
    });
  } catch (error) {
    return jsonError(error);
  }
}

async function parseDraftJsonWithRepair(content: string, model: string) {
  try {
    return {
      draft: parseCvDraftJson(content),
      model,
      warnings: [] as string[],
    };
  } catch {
    const repairCompletion = await createChatCompletion(
      buildCvParseRepairMessages({
        invalidContent: content,
      }),
      { temperature: 0 },
    );

    return {
      draft: parseCvDraftJson(repairCompletion.content),
      model: repairCompletion.model,
      warnings: ["Initial AI response was invalid JSON and was repaired."],
    };
  }
}

function getQuality(draft: CvDraft) {
  return {
    experienceCount: draft.experience.length,
    projectCount: draft.projects.length,
    educationCount: draft.education.length,
    detectedSecondHeadline: Boolean(draft.personal.secondHeadline),
  };
}

function getQualityWarnings({
  currentDraft,
  draft,
  text,
}: {
  currentDraft?: CvDraft;
  draft: CvDraft;
  text: string;
}) {
  const warnings: string[] = [];
  const normalizedText = text.toLowerCase();

  if (currentDraft && draft.experience.length < currentDraft.experience.length) {
    warnings.push("AI draft has fewer experience items than the local parser draft.");
  }

  if (normalizedText.includes("experience") && draft.experience.length === 0) {
    warnings.push("Raw CV text mentions experience, but the AI draft has no experience items.");
  }

  if (currentDraft?.personal.secondHeadline && !draft.personal.secondHeadline) {
    warnings.push("Local parser found a second headline, but the AI draft did not include one.");
  }

  return warnings;
}

function jsonError(error: unknown) {
  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid CV parse request." }, { status: 400 });
  }

  if (error instanceof SyntaxError || (error instanceof Error && error.message.includes("invalid CV JSON"))) {
    return NextResponse.json({ error: "AI parser returned invalid CV JSON." }, { status: 502 });
  }

  console.error("[api/cv/parse-ai] failed", error);

  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Unknown AI parse error" },
    { status: 500 },
  );
}
