import type {
  QuickEvalCaseResult,
  QuickEvalQueryType,
  QuickEvalRun,
  SearchResult,
  SourceType,
} from "@/lib/types";

export const defaultQuickEvalMinimumScore = 0.45;

export function evaluateTargetTitleRetrieval({
  id,
  minimumScore = defaultQuickEvalMinimumScore,
  query,
  queryType = "positive",
  expectedTitle,
  results,
  latencyMs,
}: {
  id: string;
  minimumScore?: number;
  query: string;
  queryType?: QuickEvalQueryType;
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
  const expectedResults = results.filter((result) => normalizeTitle(result.title) === normalizedExpectedTitle);
  const bestExpectedScore =
    expectedResults.length > 0 ? Math.max(...expectedResults.map((result) => result.score)) : null;
  const foundExpected = firstRelevantRank !== null;
  const meetsScoreThreshold = typeof bestExpectedScore === "number" && bestExpectedScore >= minimumScore;
  const passed =
    queryType === "positive" ? foundExpected && meetsScoreThreshold : !foundExpected || !meetsScoreThreshold;
  const expectedBehavior =
    queryType === "positive"
      ? `Expected document should appear in TopK with score >= ${minimumScore.toFixed(2)}.`
      : `Expected document should be absent or score below ${minimumScore.toFixed(2)}.`;

  return {
    bestExpectedScore,
    expectedBehavior,
    id,
    query,
    queryType,
    expectedTitle,
    retrievedTitles,
    foundExpected,
    firstRelevantRank,
    reciprocalRank: queryType === "positive" && passed && firstRelevantRank ? 1 / firstRelevantRank : 0,
    passed,
    failureReason: getFailureReason({
      bestExpectedScore,
      foundExpected,
      minimumScore,
      queryType,
    }),
    latencyMs,
  };
}

export function summarizeQuickEvalRun({
  cases,
  minimumScore = defaultQuickEvalMinimumScore,
  targetTitle,
  sourceType,
  model,
}: {
  cases: QuickEvalCaseResult[];
  minimumScore?: number;
  targetTitle: string;
  sourceType?: SourceType;
  model: string;
}): QuickEvalRun {
  const positiveCases = cases.filter((result) => result.queryType === "positive");
  const negativeCases = cases.filter((result) => result.queryType === "negative");

  return {
    id: `quick-${Date.now()}`,
    targetTitle,
    sourceType,
    model,
    minimumScore,
    recallAtK: average(positiveCases.map((result) => (result.passed ? 1 : 0))),
    mrr: average(positiveCases.map((result) => result.reciprocalRank)),
    averageLatencyMs: average(cases.map((result) => result.latencyMs)),
    passRate: average(cases.map((result) => (result.passed ? 100 : 0))),
    positivePassRate: average(positiveCases.map((result) => (result.passed ? 100 : 0))),
    negativePassRate: average(negativeCases.map((result) => (result.passed ? 100 : 0))),
    warnings: getEvalWarnings({ negativeCases, positiveCases }),
    cases,
  };
}

function getFailureReason({
  bestExpectedScore,
  foundExpected,
  minimumScore,
  queryType,
}: {
  bestExpectedScore: number | null;
  foundExpected: boolean;
  minimumScore: number;
  queryType: QuickEvalQueryType;
}) {
  if (queryType === "positive") {
    if (!foundExpected) {
      return "Expected document was not retrieved in TopK.";
    }

    if (typeof bestExpectedScore === "number" && bestExpectedScore < minimumScore) {
      return `Best expected-document score ${bestExpectedScore.toFixed(3)} is below threshold ${minimumScore.toFixed(2)}.`;
    }

    return undefined;
  }

  if (typeof bestExpectedScore === "number" && bestExpectedScore >= minimumScore) {
    return `Negative query matched expected document with score ${bestExpectedScore.toFixed(3)}.`;
  }

  return undefined;
}

function getEvalWarnings({
  negativeCases,
  positiveCases,
}: {
  negativeCases: QuickEvalCaseResult[];
  positiveCases: QuickEvalCaseResult[];
}) {
  const warnings = [];

  if (positiveCases.length === 0) {
    warnings.push("No positive queries were provided, so Recall@K and MRR are not meaningful.");
  }

  if (negativeCases.length === 0) {
    warnings.push("No negative queries were provided, so this run does not test false positives.");
  }

  return warnings;
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
