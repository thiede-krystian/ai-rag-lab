export type SourceType = "cv" | "job" | "knowledge";

export type ImportMode = "append" | "replace";

export type PromptVersion = "rag_v1" | "rag_strict_v2" | "match_score_v1";

export type DocumentInput = {
  id?: string;
  title: string;
  sourceType: SourceType;
  content: string;
  tags?: string[];
};

export type ChunkRecord = {
  id: string;
  documentId: string;
  title: string;
  text: string;
  chunkIndex: number;
  sourceType: SourceType;
  tags: string[];
};

export type IndexedDocument = {
  title: string;
  sourceType: SourceType;
  chunks: number;
  tags: string[];
};

export type SearchRequest = {
  query: string;
  topK: number;
  filters?: {
    sourceType?: SourceType;
    tags?: string[];
  };
};

export type SearchResult = {
  id: string;
  score: number;
  text: string;
  title: string;
  sourceType: SourceType;
  chunkIndex: number;
};

export type ChatRequest = {
  question: string;
  topK: number;
  promptVersion: PromptVersion;
};

export type ChatResponse = {
  answer: string;
  citations: SearchResult[];
  retrievedChunks: SearchResult[];
  model: string;
  latencyMs: number;
};

export type MatchResponse = {
  cvTitle: string;
  jobTitle: string;
  score: number;
  summary: string;
  strengths: string[];
  gaps: string[];
  evidence: string[];
  model: string;
  latencyMs: number;
};

export type QuickEvalRun = {
  id: string;
  targetTitle: string;
  sourceType?: SourceType;
  model: string;
  recallAtK: number;
  mrr: number;
  averageLatencyMs: number;
  passRate: number;
  cases: QuickEvalCaseResult[];
};

export type QuickEvalCaseResult = {
  id: string;
  query: string;
  expectedTitle: string;
  retrievedTitles: string[];
  foundExpected: boolean;
  firstRelevantRank: number | null;
  reciprocalRank: number;
  latencyMs: number;
};
