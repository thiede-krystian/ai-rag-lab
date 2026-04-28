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
  Menu,
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
  Eye,
  EyeOff,
  FileText,
  Gauge,
  HelpCircle,
  Moon,
  Play,
  PlayCircle,
  RefreshCw,
  Search,
  Sun,
  UploadCloud,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  defaultEmbeddingProfileId,
  getEmbeddingProfileOptions,
  type EmbeddingProfileId,
} from "@/lib/embedding-profiles";
import { setProductTourAutoDisabled } from "@/lib/tour-state";
import type {
  ChatResponse,
  ImportMode,
  IndexedDocument,
  MatchResponse,
  PromptVersion,
  QuickEvalRun,
  SearchResult,
  SourceType,
} from "@/lib/types";
import { ProductTour, type TourTab } from "./product-tour";

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

const ragPromptOptions = [
  { value: "rag_strict_v2", label: "rag_strict_v2" },
  { value: "rag_v1", label: "rag_v1" },
];

type QdrantTarget = "local" | "cloud";

export function RagLabShell({ qdrantTarget }: { qdrantTarget: QdrantTarget }) {
  const [activeTab, setActiveTab] = useState<TourTab>("documents");
  const [embeddingProfile, setEmbeddingProfile] =
    useState<EmbeddingProfileId>(defaultEmbeddingProfileId);
  const [isTourAutoDisabled, setIsTourAutoDisabled] = useState(false);
  const [tourRunId, setTourRunId] = useState(0);
  const qdrantBadge =
    qdrantTarget === "cloud"
      ? { color: "cyan", label: "Qdrant Cloud" }
      : { color: "teal", label: "Local Qdrant" };

  const handleStartTour = useCallback(() => {
    setTourRunId((currentRunId) => currentRunId + 1);
  }, []);

  const handleToggleAutoGuide = useCallback(() => {
    const nextIsDisabled = !isTourAutoDisabled;

    setProductTourAutoDisabled(window.localStorage, nextIsDisabled);
    setIsTourAutoDisabled(nextIsDisabled);
    notifications.show({
      title: nextIsDisabled ? "Auto guide disabled" : "Auto guide enabled",
      message: nextIsDisabled
        ? "The guide will still be available from the topbar menu."
        : "The guide can auto-start again for first-time localStorage state.",
      color: nextIsDisabled ? "yellow" : "green",
    });
  }, [isTourAutoDisabled]);

  const handleTabChange = useCallback((value: string | null) => {
    setActiveTab((value as TourTab | null) ?? "documents");
  }, []);

  return (
    <AppShell header={{ height: 72 }} padding="md">
      <ProductTour
        activeTab={activeTab}
        onAutoDisabledChange={setIsTourAutoDisabled}
        runId={tourRunId}
        setActiveTab={setActiveTab}
      />
      <AppShell.Header>
        <Container size="xl" h="100%">
          <Group h="100%" justify="space-between">
            <Group gap="sm" data-tour="app-header">
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
              <Badge variant="light" color={qdrantBadge.color} data-tour="qdrant-target">
                {qdrantBadge.label}
              </Badge>
              <Badge variant="light" color="blue">
                OpenRouter embeddings
              </Badge>
              <Badge variant="light" color="violet">
                OpenRouter chat
              </Badge>
            </Group>
            <Group gap="xs">
              <GuideMenu
                isAutoDisabled={isTourAutoDisabled}
                onStart={handleStartTour}
                onToggleAutoGuide={handleToggleAutoGuide}
              />
              <ColorSchemeToggle />
            </Group>
          </Group>
        </Container>
      </AppShell.Header>

      <AppShell.Main>
        <Container size="xl">
          <Tabs value={activeTab} onChange={handleTabChange} keepMounted={false}>
            <Tabs.List mb="md">
              <Tabs.Tab value="documents" leftSection={<FileText size={16} />} data-tour="tab-documents">
                Documents
              </Tabs.Tab>
              <Tabs.Tab value="search" leftSection={<Search size={16} />} data-tour="tab-search">
                Semantic Search
              </Tabs.Tab>
              <Tabs.Tab value="chat" leftSection={<Bot size={16} />} data-tour="tab-chat">
                RAG Chat
              </Tabs.Tab>
              <Tabs.Tab value="evals" leftSection={<Gauge size={16} />} data-tour="tab-evals">
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

function GuideMenu({
  isAutoDisabled,
  onStart,
  onToggleAutoGuide,
}: {
  isAutoDisabled: boolean;
  onStart: () => void;
  onToggleAutoGuide: () => void;
}) {
  const AutoGuideIcon = isAutoDisabled ? Eye : EyeOff;

  return (
    <Menu position="bottom-end" shadow="md" width={220}>
      <Menu.Target>
        <ActionIcon aria-label="Guide" data-tour="guide-menu" size="lg" variant="light">
          <HelpCircle size={18} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>Guide</Menu.Label>
        <Menu.Item leftSection={<PlayCircle size={16} />} onClick={onStart}>
          Start guide
        </Menu.Item>
        <Menu.Item leftSection={<AutoGuideIcon size={16} />} onClick={onToggleAutoGuide}>
          {isAutoDisabled ? "Enable auto guide" : "Disable auto guide"}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

function DocumentsPanel({
  embeddingProfile,
  onEmbeddingProfileChange,
}: {
  embeddingProfile: EmbeddingProfileId;
  onEmbeddingProfileChange: (profile: EmbeddingProfileId) => void;
}) {
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isAddingTextDocument, setIsAddingTextDocument] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isTextDocumentOpen, setIsTextDocumentOpen] = useState(false);
  const [ingestSummary, setIngestSummary] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<ImportResponse | null>(null);
  const [documentRows, setDocumentRows] = useState<IndexedDocument[]>([]);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importTitle, setImportTitle] = useState("");
  const [importSourceType, setImportSourceType] = useState<SourceType>("cv");
  const [importTags, setImportTags] = useState<string[]>(["pdf"]);
  const [importMode, setImportMode] = useState<ImportMode>("append");
  const [textTitle, setTextTitle] = useState("");
  const [textContent, setTextContent] = useState("");
  const [textSourceType, setTextSourceType] = useState<SourceType>("knowledge");
  const [textTags, setTextTags] = useState<string[]>(["manual"]);
  const [textMode, setTextMode] = useState<ImportMode>("append");
  const selectedProfile = embeddingProfileOptions.find((profile) => profile.id === embeddingProfile);
  const documentChunkCount = documentRows.reduce((sum, row) => sum + row.chunks, 0);

  const loadDocuments = useCallback(async () => {
    setIsLoadingDocuments(true);

    try {
      setDocumentRows(await fetchDocumentInventory());
    } catch (error) {
      notifications.show({
        title: "Document inventory failed",
        message: getErrorMessage(error),
        color: "red",
      });
    } finally {
      setIsLoadingDocuments(false);
    }
  }, []);

  useEffect(() => {
    let isActive = true;

    fetchDocumentInventory()
      .then((documents) => {
        if (isActive) {
          setDocumentRows(documents);
        }
      })
      .catch((error: unknown) => {
        if (isActive) {
          notifications.show({
            title: "Document inventory failed",
            message: getErrorMessage(error),
            color: "red",
          });
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

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

      setIngestSummary(`${payload.collection} reset for ${payload.model} (${payload.dimensions}d).`);
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

      setImportSummary(payload);
      setIngestSummary(summary);
      await loadDocuments();
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

  async function handleAddTextDocument() {
    const title = textTitle.trim();
    const content = textContent.trim();

    if (!title || !content) {
      notifications.show({
        title: "Text document failed",
        message: "Provide both title and document content.",
        color: "red",
      });
      return;
    }

    setIsAddingTextDocument(true);

    try {
      const response = await fetch("/api/ingest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documents: [
            {
              id: createManualDocumentId(title, textSourceType),
              title,
              sourceType: textSourceType,
              content,
              tags: textTags,
            },
          ],
          embeddingProfile,
          resetCollection: textMode === "replace",
        }),
      });
      const payload = (await response.json()) as TextIngestResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not add text document.");
      }

      const summary = `${title}: ${payload.chunks} chunks indexed with ${payload.model} (${payload.dimensions}d)`;

      setIngestSummary(summary);
      setImportSummary(null);
      await loadDocuments();
      setIsTextDocumentOpen(false);
      notifications.show({
        title: "Text document indexed",
        message: summary,
        color: "green",
      });
    } catch (error) {
      notifications.show({
        title: "Text document failed",
        message: getErrorMessage(error),
        color: "red",
      });
    } finally {
      setIsAddingTextDocument(false);
    }
  }

  return (
    <Stack gap="md">
      <Group align="stretch" grow data-tour="documents-metrics">
        <MetricCard label="Documents" value={String(documentRows.length)} detail="Qdrant inventory" />
        <MetricCard label="Chunks" value={String(documentChunkCount)} detail="indexed payloads" />
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
                data-tour="embedding-profile"
                onChange={(value) =>
                  onEmbeddingProfileChange((value as EmbeddingProfileId | null) ?? defaultEmbeddingProfileId)
                }
                value={embeddingProfile}
                data={embeddingProfileSelectData}
                w={230}
              />
              <Group gap="xs" data-tour="collection-actions">
                <Button
                  leftSection={<RefreshCw size={16} />}
                  loading={isLoadingDocuments}
                  onClick={loadDocuments}
                  variant="default"
                >
                  Refresh
                </Button>
                <Button
                  leftSection={<RefreshCw size={16} />}
                  loading={isResetting}
                  onClick={handleResetCollection}
                  variant="outline"
                >
                  Reset collection
                </Button>
              </Group>
              <Button
                leftSection={<FileText size={16} />}
                onClick={() => setIsTextDocumentOpen(true)}
                data-tour="add-text-button"
              >
                Add text
              </Button>
              <Button
                leftSection={<UploadCloud size={16} />}
                onClick={() => setIsImportOpen(true)}
                data-tour="import-pdf-button"
              >
                Import PDF
              </Button>
            </Group>
          </Group>
          {selectedProfile ? (
            <Alert color="blue" variant="light">
              {selectedProfile.description} Model: <Code>{selectedProfile.model}</Code>, dimensions:{" "}
              <Code>{selectedProfile.dimensions}</Code>. Use the same profile for all documents in one Qdrant
              collection.
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
          <Table.ScrollContainer minWidth={640} data-tour="documents-table">
            <Table verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Document</Table.Th>
                  <Table.Th>Type</Table.Th>
                  <Table.Th>Chunks</Table.Th>
                  <Table.Th>Tags</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {documentRows.length > 0 ? (
                  documentRows.map((document) => (
                    <Table.Tr key={`${document.sourceType}-${document.title}`}>
                      <Table.Td>{document.title}</Table.Td>
                      <Table.Td>
                        <Badge variant="light">{getSourceTypeLabel(document.sourceType)}</Badge>
                      </Table.Td>
                      <Table.Td>{document.chunks}</Table.Td>
                      <Table.Td>
                        <Group gap={4}>
                          {document.tags.length > 0 ? (
                            document.tags.map((tag) => (
                              <Badge key={tag} color="gray" variant="light">
                                {tag}
                              </Badge>
                            ))
                          ) : (
                            <Text c="dimmed" size="sm">
                              -
                            </Text>
                          )}
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))
                ) : (
                  <Table.Tr>
                    <Table.Td colSpan={4}>
                      <Text c="dimmed" size="sm">
                        No documents indexed in Qdrant yet. Import a searchable PDF to start.
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
        opened={isTextDocumentOpen}
        onClose={() => setIsTextDocumentOpen(false)}
        title="Add text document"
        centered
        size="lg"
      >
        <Stack gap="md">
          <TextInput
            label="Title"
            onChange={(event) => setTextTitle(event.currentTarget.value)}
            placeholder="Job offer, CV note, knowledge article"
            value={textTitle}
          />
          <Group grow align="flex-end">
            <Select
              data={sourceTypeSelectData}
              label="Source type"
              onChange={(value) => setTextSourceType((value as SourceType | null) ?? "knowledge")}
              value={textSourceType}
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
          <TagsInput label="Tags" onChange={setTextTags} placeholder="Add tag" value={textTags} />
          <Textarea
            autosize
            label="Document content"
            minRows={10}
            onChange={(event) => setTextContent(event.currentTarget.value)}
            placeholder="Paste CV, job offer, notes, or knowledge text here"
            value={textContent}
          />
          <Radio.Group
            label="Import mode"
            onChange={(value) => setTextMode((value as ImportMode | null) ?? "append")}
            value={textMode}
          >
            <Group mt="xs">
              <Radio value="append" label="Append" />
              <Radio value="replace" label="Replace all" />
            </Group>
          </Radio.Group>
          <Alert color={textMode === "replace" ? "orange" : "blue"} variant="light">
            {textMode === "replace"
              ? "Replace all resets the Qdrant collection before indexing this text document."
              : "Append adds this text document to the current Qdrant collection."}
          </Alert>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setIsTextDocumentOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!textTitle.trim() || !textContent.trim()}
              loading={isAddingTextDocument}
              onClick={handleAddTextDocument}
            >
              Add document
            </Button>
          </Group>
        </Stack>
      </Modal>
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
  const [results, setResults] = useState<SearchResult[]>([]);
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
          <Group align="flex-end" data-tour="search-form">
            <Textarea
              label="Query"
              autosize
              minRows={2}
              onChange={(event) => setQuery(event.currentTarget.value)}
              value={query}
              style={{ flex: 1 }}
            />
            <NumberInput label="TopK" min={1} max={20} onChange={setTopK} value={topK} w={110} />
            <Button
              leftSection={<Search size={16} />}
              loading={isSearching}
              onClick={handleSearch}
              data-tour="search-button"
            >
              Search
            </Button>
          </Group>
          <Divider />
          <Stack gap="sm" data-tour="search-results">
            {results.length > 0 ? (
              results.map((result) => (
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
              ))
            ) : (
              <Alert color="blue" variant="light">
                Import a document, then run semantic search to see retrieved Qdrant chunks here.
              </Alert>
            )}
          </Stack>
        </Stack>
      </Card>
    </Stack>
  );
}

function ChatPanel({ embeddingProfile }: { embeddingProfile: EmbeddingProfileId }) {
  const [question, setQuestion] = useState("What does this document say about RAG and vector search?");
  const [promptVersion, setPromptVersion] = useState<PromptVersion>("rag_strict_v2");
  const [topK, setTopK] = useState<number | string>(5);
  const [chatResponse, setChatResponse] = useState<ChatResponse | null>(null);
  const [matchResponse, setMatchResponse] = useState<MatchResponse | null>(null);
  const [documents, setDocuments] = useState<IndexedDocument[]>([]);
  const [cvTitle, setCvTitle] = useState<string | null>(null);
  const [jobTitle, setJobTitle] = useState<string | null>(null);
  const [isAsking, setIsAsking] = useState(false);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [isScoring, setIsScoring] = useState(false);
  const cvOptions = useMemo(() => getDocumentOptions(documents, "cv"), [documents]);
  const jobOptions = useMemo(() => getDocumentOptions(documents, "job"), [documents]);
  const selectedCvTitle = getSelectedDocumentTitle(cvTitle, cvOptions);
  const selectedJobTitle = getSelectedDocumentTitle(jobTitle, jobOptions);

  const loadDocuments = useCallback(async () => {
    setIsLoadingDocuments(true);

    try {
      setDocuments(await fetchDocumentInventory());
    } catch (error) {
      notifications.show({
        title: "Document inventory failed",
        message: getErrorMessage(error),
        color: "red",
      });
    } finally {
      setIsLoadingDocuments(false);
    }
  }, []);

  useEffect(() => {
    let isActive = true;

    fetchDocumentInventory()
      .then((nextDocuments) => {
        if (isActive) {
          setDocuments(nextDocuments);
        }
      })
      .catch((error: unknown) => {
        if (isActive) {
          notifications.show({
            title: "Document inventory failed",
            message: getErrorMessage(error),
            color: "red",
          });
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

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
    if (!selectedCvTitle || !selectedJobTitle) {
      notifications.show({
        title: "Match scoring failed",
        message: "Import or add one CV document and one Job document first.",
        color: "red",
      });
      return;
    }

    setIsScoring(true);

    try {
      const response = await fetch("/api/match", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cvTitle: selectedCvTitle,
          jobTitle: selectedJobTitle,
        }),
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
          <Group align="flex-end" data-tour="chat-form">
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
              data={ragPromptOptions}
              w={190}
            />
            <NumberInput label="TopK" min={1} max={20} onChange={setTopK} value={topK} w={110} />
            <Button
              leftSection={<Bot size={16} />}
              loading={isAsking}
              onClick={handleAsk}
              data-tour="chat-button"
            >
              Ask
            </Button>
          </Group>
          <Alert color="blue" variant="light" title={chatResponse ? "RAG answer" : "No answer yet"}>
            {chatResponse?.answer ??
              "Ask a question after indexing documents. The answer will be grounded in retrieved Qdrant chunks."}
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
          <JsonInput
            label="Retrieved context"
            autosize
            data-tour="retrieved-context"
            minRows={7}
            value={JSON.stringify(chatResponse?.retrievedChunks ?? [], null, 2)}
            readOnly
          />
        </Stack>
      </Card>
      <Card withBorder radius="md" padding="lg" data-tour="match-card">
        <Stack gap="md">
          <Group justify="space-between" align="flex-start">
            <div>
              <Title order={3} size="h4">
                CV-job match
              </Title>
              <Text size="sm" c="dimmed" mt={4}>
                Select one indexed CV and one indexed job document from Qdrant.
              </Text>
            </div>
            <Button
              leftSection={<RefreshCw size={16} />}
              loading={isLoadingDocuments}
              onClick={loadDocuments}
              variant="default"
            >
              Refresh documents
            </Button>
          </Group>
          <Group align="flex-end">
            <Select
              data={cvOptions}
              label="CV document"
              onChange={setCvTitle}
              placeholder="Import a CV PDF first"
              searchable
              value={selectedCvTitle}
              style={{ flex: 1 }}
            />
            <Select
              data={jobOptions}
              label="Job document"
              onChange={setJobTitle}
              placeholder="Import or add a Job document first"
              searchable
              value={selectedJobTitle}
              style={{ flex: 1 }}
            />
            <Button
              loading={isScoring}
              onClick={handleScoreMatch}
              variant="light"
              data-tour="score-match-button"
            >
              Score match
            </Button>
          </Group>
          {cvOptions.length === 0 || jobOptions.length === 0 ? (
            <Alert color="blue" variant="light">
              Score match needs at least one indexed CV document and one indexed Job document.
            </Alert>
          ) : null}
          {matchResponse ? <MatchScoreResult result={matchResponse} /> : null}
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
          <Badge variant="light" color="blue">
            CV: {result.cvTitle}
          </Badge>
          <Badge variant="light" color="cyan">
            Job: {result.jobTitle}
          </Badge>
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
  const [targetTitle, setTargetTitle] = useState<string | null>(null);
  const [sourceType, setSourceType] = useState<SourceType>("cv");
  const [queries, setQueries] = useState(
    "RAG and vector search experience\nTypeScript and Node.js experience\nAI evaluation pipelines",
  );
  const [topK, setTopK] = useState<number | string>(5);
  const [documents, setDocuments] = useState<IndexedDocument[]>([]);
  const [run, setRun] = useState<QuickEvalRun | null>(null);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const documentOptions = useMemo(
    () => getDocumentOptions(documents, sourceType),
    [documents, sourceType],
  );
  const selectedTargetTitle = getSelectedDocumentTitle(targetTitle, documentOptions);

  const loadDocuments = useCallback(async () => {
    setIsLoadingDocuments(true);

    try {
      setDocuments(await fetchDocumentInventory());
    } catch (error) {
      notifications.show({
        title: "Document inventory failed",
        message: getErrorMessage(error),
        color: "red",
      });
    } finally {
      setIsLoadingDocuments(false);
    }
  }, []);

  useEffect(() => {
    let isActive = true;

    fetchDocumentInventory()
      .then((nextDocuments) => {
        if (isActive) {
          setDocuments(nextDocuments);
        }
      })
      .catch((error: unknown) => {
        if (isActive) {
          notifications.show({
            title: "Document inventory failed",
            message: getErrorMessage(error),
            color: "red",
          });
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  async function handleRunPdfEvals() {
    const expectedTitle = selectedTargetTitle?.trim() ?? "";
    const queryList = queries
      .split("\n")
      .map((query) => query.trim())
      .filter(Boolean);

    if (!expectedTitle || queryList.length === 0) {
      notifications.show({
        title: "PDF eval failed",
        message: "Provide the imported document title and at least one query.",
        color: "red",
      });
      return;
    }

    setIsRunning(true);

    try {
      const response = await fetch("/api/evals/quick", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          embeddingProfile,
          targetTitle: expectedTitle,
          sourceType,
          queries: queryList,
          topK: getNumericTopK(topK),
        }),
      });
      const payload = (await response.json()) as QuickEvalRunResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not run PDF evals.");
      }

      setRun(payload.run);
      notifications.show({
        title: "PDF eval complete",
        message: `${payload.run.cases.length} queries checked against ${expectedTitle}`,
        color: "green",
      });
    } catch (error) {
      notifications.show({
        title: "PDF eval failed",
        message: getErrorMessage(error),
        color: "red",
      });
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <Stack gap="md">
      <Card withBorder radius="md" padding="lg">
        <Stack gap="md">
          <Group justify="space-between" align="flex-start">
            <div>
              <Group gap="xs">
                <Search size={18} />
                <Title order={3} size="h4">
                  PDF retrieval evals
                </Title>
              </Group>
              <Text size="sm" c="dimmed" mt={4}>
                Checks whether each query retrieves the selected document in TopK.
              </Text>
            </div>
            <Group>
              <Button
                leftSection={<RefreshCw size={16} />}
                loading={isLoadingDocuments}
                onClick={loadDocuments}
                variant="default"
              >
                Refresh documents
              </Button>
              <Button
                leftSection={<Play size={16} />}
                loading={isRunning}
                onClick={handleRunPdfEvals}
                data-tour="run-evals-button"
              >
                Run evals
              </Button>
            </Group>
          </Group>
          <Stack gap="md" data-tour="evals-form">
            <Group align="flex-end">
              <Select
                data={documentOptions}
                label="Expected document"
                onChange={setTargetTitle}
                placeholder="Choose indexed document"
                searchable
                value={selectedTargetTitle}
                style={{ flex: 1 }}
              />
              <Select
                data={sourceTypeSelectData}
                label="Source type"
                onChange={(value) => setSourceType((value as SourceType | null) ?? "cv")}
                value={sourceType}
                w={160}
              />
              <NumberInput label="TopK" min={1} max={20} onChange={setTopK} value={topK} w={110} />
            </Group>
            <Textarea
              label="Queries"
              autosize
              minRows={3}
              onChange={(event) => setQueries(event.currentTarget.value)}
              value={queries}
            />
          </Stack>
          {run ? (
            <Stack gap="md" data-tour="evals-results">
              <Group gap="xs">
                <Badge variant="light" color="violet">
                  {run.model}
                </Badge>
                <Badge variant="light" color="blue">
                  Recall@K {run.recallAtK.toFixed(2)}
                </Badge>
                <Badge variant="light" color="teal">
                  MRR {run.mrr.toFixed(2)}
                </Badge>
                <Badge variant="light" color={run.passRate >= 80 ? "green" : "yellow"}>
                  Pass rate {Math.round(run.passRate)}%
                </Badge>
                <Badge variant="light" color="gray">
                  {formatLatency(run.averageLatencyMs)}
                </Badge>
              </Group>
              <Progress value={run.passRate} color={run.passRate >= 80 ? "green" : "yellow"} />
              <Table.ScrollContainer minWidth={760}>
                <Table verticalSpacing="sm">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Query</Table.Th>
                      <Table.Th>Expected title</Table.Th>
                      <Table.Th>Retrieved titles</Table.Th>
                      <Table.Th>Rank</Table.Th>
                      <Table.Th>Latency</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {run.cases.map((row) => (
                      <Table.Tr key={row.id}>
                        <Table.Td>{row.query}</Table.Td>
                        <Table.Td>{row.expectedTitle}</Table.Td>
                        <Table.Td>
                          <Text size="sm" lineClamp={2}>
                            {row.retrievedTitles.join(", ")}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge color={row.foundExpected ? "green" : "red"} variant="light">
                            {row.firstRelevantRank ? `#${row.firstRelevantRank}` : "miss"}
                          </Badge>
                        </Table.Td>
                        <Table.Td>{formatLatency(row.latencyMs)}</Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            </Stack>
          ) : (
            <Alert color="blue" variant="light" data-tour="evals-results">
              Import a searchable PDF or add a document, choose it here, then run one query per line.
            </Alert>
          )}
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

function getDocumentOptions(documents: IndexedDocument[], sourceType: SourceType) {
  return documents
    .filter((document) => document.sourceType === sourceType)
    .map((document) => ({
      value: document.title,
      label: `${document.title} (${document.chunks} chunks)`,
    }));
}

function getSelectedDocumentTitle(
  title: string | null,
  options: Array<{ value: string; label: string }>,
) {
  if (title && options.some((option) => option.value === title)) {
    return title;
  }

  return options[0]?.value ?? null;
}

async function fetchDocumentInventory() {
  const response = await fetch("/api/documents");
  const payload = (await response.json()) as DocumentsResponse;

  if (!response.ok) {
    throw new Error(payload.error ?? "Could not load indexed documents.");
  }

  return payload.documents;
}

function getTitleFromFilename(filename: string) {
  return filename.replace(/\.pdf$/i, "").replace(/[-_]+/g, " ").trim();
}

function createManualDocumentId(title: string, sourceType: SourceType) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `manual-${sourceType}-${slug || "document"}-${Date.now()}`;
}

type DocumentsResponse = {
  documents: IndexedDocument[];
  error?: string;
};

type TextIngestResponse = {
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

type QuickEvalRunResponse = {
  embeddingProfile: EmbeddingProfileId;
  model: string;
  dimensions: number;
  topK: number;
  run: QuickEvalRun;
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
