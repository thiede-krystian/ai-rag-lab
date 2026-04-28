import type { CvTemplateId } from "@/lib/cv/types";

export const DEFAULT_CV_TEMPLATE: CvTemplateId = "three-column-a4";

export const cvTemplateOptions: Array<{ label: string; value: CvTemplateId }> = [
  { value: "three-column-a4", label: "3-column A4" },
  { value: "classic-a4", label: "Classic A4" },
];

export function normalizeCvTemplateId(value: unknown): CvTemplateId {
  if (value === "classic-a4") {
    return "classic-a4";
  }

  return DEFAULT_CV_TEMPLATE;
}
