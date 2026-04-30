import type { CvDraft, CvEducationItem, CvExperienceItem, CvProjectItem } from "@/lib/cv/types";

type PeriodRange = {
  end: number;
  start: number;
};

const currentPeriodScore = 9999 * 12 + 12;
const monthPattern =
  "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";
const datePattern = new RegExp(
  `(?:(${monthPattern})\\.?\\s*)?((?:19|20)\\d{2})(?:\\s*(${monthPattern})\\.?)?`,
  "gi",
);

export function orderCvDraftForExport(draft: CvDraft): CvDraft {
  return {
    ...draft,
    education: sortByNewestPeriod(draft.education.filter(isIncludedInExport), getEducationPeriodText),
    experience: sortByNewestPeriod(draft.experience.filter(isIncludedInExport), getExperiencePeriodText),
    projects: sortByNewestPeriod(draft.projects.filter(isIncludedInExport), getProjectPeriodText),
  };
}

export function parseCvPeriodRange(value: string): PeriodRange | null {
  const text = value.trim();

  if (!text) {
    return null;
  }

  const dates = [...text.matchAll(datePattern)].map((match) => {
    const month = getMonthNumber(match[1] || match[3]);
    const year = Number(match[2]);

    return {
      month,
      scoreWithEndDefault: toDateScore(year, month ?? 12),
      scoreWithStartDefault: toDateScore(year, month ?? 1),
    };
  });

  if (dates.length === 0) {
    return null;
  }

  const hasCurrentEnd = /\b(now|present|current|today)\b/i.test(text);
  const firstDate = dates[0];
  const lastDate = dates[dates.length - 1];

  return {
    start: firstDate.scoreWithStartDefault,
    end: hasCurrentEnd ? currentPeriodScore : lastDate.scoreWithEndDefault,
  };
}

function sortByNewestPeriod<T>(items: T[], getPeriodText: (item: T) => string) {
  return items
    .map((item, index) => ({
      index,
      item,
      period: parseCvPeriodRange(getPeriodText(item)),
    }))
    .sort((left, right) => {
      if (!left.period && !right.period) {
        return left.index - right.index;
      }

      if (left.period && !right.period) {
        return -1;
      }

      if (!left.period && right.period) {
        return 1;
      }

      return (
        (right.period?.end ?? 0) - (left.period?.end ?? 0) ||
        (right.period?.start ?? 0) - (left.period?.start ?? 0) ||
        left.index - right.index
      );
    })
    .map(({ item }) => item);
}

function isIncludedInExport(item: { includeInExport?: boolean }) {
  return item.includeInExport !== false;
}

function getExperiencePeriodText(item: CvExperienceItem) {
  return item.period;
}

function getEducationPeriodText(item: CvEducationItem) {
  return [item.period, item.details].filter(Boolean).join(" ");
}

function getProjectPeriodText(item: CvProjectItem) {
  return [item.description, item.name, item.technologies.join(" ")].filter(Boolean).join(" ");
}

function toDateScore(year: number, month: number) {
  return year * 12 + month;
}

function getMonthNumber(value: string | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.toLowerCase().replace(/\.$/, "");

  if (normalized.startsWith("jan")) return 1;
  if (normalized.startsWith("feb")) return 2;
  if (normalized.startsWith("mar")) return 3;
  if (normalized.startsWith("apr")) return 4;
  if (normalized === "may") return 5;
  if (normalized.startsWith("jun")) return 6;
  if (normalized.startsWith("jul")) return 7;
  if (normalized.startsWith("aug")) return 8;
  if (normalized.startsWith("sep")) return 9;
  if (normalized.startsWith("oct")) return 10;
  if (normalized.startsWith("nov")) return 11;
  if (normalized.startsWith("dec")) return 12;

  return null;
}
