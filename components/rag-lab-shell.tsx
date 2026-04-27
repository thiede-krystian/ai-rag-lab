"use client";

import {
  ActionIcon,
  Alert,
  AppShell,
  Badge,
  Button,
  Card,
  Code,
  Container,
  Divider,
  Group,
  JsonInput,
  NumberInput,
  Paper,
  Progress,
  Select,
  Stack,
  Table,
  Tabs,
  Text,
  Textarea,
  Title,
  Tooltip,
  useComputedColorScheme,
  useMantineColorScheme,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  Bot,
  Database,
  FileText,
  Gauge,
  Moon,
  Play,
  Search,
  Sparkles,
  Sun,
  UploadCloud,
} from "lucide-react";
import { useState } from "react";
import { chunkDocuments, createDocumentId } from "@/lib/chunking";
import { seedDocuments } from "@/lib/seed-documents";
import type { ChatResponse, MatchResponse, PromptVersion, SearchResult, SourceType } from "@/lib/types";

const seedChunks = chunkDocuments(seedDocuments);
const candidateChunk = seedChunks.find((chunk) => chunk.sourceType === "cv");
const roleChunk = seedChunks.find((chunk) => chunk.sourceType === "job");

const indexedDocuments = seedDocuments.map((document, index) => ({
  title: document.title,
  type: getSourceTypeLabel(document.sourceType),
  chunks: seedChunks.filter((chunk) => chunk.documentId === createDocumentId(document, index)).length,
  status: "Seeded",
}));

const initialSearchResults: SearchResult[] = [
  {
    id: candidateChunk?.id ?? "candidate-profile-chunk-1",
    title: candidateChunk?.title ?? "Candidate profile",
    chunkIndex: candidateChunk?.chunkIndex ?? 0,
    sourceType: candidateChunk?.sourceType ?? "cv",
    score: 0.91,
    text:
      candidateChunk?.text ??
      "Daily work with Next.js, Node.js, TypeScript, AI coding tools, and LLM-driven product workflows.",
  },
  {
    id: roleChunk?.id ?? "ai-engineer-role-chunk-1",
    title: roleChunk?.title ?? "AI Engineer role",
    chunkIndex: roleChunk?.chunkIndex ?? 0,
    sourceType: roleChunk?.sourceType ?? "job",
    score: 0.87,
    text:
      roleChunk?.text ??
      "The position focuses on embeddings, prompt engineering, semantic search, and RAG-based AI features.",
  },
];

const evalRows = [
  { prompt: "rag_v1", recall: "0.78", mrr: "0.68", latency: "1.9s", passRate: 76 },
  { prompt: "rag_strict_v2", recall: "0.84", mrr: "0.74", latency: "2.2s", passRate: 84 },
];

export function RagLabShell() {
  return (
    <AppShell header={{ height: 72 }} padding="md">
      <AppShell.Header>
        <Container size="xl" h="100%">
          <Group h="100%" justify="space-between">
            <Group gap="sm">
              <Database size={28} strokeWidth={1.8} />
              <div>
                <Title order={2} size="h3">
                  AI RAG Lab
                </Title>
                <Text size="sm" c="dimmed">
                  Next.js, Node.js, Mantine, Qdrant, OpenRouter
                </Text>
              </div>
            </Group>
            <Group gap="xs" visibleFrom="sm">
              <Badge variant="light" color="teal">
                Local Qdrant
              </Badge>
              <Badge variant="light" color="blue">
                OpenRouter embeddings
              </Badge>
              <Badge variant="light" color="violet">
                OpenRouter chat
              </Badge>
            </Group>
            <ColorSchemeToggle />
          </Group>
        </Container>
      </AppShell.Header>

      <AppShell.Main>
        <Container size="xl">
          <Tabs defaultValue="documents" keepMounted={false}>
            <Tabs.List mb="md">
              <Tabs.Tab value="documents" leftSection={<FileText size={16} />}>
                Documents
              </Tabs.Tab>
              <Tabs.Tab value="search" leftSection={<Search size={16} />}>
                Semantic Search
              </Tabs.Tab>
              <Tabs.Tab value="chat" leftSection={<Bot size={16} />}>
                RAG Chat
              </Tabs.Tab>
              <Tabs.Tab value="evals" leftSection={<Gauge size={16} />}>
                Evals
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="documents">
              <DocumentsPanel />
            </Tabs.Panel>
            <Tabs.Panel value="search">
              <SearchPanel />
            </Tabs.Panel>
            <Tabs.Panel value="chat">
              <ChatPanel />
            </Tabs.Panel>
            <Tabs.Panel value="evals">
              <EvalsPanel />
            </Tabs.Panel>
          </Tabs>
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}

function ColorSchemeToggle() {
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme("light", {
    getInitialValueInEffect: true,
  });
  const nextColorScheme = computedColorScheme === "light" ? "dark" : "light";
  const Icon = computedColorScheme === "light" ? Moon : Sun;

  return (
    <Tooltip label={`Switch to ${nextColorScheme} mode`}>
      <ActionIcon
        aria-label={`Switch to ${nextColorScheme} mode`}
        variant="light"
        size="lg"
        onClick={() => setColorScheme(nextColorScheme)}
      >
        <Icon size={18} />
      </ActionIcon>
    </Tooltip>
  );
}

function DocumentsPanel() {
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestSummary, setIngestSummary] = useState<string | null>(null);

  async function handleSeedDocuments() {
    setIsIngesting(true);

    try {
      const response = await fetch("/api/ingest", {
        method: "POST",
      });
      const payload = (await response.json()) as IngestResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not ingest seed documents.");
      }

      const summary = `${payload.upserted} chunks indexed from ${payload.documents} documents`;
      setIngestSummary(summary);
      notifications.show({
        title: "Seed corpus indexed",
        message: summary,
        color: "green",
      });
    } catch (error) {
      notifications.show({
        title: "Ingestion failed",
        message: getErrorMessage(error),
        color: "red",
      });
    } finally {
      setIsIngesting(false);
    }
  }

  return (
    <Stack gap="md">
      <Group align="stretch" grow>
        <MetricCard label="Documents" value={String(seedDocuments.length)} detail="seed corpus" />
        <MetricCard label="Chunks" value={String(seedChunks.length)} detail="ready to index" />
        <MetricCard label="Vector collection" value="ai_rag_lab_documents" detail="Qdrant" />
      </Group>

      <Card withBorder radius="md" padding="lg">
        <Stack gap="md">
          <Group justify="space-between">
            <Title order={3} size="h4">
              Corpus
            </Title>
            <Group>
              <Button
                leftSection={<Sparkles size={16} />}
                loading={isIngesting}
                onClick={handleSeedDocuments}
                variant="light"
              >
                Seed documents
              </Button>
              <Button disabled leftSection={<UploadCloud size={16} />}>
                Import text
              </Button>
            </Group>
          </Group>
          {ingestSummary ? (
            <Alert color="green" variant="light">
              {ingestSummary}
            </Alert>
          ) : null}
          <Table.ScrollContainer minWidth={640}>
            <Table verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Document</Table.Th>
                  <Table.Th>Type</Table.Th>
                  <Table.Th>Chunks</Table.Th>
                  <Table.Th>Status</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {indexedDocuments.map((document) => (
                  <Table.Tr key={document.title}>
                    <Table.Td>{document.title}</Table.Td>
                    <Table.Td>
                      <Badge variant="light">{document.type}</Badge>
                    </Table.Td>
                    <Table.Td>{document.chunks}</Table.Td>
                    <Table.Td>
                      <Badge color="green" variant="light">
                        {document.status}
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Stack>
      </Card>
    </Stack>
  );
}

function SearchPanel() {
  const [query, setQuery] = useState(
    "AI engineer with RAG, vector search, Next.js and TypeScript experience",
  );
  const [topK, setTopK] = useState<number | string>(5);
  const [results, setResults] = useState<SearchResult[]>(initialSearchResults);
  const [isSearching, setIsSearching] = useState(false);

  async function handleSearch() {
    setIsSearching(true);

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          topK: getNumericTopK(topK),
        }),
      });
      const payload = (await response.json()) as SearchResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not search indexed documents.");
      }

      setResults(payload.results);
      notifications.show({
        title: "Search complete",
        message: `${payload.results.length} chunks returned from Qdrant`,
        color: "green",
      });
    } catch (error) {
      notifications.show({
        title: "Search failed",
        message: getErrorMessage(error),
        color: "red",
      });
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <Stack gap="md">
      <Card withBorder radius="md" padding="lg">
        <Stack gap="md">
          <Group align="flex-end">
            <Textarea
              label="Query"
              autosize
              minRows={2}
              onChange={(event) => setQuery(event.currentTarget.value)}
              value={query}
              style={{ flex: 1 }}
            />
            <NumberInput label="TopK" min={1} max={20} onChange={setTopK} value={topK} w={110} />
            <Button leftSection={<Search size={16} />} loading={isSearching} onClick={handleSearch}>
              Search
            </Button>
          </Group>
          <Divider />
          <Stack gap="sm">
            {results.map((result) => (
              <Paper key={result.id} withBorder radius="md" p="md">
                <Group justify="space-between" align="flex-start">
                  <div>
                    <Group gap="xs">
                      <Text fw={600}>{result.title}</Text>
                      <Badge variant="light">{getSourceTypeLabel(result.sourceType)}</Badge>
                      <Badge variant="light">chunk {result.chunkIndex + 1}</Badge>
                    </Group>
                    <Text size="sm" c="dimmed" mt={6}>
                      {result.text}
                    </Text>
                  </div>
                  <Code>{result.score.toFixed(2)}</Code>
                </Group>
              </Paper>
            ))}
          </Stack>
        </Stack>
      </Card>
    </Stack>
  );
}

function ChatPanel() {
  const [question, setQuestion] = useState("How well does this candidate match the AI Engineer role?");
  const [promptVersion, setPromptVersion] = useState<PromptVersion>("rag_strict_v2");
  const [topK, setTopK] = useState<number | string>(5);
  const [chatResponse, setChatResponse] = useState<ChatResponse | null>(null);
  const [matchResponse, setMatchResponse] = useState<MatchResponse | null>(null);
  const [isAsking, setIsAsking] = useState(false);
  const [isScoring, setIsScoring] = useState(false);

  async function handleAsk() {
    setIsAsking(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question,
          topK: getNumericTopK(topK),
          promptVersion,
        }),
      });
      const payload = (await response.json()) as ChatApiResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not generate a RAG answer.");
      }

      setChatResponse(payload);
      notifications.show({
        title: "RAG answer generated",
        message: `${payload.retrievedChunks.length} context chunks used`,
        color: "green",
      });
    } catch (error) {
      notifications.show({
        title: "RAG chat failed",
        message: getErrorMessage(error),
        color: "red",
      });
    } finally {
      setIsAsking(false);
    }
  }

  async function handleScoreMatch() {
    setIsScoring(true);

    try {
      const response = await fetch("/api/match", {
        method: "POST",
      });
      const payload = (await response.json()) as MatchApiResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not score CV-job match.");
      }

      setMatchResponse(payload);
      notifications.show({
        title: "Match score generated",
        message: `${payload.score}/100`,
        color: "green",
      });
    } catch (error) {
      notifications.show({
        title: "Match scoring failed",
        message: getErrorMessage(error),
        color: "red",
      });
    } finally {
      setIsScoring(false);
    }
  }

  return (
    <Stack gap="md">
      <Card withBorder radius="md" padding="lg">
        <Stack gap="md">
          <Group align="flex-end">
            <Textarea
              label="Question"
              autosize
              minRows={2}
              onChange={(event) => setQuestion(event.currentTarget.value)}
              value={question}
              style={{ flex: 1 }}
            />
            <Select
              label="Prompt"
              onChange={(value) => setPromptVersion((value as PromptVersion | null) ?? "rag_strict_v2")}
              value={promptVersion}
              data={["rag_v1", "rag_strict_v2", "match_score_v1"]}
              w={190}
            />
            <NumberInput label="TopK" min={1} max={20} onChange={setTopK} value={topK} w={110} />
            <Button leftSection={<Bot size={16} />} loading={isAsking} onClick={handleAsk}>
              Ask
            </Button>
            <Button loading={isScoring} onClick={handleScoreMatch} variant="light">
              Score match
            </Button>
          </Group>
          <Alert color="blue" variant="light" title={chatResponse ? "RAG answer" : "Answer preview"}>
            {chatResponse?.answer ??
              "Match score: 84/100. The candidate is a strong match for Next.js, TypeScript, Node.js, AI developer tooling, semantic search, and RAG workflows. Sources: Candidate profile chunk 7, AI Engineer role chunk 3."}
          </Alert>
          {chatResponse ? (
            <Group gap="xs">
              <Badge variant="light" color="violet">
                {chatResponse.model}
              </Badge>
              <Badge variant="light" color="gray">
                {chatResponse.latencyMs} ms
              </Badge>
              <Badge variant="light" color="blue">
                {chatResponse.retrievedChunks.length} chunks
              </Badge>
            </Group>
          ) : null}
          {matchResponse ? <MatchScoreResult result={matchResponse} /> : null}
          <JsonInput
            label="Retrieved context"
            autosize
            minRows={7}
            value={JSON.stringify(chatResponse?.retrievedChunks ?? initialSearchResults, null, 2)}
            readOnly
          />
        </Stack>
      </Card>
    </Stack>
  );
}

function MatchScoreResult({ result }: { result: MatchResponse }) {
  return (
    <Alert color="teal" variant="light" title={`CV-job match: ${result.score}/100`}>
      <Stack gap="sm">
        <Progress value={result.score} color={getScoreColor(result.score)} />
        <Text size="sm">{result.summary}</Text>
        <Table.ScrollContainer minWidth={560}>
          <Table verticalSpacing="xs">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Strengths</Table.Th>
                <Table.Th>Gaps</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {zipLists(result.strengths, result.gaps).map((row, index) => (
                <Table.Tr key={`${row.strength}-${row.gap}-${index}`}>
                  <Table.Td>{row.strength}</Table.Td>
                  <Table.Td>{row.gap}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
        <Group gap="xs">
          <Badge variant="light" color="violet">
            {result.model}
          </Badge>
          <Badge variant="light" color="gray">
            {result.latencyMs} ms
          </Badge>
        </Group>
      </Stack>
    </Alert>
  );
}

function EvalsPanel() {
  return (
    <Stack gap="md">
      <Card withBorder radius="md" padding="lg">
        <Stack gap="md">
          <Group justify="space-between">
            <Title order={3} size="h4">
              Prompt comparison
            </Title>
            <Button leftSection={<Play size={16} />}>Run evals</Button>
          </Group>
          <Table.ScrollContainer minWidth={640}>
            <Table verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Prompt</Table.Th>
                  <Table.Th>Recall@5</Table.Th>
                  <Table.Th>MRR</Table.Th>
                  <Table.Th>Latency</Table.Th>
                  <Table.Th>Pass rate</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {evalRows.map((row) => (
                  <Table.Tr key={row.prompt}>
                    <Table.Td>
                      <Code>{row.prompt}</Code>
                    </Table.Td>
                    <Table.Td>{row.recall}</Table.Td>
                    <Table.Td>{row.mrr}</Table.Td>
                    <Table.Td>{row.latency}</Table.Td>
                    <Table.Td>
                      <Group gap="sm">
                        <Progress value={row.passRate} w={110} />
                        <Text size="sm">{row.passRate}%</Text>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Stack>
      </Card>
    </Stack>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <Card withBorder radius="md" padding="lg">
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text fw={700} size="xl" mt={4}>
        {value}
      </Text>
      <Text size="sm" c="dimmed" mt={2}>
        {detail}
      </Text>
    </Card>
  );
}

function getSourceTypeLabel(sourceType: SourceType) {
  const labels: Record<SourceType, string> = {
    cv: "CV",
    job: "Job",
    knowledge: "Knowledge",
  };

  return labels[sourceType];
}

type IngestResponse = {
  documents: number;
  chunks: number;
  upserted: number;
  error?: string;
};

type SearchResponse = {
  results: SearchResult[];
  error?: string;
};

type ChatApiResponse = ChatResponse & {
  error?: string;
};

type MatchApiResponse = MatchResponse & {
  error?: string;
};

function getNumericTopK(value: number | string) {
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed)) {
    return 5;
  }

  return Math.min(Math.max(Math.trunc(parsed), 1), 20);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

function getScoreColor(score: number) {
  if (score >= 80) {
    return "green";
  }

  if (score >= 60) {
    return "yellow";
  }

  return "red";
}

function zipLists(left: string[], right: string[]) {
  const maxLength = Math.max(left.length, right.length, 1);

  return Array.from({ length: maxLength }, (_, index) => ({
    strength: left[index] ?? "",
    gap: right[index] ?? "",
  }));
}
