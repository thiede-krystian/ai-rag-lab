import type { EvalCase, EvalCaseResult, EvalRun, PromptVersion, SearchResult } from "@/lib/types";

export function evaluateRetrievedChunks({
  evalCase,
  results,
  latencyMs,
}: {
  evalCase: EvalCase;
  results: SearchResult[];
  latencyMs: number;
}): EvalCaseResult {
  const retrievedChunkIds = results.map((result) => result.id);
  const firstRelevantIndex = retrievedChunkIds.findIndex((id) =>
    evalCase.expectedChunkIds.includes(id),
  );
  const firstRelevantRank = firstRelevantIndex === -1 ? null : firstRelevantIndex + 1;

  return {
    id: evalCase.id,
    query: evalCase.query,
    expectedChunkIds: evalCase.expectedChunkIds,
    retrievedChunkIds,
    foundExpected: firstRelevantRank !== null,
    firstRelevantRank,
    reciprocalRank: firstRelevantRank ? 1 / firstRelevantRank : 0,
    latencyMs,
  };
}

export function summarizeEvalRun({
  cases,
  promptVersion,
  model,
}: {
  cases: EvalCaseResult[];
  promptVersion: PromptVersion;
  model: string;
}): EvalRun {
  return {
    id: `${promptVersion}-${Date.now()}`,
    promptVersion,
    model,
    recallAt5: average(cases.map((result) => (result.foundExpected ? 1 : 0))),
    mrr: average(cases.map((result) => result.reciprocalRank)),
    averageLatencyMs: average(cases.map((result) => result.latencyMs)),
    passRate: average(cases.map((result) => (result.foundExpected ? 100 : 0))),
    cases,
  };
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
