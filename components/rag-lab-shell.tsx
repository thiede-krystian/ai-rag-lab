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
  FileInput,
  Group,
  JsonInput,
  Modal,
  NumberInput,
  Paper,
  Progress,
  Radio,
  Select,
  Stack,
  Table,
  Tabs,
  TagsInput,
  Text,
  TextInput,
  Textarea,
  Title,
  Tooltip,
  useComputedColorScheme,
  useMantineColorScheme,
} from "@mantine/core";
import { useMounted } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  Bot,
  Database,
  FileText,
  Gauge,
  ListChecks,
  Moon,
  Play,
  RefreshCw,
  Search,
  Sparkles,
  Sun,
  UploadCloud,
} from "lucide-react";
import { useState } from "react";
import { chunkDocuments, createDocumentId } from "@/lib/chunking";
import {
  defaultEmbeddingProfileId,
  getEmbeddingProfileOptions,
  type EmbeddingProfileId,
} from "@/lib/embedding-profiles";
import { seedDocuments } from "@/lib/seed-documents";
import type {
  ChatResponse,
  EvalRun,
  ImportMode,
  MatchResponse,
  PromptVersion,
  SearchResult,
  SourceType,
} from "@/lib/types";

const seedChunks = chunkDocuments(seedDocuments);
const candidateChunk = seedChunks.find((chunk) => chunk.sourceType === "cv");
const roleChunk = seedChunks.find((chunk) => chunk.sourceType === "job");

type DocumentRow = {
  title: string;
  type: string;
  chunks: number;
  status: string;
  statusColor: string;
};

const indexedDocuments: DocumentRow[] = seedDocuments.map((document, index) => ({
  title: document.title,
  type: getSourceTypeLabel(document.sourceType),
  chunks: seedChunks.filter((chunk) => chunk.documentId === createDocumentId(document, index)).length,
  status: "Seeded",
  statusColor: "green",
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

const initialEvalRuns: EvalRun[] = [
  {
    id: "rag_v1-preview",
    promptVersion: "rag_v1",
    model: "preview",
    recallAt5: 0.78,
    mrr: 0.68,
    averageLatencyMs: 1900,
    passRate: 76,
    cases: [],
  },
  {
    id: "rag_strict_v2-preview",
    promptVersion: "rag_strict_v2",
    model: "preview",
    recallAt5: 0.84,
    mrr: 0.74,
    averageLatencyMs: 2200,
    passRate: 84,
    cases: [],
  },
];

const embeddingProfileOptions = getEmbeddingProfileOptions();
const embeddingProfileSelectData = embeddingProfileOptions.map((profile) => ({
  value: profile.id,
  label: `${profile.label} (${profile.dimensions})`,
}));

const sourceTypeSelectData = [
  { value: "cv", label: "CV" },
  { value: "job", label: "Job" },
  { value: "knowledge", label: "Knowledge" },
];

export function RagLabShell() {
  const [embeddingProfile, setEmbeddingProfile] =
    useState<EmbeddingProfileId>(defaultEmbeddingProfileId);

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
              <DocumentsPanel
                embeddingProfile={embeddingProfile}
                onEmbeddingProfileChange={setEmbeddingProfile}
              />
            </Tabs.Panel>
            <Tabs.Panel value="search">
              <SearchPanel embeddingProfile={embeddingProfile} />
            </Tabs.Panel>
            <Tabs.Panel value="chat">
              <ChatPanel embeddingProfile={embeddingProfile} />
            </Tabs.Panel>
            <Tabs.Panel value="evals">
              <EvalsPanel embeddingProfile={embeddingProfile} />
            </Tabs.Panel>
          </Tabs>
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}

function ColorSchemeToggle() {
  const { setColorScheme } = useMantineColorScheme();
  const isMounted = useMounted();
  const computedColorScheme = useComputedColorScheme("light", {
    getInitialValueInEffect: true,
  });
  const visibleColorScheme = isMounted ? computedColorScheme : "light";
  const nextColorScheme = visibleColorScheme === "light" ? "dark" : "light";
  const Icon = visibleColorScheme === "light" ? Moon : Sun;

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

function DocumentsPanel({
  embeddingProfile,
  onEmbeddingProfileChange,
}: {
  embeddingProfile: EmbeddingProfileId;
  onEmbeddingProfileChange: (profile: EmbeddingProfileId) => void;
}) {
  const [isIngesting, setIsIngesting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [ingestSummary, setIngestSummary] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<ImportResponse | null>(null);
  const [documentRows, setDocumentRows] = useState<DocumentRow[]>(indexedDocuments);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importTitle, setImportTitle] = useState("");
  const [importSourceType, setImportSourceType] = useState<SourceType>("cv");
  const [importTags, setImportTags] = useState<string[]>(["pdf"]);
  const [importMode, setImportMode] = useState<ImportMode>("append");
  const selectedProfile = embeddingProfileOptions.find((profile) => profile.id === embeddingProfile);
  const documentChunkCount = documentRows.reduce((sum, row) => sum + row.chunks, 0);

  async function handleSeedDocuments() {
    setIsIngesting(true);

    try {
      const response = await fetch("/api/ingest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          embeddingProfile,
          resetCollection: true,
        }),
      });
      const payload = (await response.json()) as IngestResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not ingest seed documents.");
      }

      const summary = `${payload.upserted} chunks indexed from ${payload.documents} documents with ${payload.model} (${payload.dimensions}d)`;
      setIngestSummary(summary);
      setImportSummary(null);
      setDocumentRows(indexedDocuments);
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

  async function handleResetCollection() {
    setIsResetting(true);

    try {
      const response = await fetch("/api/collection/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          embeddingProfile,
        }),
      });
      const payload = (await response.json()) as ResetCollectionResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not reset Qdrant collection.");
      }

      setIngestSummary(
        `${payload.collection} reset for ${payload.model} (${payload.dimensions}d). Seed documents before searching.`,
      );
      setImportSummary(null);
      setDocumentRows([]);
      notifications.show({
        title: "Qdrant collection reset",
        message: `${payload.collection} recreated with ${payload.dimensions} dimensions`,
        color: "green",
      });
    } catch (error) {
      notifications.show({
        title: "Collection reset failed",
        message: getErrorMessage(error),
        color: "red",
      });
    } finally {
      setIsResetting(false);
    }
  }

  function handleImportFileChange(file: File | null) {
    setImportFile(file);

    if (file && !importTitle.trim()) {
      setImportTitle(getTitleFromFilename(file.name));
    }
  }

  async function handleImportDocument() {
    if (!importFile) {
      notifications.show({
        title: "Import failed",
        message: "Choose a PDF file first.",
        color: "red",
      });
      return;
    }

    setIsImporting(true);

    try {
      const formData = new FormData();
      formData.append("file", importFile);
      formData.append("title", importTitle);
      formData.append("sourceType", importSourceType);
      formData.append("tags", JSON.stringify(importTags));
      formData.append("embeddingProfile", embeddingProfile);
      formData.append("mode", importMode);

      const response = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as ImportResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not import PDF document.");
      }

      const summary = `${payload.filename}: ${payload.extractedCharacters} characters, ${payload.chunks} chunks, ${payload.model} (${payload.dimensions}d)`;
      const row: DocumentRow = {
        title: payload.title,
        type: getSourceTypeLabel(payload.sourceType),
        chunks: payload.chunks,
        status: payload.mode === "replace" ? "Imported, replaced" : "Imported",
        statusColor: "teal",
      };

      setImportSummary(payload);
      setIngestSummary(summary);
      setDocumentRows((currentRows) => (payload.mode === "replace" ? [row] : [row, ...currentRows]));
      setIsImportOpen(false);
      notifications.show({
        title: "PDF imported",
        message: summary,
        color: "green",
      });
    } catch (error) {
      notifications.show({
        title: "Import failed",
        message: getErrorMessage(error),
        color: "red",
      });
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <Stack gap="md">
      <Group align="stretch" grow>
        <MetricCard label="Documents" value={String(documentRows.length)} detail="current table" />
        <MetricCard label="Chunks" value={String(documentChunkCount)} detail="current table" />
        <MetricCard label="Vector collection" value="ai_rag_lab_documents" detail="Qdrant" />
      </Group>

      <Card withBorder radius="md" padding="lg">
        <Stack gap="md">
          <Group align="flex-end" justify="space-between">
            <Title order={3} size="h4">
              Corpus
            </Title>
            <Group>
              <Select
                label="Embedding profile"
                onChange={(value) =>
                  onEmbeddingProfileChange((value as EmbeddingProfileId | null) ?? defaultEmbeddingProfileId)
                }
                value={embeddingProfile}
                data={embeddingProfileSelectData}
                w={230}
              />
              <Button
                leftSection={<RefreshCw size={16} />}
                loading={isResetting}
                onClick={handleResetCollection}
                variant="outline"
              >
                Reset collection
              </Button>
              <Button
                leftSection={<Sparkles size={16} />}
                loading={isIngesting}
                onClick={handleSeedDocuments}
                variant="light"
              >
                Seed documents
              </Button>
              <Button leftSection={<UploadCloud size={16} />} onClick={() => setIsImportOpen(true)}>
                Import document
              </Button>
            </Group>
          </Group>
          {selectedProfile ? (
            <Alert color="blue" variant="light">
              {selectedProfile.description} Model: <Code>{selectedProfile.model}</Code>, dimensions:{" "}
              <Code>{selectedProfile.dimensions}</Code>. Seeding resets the Qdrant collection first.
            </Alert>
          ) : null}
          {ingestSummary ? (
            <Alert color="green" variant="light">
              {ingestSummary}
            </Alert>
          ) : null}
          {importSummary ? (
            <Alert color="teal" variant="light" title="Last PDF import">
              <Group gap="xs">
                <Badge variant="light">{importSummary.filename}</Badge>
                <Badge variant="light">{importSummary.pageCount} pages</Badge>
                <Badge variant="light">{importSummary.extractedCharacters} chars</Badge>
                <Badge variant="light">{importSummary.chunks} chunks</Badge>
                <Badge variant="light">{importSummary.embeddingProfile}</Badge>
                <Badge variant="light">{importSummary.dimensions}d</Badge>
              </Group>
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
                {documentRows.length > 0 ? (
                  documentRows.map((document) => (
                    <Table.Tr key={`${document.title}-${document.status}`}>
                      <Table.Td>{document.title}</Table.Td>
                      <Table.Td>
                        <Badge variant="light">{document.type}</Badge>
                      </Table.Td>
                      <Table.Td>{document.chunks}</Table.Td>
                      <Table.Td>
                        <Badge color={document.statusColor} variant="light">
                          {document.status}
                        </Badge>
                      </Table.Td>
                    </Table.Tr>
                  ))
                ) : (
                  <Table.Tr>
                    <Table.Td colSpan={4}>
                      <Text c="dimmed" size="sm">
                        No documents in the current table. Seed or import a document.
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Stack>
      </Card>
      <Modal
        opened={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title="Import PDF document"
        centered
      >
        <Stack gap="md">
          <FileInput
            accept="application/pdf"
            clearable
            label="PDF file"
            leftSection={<UploadCloud size={16} />}
            onChange={handleImportFileChange}
            placeholder="Choose searchable PDF"
            value={importFile}
          />
          <TextInput
            label="Title"
            onChange={(event) => setImportTitle(event.currentTarget.value)}
            placeholder="Candidate CV"
            value={importTitle}
          />
          <Group grow align="flex-end">
            <Select
              data={sourceTypeSelectData}
              label="Source type"
              onChange={(value) => setImportSourceType((value as SourceType | null) ?? "cv")}
              value={importSourceType}
            />
            <Select
              data={embeddingProfileSelectData}
              label="Embedding profile"
              onChange={(value) =>
                onEmbeddingProfileChange((value as EmbeddingProfileId | null) ?? defaultEmbeddingProfileId)
              }
              value={embeddingProfile}
            />
          </Group>
          <TagsInput label="Tags" onChange={setImportTags} placeholder="Add tag" value={importTags} />
          <Radio.Group
            label="Import mode"
            onChange={(value) => setImportMode((value as ImportMode | null) ?? "append")}
            value={importMode}
          >
            <Group mt="xs">
              <Radio value="append" label="Append" />
              <Radio value="replace" label="Replace all" />
            </Group>
          </Radio.Group>
          <Alert color={importMode === "replace" ? "orange" : "blue"} variant="light">
            {importMode === "replace"
              ? "Replace all resets the Qdrant collection before importing this PDF."
              : "Append adds this PDF to the current Qdrant collection."}
          </Alert>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setIsImportOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!importFile} loading={isImporting} onClick={handleImportDocument}>
              Import PDF
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

function SearchPanel({ embeddingProfile }: { embeddingProfile: EmbeddingProfileId }) {
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
          embeddingProfile,
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

function ChatPanel({ embeddingProfile }: { embeddingProfile: EmbeddingProfileId }) {
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
          embeddingProfile,
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

function EvalsPanel({ embeddingProfile }: { embeddingProfile: EmbeddingProfileId }) {
  const [evalRuns, setEvalRuns] = useState<EvalRun[]>(initialEvalRuns);
  const [isRunning, setIsRunning] = useState(false);
  const [lastRunSummary, setLastRunSummary] = useState<string | null>(null);

  async function handleRunEvals() {
    setIsRunning(true);

    try {
      const response = await fetch("/api/evals/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          embeddingProfile,
          promptVersions: ["rag_v1", "rag_strict_v2"],
          topK: 5,
        }),
      });
      const payload = (await response.json()) as EvalRunResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not run evals.");
      }

      setEvalRuns(payload.runs);
      setLastRunSummary(
        `${payload.runs.length} prompt variants evaluated with ${payload.model} (${payload.dimensions}d)`,
      );
      notifications.show({
        title: "Eval run complete",
        message: `${payload.runs[0]?.cases.length ?? 0} golden-set cases evaluated`,
        color: "green",
      });
    } catch (error) {
      notifications.show({
        title: "Eval run failed",
        message: getErrorMessage(error),
        color: "red",
      });
    } finally {
      setIsRunning(false);
    }
  }

  const caseRows = evalRuns[0]?.cases ?? [];

  return (
    <Stack gap="md">
      <Card withBorder radius="md" padding="lg">
        <Stack gap="md">
          <Group justify="space-between">
            <Title order={3} size="h4">
              Prompt comparison
            </Title>
            <Button leftSection={<Play size={16} />} loading={isRunning} onClick={handleRunEvals}>
              Run evals
            </Button>
          </Group>
          {lastRunSummary ? (
            <Alert color="green" variant="light">
              {lastRunSummary}
            </Alert>
          ) : (
            <Alert color="blue" variant="light">
              Evals use the current embedding profile and expect the Qdrant collection to be seeded
              with the same profile.
            </Alert>
          )}
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
                {evalRuns.map((row) => (
                  <Table.Tr key={row.id}>
                    <Table.Td>
                      <Code>{row.promptVersion}</Code>
                    </Table.Td>
                    <Table.Td>{row.recallAt5.toFixed(2)}</Table.Td>
                    <Table.Td>{row.mrr.toFixed(2)}</Table.Td>
                    <Table.Td>{formatLatency(row.averageLatencyMs)}</Table.Td>
                    <Table.Td>
                      <Group gap="sm">
                        <Progress value={row.passRate} w={110} />
                        <Text size="sm">{Math.round(row.passRate)}%</Text>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Stack>
      </Card>
      <Card withBorder radius="md" padding="lg">
        <Stack gap="md">
          <Group gap="xs">
            <ListChecks size={18} />
            <Title order={3} size="h4">
              Golden-set cases
            </Title>
          </Group>
          <Table.ScrollContainer minWidth={760}>
            <Table verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Case</Table.Th>
                  <Table.Th>Expected</Table.Th>
                  <Table.Th>Retrieved</Table.Th>
                  <Table.Th>Rank</Table.Th>
                  <Table.Th>Latency</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {caseRows.length > 0 ? (
                  caseRows.map((row) => (
                    <Table.Tr key={row.id}>
                      <Table.Td>{row.id}</Table.Td>
                      <Table.Td>
                        <Code>{row.expectedChunkIds.join(", ")}</Code>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" lineClamp={2}>
                          {row.retrievedChunkIds.join(", ")}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={row.foundExpected ? "green" : "red"} variant="light">
                          {row.firstRelevantRank ? `#${row.firstRelevantRank}` : "miss"}
                        </Badge>
                      </Table.Td>
                      <Table.Td>{formatLatency(row.latencyMs)}</Table.Td>
                    </Table.Tr>
                  ))
                ) : (
                  <Table.Tr>
                    <Table.Td colSpan={5}>
                      <Text c="dimmed" size="sm">
                        Run evals to inspect retrieval results for each golden-set case.
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                )}
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

function getTitleFromFilename(filename: string) {
  return filename.replace(/\.pdf$/i, "").replace(/[-_]+/g, " ").trim();
}

type IngestResponse = {
  documents: number;
  chunks: number;
  upserted: number;
  embeddingProfile: EmbeddingProfileId;
  model: string;
  dimensions: number;
  error?: string;
};

type ImportResponse = {
  filename: string;
  title: string;
  sourceType: SourceType;
  tags: string[];
  mode: ImportMode;
  documents: number;
  chunks: number;
  upserted: number;
  extractedCharacters: number;
  pageCount: number;
  embeddingProfile: EmbeddingProfileId;
  model: string;
  dimensions: number;
  pdfjsVersion: string;
  error?: string;
};

type ResetCollectionResponse = {
  collection: string;
  embeddingProfile: EmbeddingProfileId;
  model: string;
  dimensions: number;
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

type EvalRunResponse = {
  embeddingProfile: EmbeddingProfileId;
  model: string;
  dimensions: number;
  topK: number;
  runs: EvalRun[];
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

function formatLatency(value: number) {
  return value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${Math.round(value)}ms`;
}
