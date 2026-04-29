"use client";

import {
  ActionIcon,
  Accordion,
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
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  TagsInput,
  Text,
  TextInput,
  Textarea,
  ThemeIcon,
  Title,
  Tooltip,
  useComputedColorScheme,
  useMantineColorScheme,
} from "@mantine/core";
import { useMounted } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  Bot,
  CheckCircle2,
  Database,
  Eye,
  EyeOff,
  FilePenLine,
  FileText,
  Gauge,
  HelpCircle,
  ListChecks,
  Moon,
  Play,
  PlayCircle,
  RefreshCw,
  Search,
  ShieldAlert,
  Sun,
  UploadCloud,
} from "lucide-react";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { readApiResponse } from "@/lib/api-response";
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
  JobRequirement,
  MatchResponse,
  PromptVersion,
  QuickEvalRun,
  RequirementMatch,
  SearchResult,
  SourceType,
} from "@/lib/types";
import { CvMakerPanel } from "./cv-maker-panel";
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
            <DemoFlowPanel activeTab={activeTab} onNavigate={setActiveTab} />
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
              <Tabs.Tab value="match" leftSection={<ListChecks size={16} />} data-tour="tab-match">
                CV-job match
              </Tabs.Tab>
              <Tabs.Tab
                value="cv"
                leftSection={<FilePenLine size={16} />}
                data-tour="tab-cv"
                style={{ marginLeft: "auto" }}
              >
                CV Maker
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="documents">
              <DocumentsPanel
                embeddingProfile={embeddingProfile}
                onEmbeddingProfileChange={setEmbeddingProfile}
              />
            </Tabs.Panel>
            <Tabs.Panel value="search">
              <SearchPanel embeddingProfile={embeddingProfile} onNavigate={setActiveTab} />
            </Tabs.Panel>
            <Tabs.Panel value="chat">
              <ChatPanel embeddingProfile={embeddingProfile} onNavigate={setActiveTab} />
            </Tabs.Panel>
            <Tabs.Panel value="evals">
              <EvalsPanel embeddingProfile={embeddingProfile} onNavigate={setActiveTab} />
            </Tabs.Panel>
            <Tabs.Panel value="match">
              <MatchPanel />
            </Tabs.Panel>
            <Tabs.Panel value="cv">
              <CvMakerPanel />
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

function DemoFlowPanel({
  activeTab,
  onNavigate,
}: {
  activeTab: TourTab;
  onNavigate: (tab: TourTab) => void;
}) {
  const [documents, setDocuments] = useState<IndexedDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const documentCount = documents.length;
  const hasDocuments = documentCount > 0;
  const hasCv = documents.some((document) => document.sourceType === "cv");
  const hasJob = documents.some((document) => document.sourceType === "job");
  const hasMatchInputs = hasCv && hasJob;
  const steps = [
    {
      cta: hasDocuments ? "Review corpus" : "Import docs",
      detail: hasDocuments ? `${documentCount} indexed document(s)` : "Start with a CV PDF or job text",
      done: hasDocuments,
      label: "1. Documents",
      tab: "documents" as TourTab,
    },
    {
      cta: "Run search",
      detail: hasDocuments ? "Validate vector retrieval" : "Needs indexed chunks first",
      done: false,
      disabled: !hasDocuments,
      label: "2. Semantic Search",
      tab: "search" as TourTab,
    },
    {
      cta: "Ask RAG",
      detail: hasDocuments ? "Generate grounded answer" : "Needs retrieved context",
      done: false,
      disabled: !hasDocuments,
      label: "3. RAG Chat",
      tab: "chat" as TourTab,
    },
    {
      cta: "Run evals",
      detail: hasDocuments ? "Check Recall@K and MRR" : "Needs expected document",
      done: false,
      disabled: !hasDocuments,
      label: "4. Evals",
      tab: "evals" as TourTab,
    },
    {
      cta: "Score match",
      detail: hasMatchInputs ? "CV and Job ready" : "Needs one CV and one Job",
      done: hasMatchInputs,
      disabled: !hasMatchInputs,
      label: "5. CV-job match",
      tab: "match" as TourTab,
    },
  ];

  const loadDocuments = useCallback(async () => {
    setIsLoading(true);

    try {
      setDocuments(await fetchDocumentInventory());
    } catch {
      setDocuments([]);
    } finally {
      setIsLoading(false);
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
      .catch(() => {
        if (isActive) {
          setDocuments([]);
        }
      });

    return () => {
      isActive = false;
    };
  }, [activeTab]);

  return (
    <Paper withBorder radius="md" p="md" mb="md" data-tour="demo-flow-panel">
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start">
          <Group gap="sm">
            <ThemeIcon variant="light" size="lg" radius="md">
              <ListChecks size={18} />
            </ThemeIcon>
            <div>
              <Text fw={700}>Demo flow</Text>
              <Text size="sm" c="dimmed">
                Recommended path for showing the AI Engineer workflow end to end.
              </Text>
            </div>
          </Group>
          <Button
            leftSection={<RefreshCw size={16} />}
            loading={isLoading}
            onClick={loadDocuments}
            size="xs"
            variant="default"
          >
            Refresh flow
          </Button>
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 2, md: 5 }} spacing="xs">
          {steps.map((step) => {
            const isActive = activeTab === step.tab;
            const color = step.done ? "green" : step.disabled ? "gray" : "blue";

            return (
              <Paper
                key={step.label}
                withBorder
                radius="md"
                p="sm"
                bg={isActive ? "var(--mantine-color-blue-light)" : undefined}
              >
                <Stack gap={6}>
                  <Group gap="xs" wrap="nowrap">
                    <ThemeIcon color={color} variant="light" size="sm" radius="xl">
                      {step.done ? <CheckCircle2 size={14} /> : <PlayCircle size={14} />}
                    </ThemeIcon>
                    <Text fw={700} size="sm" lineClamp={1}>
                      {step.label}
                    </Text>
                  </Group>
                  <Text size="xs" c="dimmed" mih={32}>
                    {step.detail}
                  </Text>
                  <Button
                    disabled={step.disabled}
                    onClick={() => onNavigate(step.tab)}
                    size="xs"
                    variant={isActive ? "filled" : "light"}
                  >
                    {step.cta}
                  </Button>
                </Stack>
              </Paper>
            );
          })}
        </SimpleGrid>
      </Stack>
    </Paper>
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
  const [dangerAction, setDangerAction] = useState<"reset" | "importReplace" | "textReplace" | null>(null);
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
      const payload = await readApiResponse<ResetCollectionResponse>(response);

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

  function requestImportDocument() {
    if (!importFile) {
      notifications.show({
        title: "Import failed",
        message: "Choose a PDF file first.",
        color: "red",
      });
      return;
    }

    if (importMode === "replace") {
      setDangerAction("importReplace");
      return;
    }

    void handleImportDocument();
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
      const payload = await readApiResponse<ImportResponse>(response);

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

  function requestAddTextDocument() {
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

    if (textMode === "replace") {
      setDangerAction("textReplace");
      return;
    }

    void handleAddTextDocument();
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
      const payload = await readApiResponse<TextIngestResponse>(response);

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

  function handleConfirmDangerAction() {
    const action = dangerAction;

    setDangerAction(null);

    if (action === "reset") {
      void handleResetCollection();
      return;
    }

    if (action === "importReplace") {
      void handleImportDocument();
      return;
    }

    if (action === "textReplace") {
      void handleAddTextDocument();
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
            <Group align="flex-end">
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
              <Group align="flex-end" gap="xs" data-tour="collection-actions">
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
                  onClick={() => setDangerAction("reset")}
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
            <Accordion variant="contained">
              <Accordion.Item value="embedding-details">
                <Accordion.Control>Advanced details: embedding model and vector dimensions</Accordion.Control>
                <Accordion.Panel>
                  <Alert color="blue" variant="light">
                    {selectedProfile.description} Model: <Code>{selectedProfile.model}</Code>, dimensions:{" "}
                    <Code>{selectedProfile.dimensions}</Code>. Use the same profile for all documents in one Qdrant
                    collection.
                  </Alert>
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>
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
                      <EmptyState
                        icon={<FileText size={20} />}
                        title="No documents indexed yet"
                        description="Import a searchable CV PDF or add a pasted job offer to start the demo flow."
                        actions={
                          <>
                            <Button size="xs" onClick={() => setIsImportOpen(true)}>
                              Import CV PDF
                            </Button>
                            <Button
                              size="xs"
                              variant="default"
                              onClick={() => {
                                setTextSourceType("job");
                                setTextTags(["job", "manual"]);
                                setIsTextDocumentOpen(true);
                              }}
                            >
                              Add job text
                            </Button>
                          </>
                        }
                      />
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
              onClick={requestAddTextDocument}
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
            <Button disabled={!importFile} loading={isImporting} onClick={requestImportDocument}>
              Import PDF
            </Button>
          </Group>
        </Stack>
      </Modal>
      <Modal
        centered
        opened={dangerAction !== null}
        onClose={() => setDangerAction(null)}
        title="Confirm Qdrant collection change"
      >
        <Stack gap="md">
          <Alert color="orange" icon={<ShieldAlert size={18} />} variant="light">
            {getDangerActionMessage(dangerAction)}
          </Alert>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDangerAction(null)}>
              Cancel
            </Button>
            <Button color="orange" loading={isResetting || isImporting || isAddingTextDocument} onClick={handleConfirmDangerAction}>
              Confirm
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

function SearchPanel({
  embeddingProfile,
  onNavigate,
}: {
  embeddingProfile: EmbeddingProfileId;
  onNavigate: (tab: TourTab) => void;
}) {
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
      const payload = await readApiResponse<SearchResponse>(response);

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
              description="Describe intent, skills, or evidence you want to retrieve from indexed chunks."
              autosize
              minRows={2}
              onChange={(event) => setQuery(event.currentTarget.value)}
              value={query}
              style={{ flex: 1 }}
            />
            <NumberInput
              description="Chunks"
              label="TopK"
              min={1}
              max={20}
              onChange={setTopK}
              value={topK}
              w={110}
            />
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
              <EmptyState
                icon={<Search size={20} />}
                title="Search results will appear here"
                description="Index a CV, job offer, or knowledge note, then run a semantic query to inspect Qdrant ranking."
                actions={
                  <>
                    <Button size="xs" onClick={handleSearch} loading={isSearching}>
                      Run first search
                    </Button>
                    <Button size="xs" variant="default" onClick={() => onNavigate("documents")}>
                      Go to Documents
                    </Button>
                  </>
                }
              />
            )}
          </Stack>
        </Stack>
      </Card>
    </Stack>
  );
}

function ChatPanel({
  embeddingProfile,
  onNavigate,
}: {
  embeddingProfile: EmbeddingProfileId;
  onNavigate: (tab: TourTab) => void;
}) {
  const [question, setQuestion] = useState("What does this document say about RAG and vector search?");
  const [promptVersion, setPromptVersion] = useState<PromptVersion>("rag_strict_v2");
  const [topK, setTopK] = useState<number | string>(5);
  const [chatResponse, setChatResponse] = useState<ChatResponse | null>(null);
  const [isAsking, setIsAsking] = useState(false);

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
      const payload = await readApiResponse<ChatApiResponse>(response);

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

  return (
    <Stack gap="md">
      <Card withBorder radius="md" padding="lg">
        <Stack gap="md">
          <Group align="flex-end" data-tour="chat-form">
            <Textarea
              label="Question"
              description="Ask a question that should be answered from indexed documents, not model memory."
              autosize
              minRows={2}
              onChange={(event) => setQuestion(event.currentTarget.value)}
              value={question}
              style={{ flex: 1 }}
            />
            <Select
              label="Prompt"
              description="Prompt version"
              onChange={(value) => setPromptVersion((value as PromptVersion | null) ?? "rag_strict_v2")}
              value={promptVersion}
              data={ragPromptOptions}
              w={190}
            />
            <NumberInput
              description="Chunks"
              label="TopK"
              min={1}
              max={20}
              onChange={setTopK}
              value={topK}
              w={110}
            />
            <Button
              leftSection={<Bot size={16} />}
              loading={isAsking}
              onClick={handleAsk}
              data-tour="chat-button"
            >
              Ask
            </Button>
          </Group>
          <Paper withBorder radius="md" p="md" data-tour="rag-answer">
            {chatResponse ? (
              <Stack gap="sm">
                <Group justify="space-between" align="flex-start">
                  <div>
                    <Text fw={700}>RAG answer</Text>
                    <Text size="sm" c="dimmed">
                      Grounded response with citations from retrieved chunks.
                    </Text>
                  </div>
                  <Group gap="xs">
                    <Badge variant="light" color="violet">
                      {chatResponse.model}
                    </Badge>
                    <Badge variant="light" color="gray">
                      {formatLatency(chatResponse.latencyMs)}
                    </Badge>
                    <Badge variant="light" color="blue">
                      {chatResponse.retrievedChunks.length} chunks
                    </Badge>
                  </Group>
                </Group>
                <Text>{chatResponse.answer}</Text>
                <Group gap="xs">
                  {chatResponse.citations.map((citation) => (
                    <Badge key={citation.id} variant="light" color="gray">
                      {citation.title} · chunk {citation.chunkIndex + 1}
                    </Badge>
                  ))}
                </Group>
              </Stack>
            ) : (
              <EmptyState
                icon={<Bot size={20} />}
                title="Ask a grounded RAG question"
                description="After indexing documents, ask a question and inspect both the answer and the exact chunks used as context."
                actions={
                  <>
                    <Button size="xs" onClick={handleAsk} loading={isAsking}>
                      Ask now
                    </Button>
                    <Button size="xs" variant="default" onClick={() => onNavigate("documents")}>
                      Import documents
                    </Button>
                  </>
                }
              />
            )}
          </Paper>
          <Accordion variant="separated">
            <Accordion.Item value="retrieved-context">
              <Accordion.Control>Advanced details: retrieved context JSON</Accordion.Control>
              <Accordion.Panel>
                <JsonInput
                  label="Retrieved context"
                  autosize
                  data-tour="retrieved-context"
                  minRows={7}
                  value={JSON.stringify(chatResponse?.retrievedChunks ?? [], null, 2)}
                  readOnly
                />
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </Stack>
      </Card>
    </Stack>
  );
}

function MatchPanel() {
  const [matchResponse, setMatchResponse] = useState<MatchResponse | null>(null);
  const [documents, setDocuments] = useState<IndexedDocument[]>([]);
  const [cvTitle, setCvTitle] = useState<string | null>(null);
  const [jobTitle, setJobTitle] = useState<string | null>(null);
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
      const payload = await readApiResponse<MatchApiResponse>(response);

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
    <Card withBorder radius="md" padding="lg" data-tour="match-card">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start">
          <div>
            <Title order={3} size="h4">
              CV-job match
            </Title>
            <Text size="sm" c="dimmed" mt={4}>
              Select one indexed CV and one job document. The app extracts a job-specific rubric
              first, then scores the CV against those requirements.
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
  );
}

function MatchScoreResult({ result }: { result: MatchResponse }) {
  const rubricCount =
    result.rubric.mustHave.length + result.rubric.niceToHave.length + result.rubric.domainContext.length;

  return (
    <Alert color="teal" variant="light" title={`CV-job match: ${result.score}/100`}>
      <Stack gap="md">
        <Progress value={result.score} color={getScoreColor(result.score)} />
        <Text size="sm">{result.summary}</Text>
        <Text size="xs" c="dimmed">
          Score is based on requirements extracted from the selected job description, not a fixed
          AI Engineer checklist.
        </Text>
        <Paper withBorder radius="sm" p="sm">
          <Stack gap="sm">
            <Group justify="space-between" align="flex-start">
              <div>
                <Text fw={700} size="sm">
                  Extracted job rubric
                </Text>
                <Text size="xs" c="dimmed">
                  {rubricCount > 0
                    ? `${rubricCount} requirement${rubricCount === 1 ? "" : "s"} found in the job document.`
                    : "No structured requirements were extracted; the scoring prompt still received the full job text."}
                </Text>
              </div>
              <Group gap="xs">
                {result.rubric.roleTitle ? (
                  <Badge variant="light" color="gray">
                    {result.rubric.roleTitle}
                  </Badge>
                ) : null}
                {result.rubric.seniority ? (
                  <Badge variant="light" color="gray">
                    {result.rubric.seniority}
                  </Badge>
                ) : null}
              </Group>
            </Group>
            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="sm">
              <RubricRequirementGroup
                color="red"
                requirements={result.rubric.mustHave}
                title="Must-have"
              />
              <RubricRequirementGroup
                color="yellow"
                requirements={result.rubric.niceToHave}
                title="Nice-to-have"
              />
              <RubricRequirementGroup
                color="gray"
                requirements={result.rubric.domainContext}
                title="Domain/context"
              />
            </SimpleGrid>
          </Stack>
        </Paper>
        {result.requirementMatches.length > 0 ? (
          <Stack gap="xs">
            <Text fw={700} size="sm">
              Requirement match
            </Text>
            <Table.ScrollContainer minWidth={720}>
              <Table verticalSpacing="xs">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Requirement</Table.Th>
                    <Table.Th>Category</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Evidence</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {result.requirementMatches.map((match, index) => (
                    <Table.Tr key={`${match.requirement}-${match.status}-${index}`}>
                      <Table.Td>{match.requirement}</Table.Td>
                      <Table.Td>
                        <Badge size="sm" variant="light" color={getRequirementCategoryColor(match.category)}>
                          {getRequirementCategoryLabel(match.category)}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Badge size="sm" variant="light" color={getRequirementStatusColor(match.status)}>
                          {match.status}
                        </Badge>
                      </Table.Td>
                      <Table.Td>{match.evidence.join("; ") || "No direct evidence."}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          </Stack>
        ) : null}
        <Text fw={700} size="sm">
          Quick summary
        </Text>
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

function RubricRequirementGroup({
  color,
  requirements,
  title,
}: {
  color: string;
  requirements: JobRequirement[];
  title: string;
}) {
  return (
    <Paper withBorder radius="sm" p="sm">
      <Stack gap="xs">
        <Group justify="space-between">
          <Badge variant="light" color={color}>
            {title}
          </Badge>
          <Text size="xs" c="dimmed">
            {requirements.length}
          </Text>
        </Group>
        {requirements.length > 0 ? (
          requirements.map((requirement) => (
            <Stack key={`${requirement.category}-${requirement.label}`} gap={4}>
              <Group gap="xs" align="center">
                <Text size="sm" fw={600}>
                  {requirement.label}
                </Text>
                <Badge size="xs" variant="outline" color="gray">
                  {requirement.importance}
                </Badge>
              </Group>
              {requirement.evidence.length > 0 ? (
                <Text size="xs" c="dimmed">
                  {requirement.evidence.join("; ")}
                </Text>
              ) : null}
            </Stack>
          ))
        ) : (
          <Text size="xs" c="dimmed">
            None extracted.
          </Text>
        )}
      </Stack>
    </Paper>
  );
}

function EvalsPanel({
  embeddingProfile,
  onNavigate,
}: {
  embeddingProfile: EmbeddingProfileId;
  onNavigate: (tab: TourTab) => void;
}) {
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
      const payload = await readApiResponse<QuickEvalRunResponse>(response);

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
                description="Document that should appear in TopK"
                onChange={setTargetTitle}
                placeholder="Choose indexed document"
                searchable
                value={selectedTargetTitle}
                style={{ flex: 1 }}
              />
              <Select
                data={sourceTypeSelectData}
                label="Source type"
                description="Filter inventory"
                onChange={(value) => setSourceType((value as SourceType | null) ?? "cv")}
                value={sourceType}
                w={160}
              />
              <NumberInput
                description="Retrieval depth"
                label="TopK"
                min={1}
                max={20}
                onChange={setTopK}
                value={topK}
                w={130}
              />
            </Group>
            <Textarea
              label="Queries"
              description="One query per line. Each query should represent evidence you expect in the selected document."
              autosize
              minRows={3}
              onChange={(event) => setQueries(event.currentTarget.value)}
              value={queries}
            />
          </Stack>
          {run ? (
            <Stack gap="md" data-tour="evals-results">
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="sm">
                <MetricCard label="Recall@K" value={run.recallAtK.toFixed(2)} detail="expected document found" />
                <MetricCard label="MRR" value={run.mrr.toFixed(2)} detail="rank quality" />
                <MetricCard label="Pass rate" value={`${Math.round(run.passRate)}%`} detail="queries passed" />
                <MetricCard label="Latency" value={formatLatency(run.averageLatencyMs)} detail={run.model} />
              </SimpleGrid>
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
            <div data-tour="evals-results">
              <EmptyState
                icon={<Gauge size={20} />}
                title="Run a retrieval quality check"
                description="Choose the expected document and test whether representative queries retrieve it in TopK."
                actions={
                  <>
                    <Button size="xs" onClick={handleRunPdfEvals} loading={isRunning}>
                      Run evals
                    </Button>
                    <Button size="xs" variant="default" onClick={() => onNavigate("documents")}>
                      Add documents
                    </Button>
                  </>
                }
              />
            </div>
          )}
        </Stack>
      </Card>
    </Stack>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <Paper withBorder radius="md" p="lg">
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text fw={700} size="xl" mt={4}>
        {value}
      </Text>
      <Text size="sm" c="dimmed" mt={2}>
        {detail}
      </Text>
    </Paper>
  );
}

function EmptyState({
  actions,
  description,
  icon,
  title,
}: {
  actions?: ReactNode;
  description: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <Paper withBorder radius="md" p="lg">
      <Group align="flex-start" gap="md">
        <ThemeIcon variant="light" size="xl" radius="md">
          {icon}
        </ThemeIcon>
        <Stack gap={8} style={{ flex: 1 }}>
          <Text fw={700}>{title}</Text>
          <Text c="dimmed" size="sm">
            {description}
          </Text>
          {actions ? (
            <Group gap="xs" mt={4}>
              {actions}
            </Group>
          ) : null}
        </Stack>
      </Group>
    </Paper>
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
  const payload = await readApiResponse<DocumentsResponse>(response);

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

function getDangerActionMessage(action: "reset" | "importReplace" | "textReplace" | null) {
  if (action === "reset") {
    return "Reset collection recreates the Qdrant collection for the selected embedding profile. Existing indexed chunks will be removed.";
  }

  if (action === "importReplace") {
    return "Replace all resets the Qdrant collection before importing this PDF. Current indexed documents will no longer be searchable.";
  }

  if (action === "textReplace") {
    return "Replace all resets the Qdrant collection before indexing this text document. Current indexed documents will no longer be searchable.";
  }

  return "This action changes the Qdrant collection.";
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

function getRequirementStatusColor(status: RequirementMatch["status"]) {
  if (status === "strong") {
    return "green";
  }

  if (status === "partial") {
    return "yellow";
  }

  return "red";
}

function getRequirementCategoryColor(category: RequirementMatch["category"]) {
  if (category === "must-have") {
    return "red";
  }

  if (category === "nice-to-have") {
    return "yellow";
  }

  return "gray";
}

function getRequirementCategoryLabel(category: RequirementMatch["category"]) {
  if (category === "must-have") {
    return "Must-have";
  }

  if (category === "nice-to-have") {
    return "Nice-to-have";
  }

  return "Domain/context";
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
