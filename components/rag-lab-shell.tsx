"use client";

import {
  ActionIcon,
  Accordion,
  Alert,
  AppShell,
  Badge,
  Button,
  Card,
  Collapse,
  Code,
  Container,
  Divider,
  Drawer,
  FileInput,
  Group,
  JsonInput,
  Menu,
  Modal,
  NumberInput,
  Paper,
  Popover,
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
import { useMediaQuery, useMounted } from "@mantine/hooks";
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
  Info,
  ListChecks,
  Moon,
  Play,
  PlayCircle,
  RefreshCw,
  Search,
  ShieldAlert,
  Sun,
  ChevronDown,
  ChevronUp,
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

const DOCUMENTS_CHANGED_EVENT = "ai-rag-lab-documents-changed";
const DEMO_FLOW_COLLAPSED_STORAGE_KEY = "ai-rag-lab-demo-flow-collapsed-v1";

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

const alignedFormLabelHeight = 46;

const navigationItems: Array<{
  value: TourTab;
  label: string;
  icon: typeof FileText;
}> = [
  { value: "documents", label: "Documents", icon: FileText },
  { value: "search", label: "Semantic Search", icon: Search },
  { value: "chat", label: "RAG Chat", icon: Bot },
  { value: "evals", label: "Evals", icon: Gauge },
  { value: "match", label: "CV-job match", icon: ListChecks },
  { value: "cv", label: "CV Maker", icon: FilePenLine },
];

type QdrantTarget = "local" | "cloud";

export function RagLabShell({ qdrantTarget }: { qdrantTarget: QdrantTarget }) {
  const [activeTab, setActiveTab] = useState<TourTab>("documents");
  const [embeddingProfile, setEmbeddingProfile] =
    useState<EmbeddingProfileId>(defaultEmbeddingProfileId);
  const [isTourAutoDisabled, setIsTourAutoDisabled] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isSectionDrawerOpen, setIsSectionDrawerOpen] = useState(false);
  const [tourRunId, setTourRunId] = useState(0);
  const isCompactNavigation = useMediaQuery("(max-width: 940px)", false, {
    getInitialValueInEffect: true,
  });
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

  const handleNavigate = useCallback((tab: TourTab) => {
    setActiveTab(tab);
    setIsSectionDrawerOpen(false);
  }, []);

  return (
    <AppShell header={{ height: 72 }} padding="md">
      <ProductTour
        activeTab={activeTab}
        onAutoDisabledChange={setIsTourAutoDisabled}
        runId={tourRunId}
        setActiveTab={setActiveTab}
      />
      <ProjectInfoModal
        opened={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        qdrantBadge={qdrantBadge}
      />
      <AppShell.Header>
        <Container size="xl" h="100%">
          <Group h="100%" justify="space-between" wrap="nowrap" gap="sm">
            <Group gap="sm" wrap="nowrap" data-tour="app-header" style={{ minWidth: 0 }}>
              <Database size={28} strokeWidth={1.8} style={{ flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <Title
                  order={2}
                  size="h3"
                  style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                >
                  AI RAG Lab
                </Title>
                <Text size="sm" c="dimmed" visibleFrom="md">
                  Next.js, Node.js, Mantine, Qdrant, OpenRouter
                </Text>
              </div>
            </Group>
            <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
              <Tooltip label="Project info">
                <ActionIcon
                  aria-label="Project info"
                  data-tour="project-info-button"
                  size="lg"
                  variant="light"
                  onClick={() => setIsInfoOpen(true)}
                >
                  <Info size={18} />
                </ActionIcon>
              </Tooltip>
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
            <DemoFlowPanel activeTab={activeTab} onNavigate={handleNavigate} />
            <div data-tour="section-navigation">
              {isCompactNavigation ? (
                <SectionNavigationButton activeTab={activeTab} onOpen={() => setIsSectionDrawerOpen(true)} />
              ) : (
                <Tabs.List mb="md">
                  {navigationItems.map((item) => {
                    const Icon = item.icon;

                    return (
                      <Tabs.Tab
                        key={item.value}
                        value={item.value}
                        leftSection={<Icon size={16} />}
                        data-tour={`tab-${item.value}`}
                        style={item.value === "cv" ? { marginLeft: "auto" } : undefined}
                      >
                        {item.label}
                      </Tabs.Tab>
                    );
                  })}
                </Tabs.List>
              )}
            </div>
            <SectionDrawer
              activeTab={activeTab}
              opened={isSectionDrawerOpen}
              onClose={() => setIsSectionDrawerOpen(false)}
              onNavigate={handleNavigate}
            />

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

function ProjectInfoModal({
  opened,
  onClose,
  qdrantBadge,
}: {
  opened: boolean;
  onClose: () => void;
  qdrantBadge: { color: string; label: string };
}) {
  return (
    <Modal opened={opened} onClose={onClose} title="Project info" centered size="lg">
      <Stack gap="md">
        <div>
          <Text fw={700}>AI RAG Lab</Text>
          <Text size="sm" c="dimmed">
            A demo application showing a practical AI Engineer workflow: document import, embeddings,
            Qdrant retrieval, RAG chat, retrieval evals, CV-job match, and CV Maker.
          </Text>
        </div>

        <Group gap="xs">
          <Badge variant="light">Next.js</Badge>
          <Badge variant="light">Node.js</Badge>
          <Badge variant="light">TypeScript</Badge>
          <Badge variant="light">Mantine UI</Badge>
          <Badge variant="light" color={qdrantBadge.color}>
            {qdrantBadge.label}
          </Badge>
          <Badge variant="light" color="blue">
            OpenRouter embeddings
          </Badge>
          <Badge variant="light" color="violet">
            OpenRouter chat
          </Badge>
        </Group>

        <Divider />

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          <Paper withBorder radius="md" p="sm">
            <Text fw={700} size="sm">
              Retrieval pipeline
            </Text>
            <Text size="sm" c="dimmed">
              PDF/text import -&gt; chunking -&gt; embeddings -&gt; Qdrant vector index -&gt;
              semantic search and RAG context.
            </Text>
          </Paper>
          <Paper withBorder radius="md" p="sm">
            <Text fw={700} size="sm">
              Evaluation and scoring
            </Text>
            <Text size="sm" c="dimmed">
              Evals measure retrieval quality. CV-job match extracts job requirements, then scores a CV
              against that rubric.
            </Text>
          </Paper>
          <Paper withBorder radius="md" p="sm">
            <Text fw={700} size="sm">
              CV Maker and LinkedIn comparison
            </Text>
            <Text size="sm" c="dimmed">
              Searchable CV PDFs can be parsed into an editable draft, optionally improved with AI,
              compared with user-provided LinkedIn export data, and exported as Markdown or a new A4 PDF.
            </Text>
          </Paper>
          <Paper withBorder radius="md" p="sm">
            <Text fw={700} size="sm">
              Runtime
            </Text>
            <Text size="sm" c="dimmed">
              The app can use local Qdrant during development or Qdrant Cloud in deployed environments.
            </Text>
          </Paper>
        </SimpleGrid>
      </Stack>
    </Modal>
  );
}

function SectionNavigationButton({
  activeTab,
  onOpen,
}: {
  activeTab: TourTab;
  onOpen: () => void;
}) {
  const activeItem = navigationItems.find((item) => item.value === activeTab) ?? navigationItems[0];
  const Icon = activeItem.icon;

  return (
    <Button
      data-tour="section-navigation-button"
      fullWidth
      justify="space-between"
      leftSection={<Icon size={16} />}
      mb="md"
      onClick={onOpen}
      rightSection={<ChevronDown size={16} />}
      variant="default"
    >
      {activeItem.label}
    </Button>
  );
}

function SectionDrawer({
  activeTab,
  onClose,
  onNavigate,
  opened,
}: {
  activeTab: TourTab;
  onClose: () => void;
  onNavigate: (tab: TourTab) => void;
  opened: boolean;
}) {
  return (
    <Drawer opened={opened} onClose={onClose} position="bottom" title="Sections" size="md">
      <Stack gap="xs" data-tour="section-navigation-drawer">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.value === activeTab;

          return (
            <Button
              key={item.value}
              fullWidth
              justify="flex-start"
              leftSection={<Icon size={16} />}
              onClick={() => onNavigate(item.value)}
              variant={isActive ? "filled" : "subtle"}
            >
              {item.label}
            </Button>
          );
        })}
      </Stack>
    </Drawer>
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
  const [collapsedPreference, setCollapsedPreference] = useState<boolean | null>(null);
  const isMounted = useMounted();
  const shouldStartCollapsed = useMediaQuery("(max-width: 767px)", false, {
    getInitialValueInEffect: true,
  });
  const isCollapsed = isMounted ? (collapsedPreference ?? shouldStartCollapsed) : false;
  const documentCount = documents.length;
  const hasDocuments = documentCount > 0;
  const hasCv = documents.some((document) => document.sourceType === "cv");
  const hasJob = documents.some((document) => document.sourceType === "job");
  const hasMatchInputs = hasCv && hasJob;
  const readyLabel = hasMatchInputs ? "CV+Job ready" : hasCv ? "CV ready" : hasJob ? "Job ready" : "Setup needed";
  const flowStatus = `${documentCount} docs | ${readyLabel}`;
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
    {
      cta: "Open CV Maker",
      detail: "AI-assisted CV polish, LinkedIn compare and export",
      done: false,
      label: "6. CV Maker",
      tab: "cv" as TourTab,
    },
  ];

  const refreshDocuments = useCallback(async () => {
    try {
      setDocuments(await fetchDocumentInventory());
    } catch {
      setDocuments([]);
    }
  }, []);

  const loadDocuments = useCallback(async () => {
    setIsLoading(true);

    try {
      await refreshDocuments();
    } finally {
      setIsLoading(false);
    }
  }, [refreshDocuments]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setCollapsedPreference(readStoredDemoFlowCollapsedPreference());
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
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

  useEffect(() => {
    function handleDocumentsChanged() {
      void refreshDocuments();
    }

    window.addEventListener(DOCUMENTS_CHANGED_EVENT, handleDocumentsChanged);

    return () => {
      window.removeEventListener(DOCUMENTS_CHANGED_EVENT, handleDocumentsChanged);
    };
  }, [refreshDocuments]);

  function handleToggleCollapsed() {
    const nextIsCollapsed = !isCollapsed;

    setCollapsedPreference(nextIsCollapsed);
    window.localStorage.setItem(DEMO_FLOW_COLLAPSED_STORAGE_KEY, String(nextIsCollapsed));
  }

  return (
    <Paper withBorder radius="md" p="sm" mb="md" data-tour="demo-flow-panel">
      <Stack gap="sm">
        <Group justify="space-between" align="center" wrap="nowrap">
          <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
            <ThemeIcon variant="light" size="lg" radius="md">
              <ListChecks size={18} />
            </ThemeIcon>
            <div style={{ minWidth: 0 }}>
              <Text fw={700}>Demo flow</Text>
              <Text size="sm" c="dimmed" lineClamp={1}>
                {flowStatus}
              </Text>
            </div>
          </Group>
          <Group gap="xs" wrap="nowrap">
            <Tooltip label="Refresh status">
              <ActionIcon
                aria-label="Refresh demo flow status"
                loading={isLoading}
                onClick={loadDocuments}
                variant="default"
              >
                <RefreshCw size={16} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label={isCollapsed ? "Expand demo flow" : "Collapse demo flow"}>
              <ActionIcon
                aria-label={isCollapsed ? "Expand demo flow" : "Collapse demo flow"}
                onClick={handleToggleCollapsed}
                variant="light"
              >
                {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>

        <Collapse expanded={!isCollapsed}>
          <Text size="sm" c="dimmed" mb="sm">
            Recommended path for showing the AI Engineer workflow end to end.
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 6 }} spacing="xs">
            {steps.map((step) => {
              const isActive = activeTab === step.tab;
              const color = step.done ? "green" : step.disabled ? "gray" : "blue";

              return (
                <Paper
                  key={step.label}
                  withBorder
                  radius="md"
                  p="xs"
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
                    <Text size="xs" c="dimmed" mih={28}>
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
        </Collapse>
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
      emitDocumentsChanged();
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
      emitDocumentsChanged();
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
      emitDocumentsChanged();
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
              <EmbeddingProfileSelectWithInfo
                embeddingProfile={embeddingProfile}
                onEmbeddingProfileChange={onEmbeddingProfileChange}
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

function EmbeddingProfileSelectWithInfo({
  embeddingProfile,
  onEmbeddingProfileChange,
}: {
  embeddingProfile: EmbeddingProfileId;
  onEmbeddingProfileChange: (profile: EmbeddingProfileId) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedProfile = embeddingProfileOptions.find((profile) => profile.id === embeddingProfile);

  return (
    <Popover
      opened={isOpen}
      position="top"
      shadow="md"
      width={360}
      withArrow
      onChange={setIsOpen}
    >
      <Popover.Target>
        <div
          data-tour="embedding-profile"
          onBlur={() => setIsOpen(false)}
          onFocus={() => setIsOpen(true)}
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          <Select
            data={embeddingProfileSelectData}
            label="Embedding profile"
            onChange={(value) =>
              onEmbeddingProfileChange((value as EmbeddingProfileId | null) ?? defaultEmbeddingProfileId)
            }
            value={embeddingProfile}
            w={230}
          />
        </div>
      </Popover.Target>
      <Popover.Dropdown>
        {selectedProfile ? (
          <Stack gap={6}>
            <Text fw={700} size="sm">
              {selectedProfile.label}
            </Text>
            <Text size="sm" c="dimmed">
              {selectedProfile.description}
            </Text>
            <Group gap="xs">
              <Badge variant="light">Model: {selectedProfile.model}</Badge>
              <Badge variant="light">{selectedProfile.dimensions} dimensions</Badge>
            </Group>
            <Text size="xs" c="dimmed">
              Use one embedding profile per Qdrant collection. Changing dimensions requires a
              collection reset before importing new chunks.
            </Text>
          </Stack>
        ) : null}
      </Popover.Dropdown>
    </Popover>
  );
}

function AlignedFormRow({
  children,
  dataTour,
  templateColumns,
}: {
  children: ReactNode;
  dataTour?: string;
  templateColumns: string;
}) {
  const isStacked = useMediaQuery("(max-width: 767px)", false, {
    getInitialValueInEffect: true,
  });

  return (
    <div
      data-tour={dataTour}
      style={{
        alignItems: "end",
        display: "grid",
        gap: "var(--mantine-spacing-sm)",
        gridTemplateColumns: isStacked ? "1fr" : templateColumns,
      }}
    >
      {children}
    </div>
  );
}

function AlignedFormField({
  children,
  description,
  label,
}: {
  children: ReactNode;
  description?: string;
  label: string;
}) {
  const isStacked = useMediaQuery("(max-width: 767px)", false, {
    getInitialValueInEffect: true,
  });

  return (
    <Stack gap={4}>
      <Stack gap={0} mih={isStacked ? undefined : alignedFormLabelHeight} justify="flex-start">
        <Text fw={600} size="sm">
          {label}
        </Text>
        {description ? (
          <Text size="xs" c="dimmed" lineClamp={2}>
            {description}
          </Text>
        ) : null}
      </Stack>
      {children}
    </Stack>
  );
}

function AlignedFormAction({ children }: { children: ReactNode }) {
  const isStacked = useMediaQuery("(max-width: 767px)", false, {
    getInitialValueInEffect: true,
  });

  return (
    <Stack gap={4}>
      {isStacked ? null : <div style={{ minHeight: alignedFormLabelHeight }} />}
      {children}
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
          <AlignedFormRow dataTour="search-form" templateColumns="minmax(0, 1fr) 110px max-content">
            <AlignedFormField
              label="Query"
              description="Describe intent, skills, or evidence you want to retrieve from indexed chunks."
            >
              <Textarea
                aria-label="Search query"
                autosize
                minRows={2}
                onChange={(event) => setQuery(event.currentTarget.value)}
                value={query}
              />
            </AlignedFormField>
            <AlignedFormField label="TopK" description="Chunks">
              <NumberInput
                aria-label="Search TopK"
                min={1}
                max={20}
                onChange={setTopK}
                value={topK}
              />
            </AlignedFormField>
            <AlignedFormAction>
              <Button
                leftSection={<Search size={16} />}
                loading={isSearching}
                onClick={handleSearch}
                data-tour="search-button"
              >
                Search
              </Button>
            </AlignedFormAction>
          </AlignedFormRow>
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
          <AlignedFormRow dataTour="chat-form" templateColumns="minmax(0, 1fr) 190px 110px max-content">
            <AlignedFormField
              label="Question"
              description="Ask a question that should be answered from indexed documents, not model memory."
            >
              <Textarea
                aria-label="RAG question"
                autosize
                minRows={2}
                onChange={(event) => setQuestion(event.currentTarget.value)}
                value={question}
              />
            </AlignedFormField>
            <AlignedFormField label="Prompt" description="Prompt version">
              <Select
                aria-label="RAG prompt version"
                data={ragPromptOptions}
                onChange={(value) => setPromptVersion((value as PromptVersion | null) ?? "rag_strict_v2")}
                value={promptVersion}
              />
            </AlignedFormField>
            <AlignedFormField label="TopK" description="Chunks">
              <NumberInput
                aria-label="RAG TopK"
                min={1}
                max={20}
                onChange={setTopK}
                value={topK}
              />
            </AlignedFormField>
            <AlignedFormAction>
              <Button
                leftSection={<Bot size={16} />}
                loading={isAsking}
                onClick={handleAsk}
                data-tour="chat-button"
              >
                Ask
              </Button>
            </AlignedFormAction>
          </AlignedFormRow>
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
        <AlignedFormRow templateColumns="minmax(0, 1fr) minmax(0, 1fr) max-content">
          <AlignedFormField label="CV document" description="Indexed sourceType: CV">
            <Select
              aria-label="CV document"
              data={cvOptions}
              onChange={setCvTitle}
              placeholder="Import a CV PDF first"
              searchable
              value={selectedCvTitle}
            />
          </AlignedFormField>
          <AlignedFormField label="Job document" description="Indexed sourceType: Job">
            <Select
              aria-label="Job document"
              data={jobOptions}
              onChange={setJobTitle}
              placeholder="Import or add a Job document first"
              searchable
              value={selectedJobTitle}
            />
          </AlignedFormField>
          <AlignedFormAction>
            <Button
              loading={isScoring}
              onClick={handleScoreMatch}
              variant="light"
              data-tour="score-match-button"
            >
              Score match
            </Button>
          </AlignedFormAction>
        </AlignedFormRow>
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
            <AlignedFormRow templateColumns="minmax(0, 1fr) 160px 130px">
              <AlignedFormField label="Expected document" description="Document that should appear in TopK">
                <Select
                  aria-label="Expected document"
                  data={documentOptions}
                  onChange={setTargetTitle}
                  placeholder="Choose indexed document"
                  searchable
                  value={selectedTargetTitle}
                />
              </AlignedFormField>
              <AlignedFormField label="Source type" description="Filter inventory">
                <Select
                  aria-label="Eval source type"
                  data={sourceTypeSelectData}
                  onChange={(value) => setSourceType((value as SourceType | null) ?? "cv")}
                  value={sourceType}
                />
              </AlignedFormField>
              <AlignedFormField label="TopK" description="Retrieval depth">
                <NumberInput
                  aria-label="Eval TopK"
                  min={1}
                  max={20}
                  onChange={setTopK}
                  value={topK}
                />
              </AlignedFormField>
            </AlignedFormRow>
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

function emitDocumentsChanged() {
  window.dispatchEvent(new Event(DOCUMENTS_CHANGED_EVENT));
}

function readStoredDemoFlowCollapsedPreference() {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.localStorage.getItem(DEMO_FLOW_COLLAPSED_STORAGE_KEY);

  if (stored === "true") {
    return true;
  }

  if (stored === "false") {
    return false;
  }

  return null;
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
