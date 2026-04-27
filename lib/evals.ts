import type {
  QuickEvalCaseResult,
  QuickEvalRun,
  SearchResult,
  SourceType,
} from "@/lib/types";

export function evaluateTargetTitleRetrieval({
  id,
  query,
  expectedTitle,
  results,
  latencyMs,
}: {
  id: string;
  query: string;
  expectedTitle: string;
  results: SearchResult[];
  latencyMs: number;
}): QuickEvalCaseResult {
  const normalizedExpectedTitle = normalizeTitle(expectedTitle);
  const retrievedTitles = results.map((result) => result.title);
  const firstRelevantIndex = retrievedTitles.findIndex(
    (title) => normalizeTitle(title) === normalizedExpectedTitle,
  );
  const firstRelevantRank = firstRelevantIndex === -1 ? null : firstRelevantIndex + 1;

  return {
    id,
    query,
    expectedTitle,
    retrievedTitles,
    foundExpected: firstRelevantRank !== null,
    firstRelevantRank,
    reciprocalRank: firstRelevantRank ? 1 / firstRelevantRank : 0,
    latencyMs,
  };
}

export function summarizeQuickEvalRun({
  cases,
  targetTitle,
  sourceType,
  model,
}: {
  cases: QuickEvalCaseResult[];
  targetTitle: string;
  sourceType?: SourceType;
  model: string;
}): QuickEvalRun {
  return {
    id: `quick-${Date.now()}`,
    targetTitle,
    sourceType,
    model,
    recallAtK: average(cases.map((result) => (result.foundExpected ? 1 : 0))),
    mrr: average(cases.map((result) => result.reciprocalRank)),
    averageLatencyMs: average(cases.map((result) => result.latencyMs)),
    passRate: average(cases.map((result) => (result.foundExpected ? 100 : 0))),
    cases,
  };
}

function normalizeTitle(title: string) {
  return title.trim().toLowerCase();
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
