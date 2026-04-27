export type SourceType = "cv" | "job" | "knowledge";

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

export type EvalRun = {
  id: string;
  promptVersion: PromptVersion;
  model: string;
  recallAt5: number;
  mrr: number;
  averageLatencyMs: number;
  passRate: number;
};
