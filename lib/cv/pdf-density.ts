import type { CvDraft } from "@/lib/cv/types";

export type CvDensityProfileId = "relaxed" | "balanced" | "dense";

export type CvDensityProfile = {
  bodyFontSize: number;
  bulletFontSize: number;
  itemGap: number;
  lineHeight: number;
  sectionGap: number;
  sidebarFontSize: number;
  skillFontSize: number;
  titleFontSize: number;
  id: CvDensityProfileId;
};

export function getCvDensityProfile(draft: CvDraft): CvDensityProfile {
  const score = getMainColumnDensityScore(draft);

  if (score < 2200) {
    return densityProfiles.relaxed;
  }

  if (score > 5200) {
    return densityProfiles.dense;
  }

  return densityProfiles.balanced;
}

export function getMainColumnDensityScore(draft: CvDraft) {
  const experienceCharacters = draft.experience.reduce(
    (sum, item) =>
      sum +
      item.role.length +
      item.company.length +
      item.period.length +
      item.bullets.join(" ").length +
      item.bullets.length * 70,
    0,
  );

  return experienceCharacters + draft.experience.length * 180;
}

const densityProfiles: Record<CvDensityProfileId, CvDensityProfile> = {
  relaxed: {
    id: "relaxed",
    bodyFontSize: 8.55,
    bulletFontSize: 8.35,
    itemGap: 14,
    lineHeight: 1.42,
    sectionGap: 16,
    sidebarFontSize: 7.75,
    skillFontSize: 7.1,
    titleFontSize: 10.1,
  },
  balanced: {
    id: "balanced",
    bodyFontSize: 8.25,
    bulletFontSize: 8.1,
    itemGap: 12,
    lineHeight: 1.38,
    sectionGap: 14,
    sidebarFontSize: 7.45,
    skillFontSize: 6.9,
    titleFontSize: 9.8,
  },
  dense: {
    id: "dense",
    bodyFontSize: 7.25,
    bulletFontSize: 7.15,
    itemGap: 8,
    lineHeight: 1.26,
    sectionGap: 11,
    sidebarFontSize: 6.85,
    skillFontSize: 6.35,
    titleFontSize: 8.75,
  },
};
