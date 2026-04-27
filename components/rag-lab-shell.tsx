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
import { chunkDocuments, createDocumentId } from "@/lib/chunking";
import { seedDocuments } from "@/lib/seed-documents";
import type { SourceType } from "@/lib/types";

const seedChunks = chunkDocuments(seedDocuments);
const candidateChunk = seedChunks.find((chunk) => chunk.sourceType === "cv");
const roleChunk = seedChunks.find((chunk) => chunk.sourceType === "job");

const indexedDocuments = seedDocuments.map((document, index) => ({
  title: document.title,
  type: getSourceTypeLabel(document.sourceType),
  chunks: seedChunks.filter((chunk) => chunk.documentId === createDocumentId(document, index)).length,
  status: "Seeded",
}));

const searchResults = [
  {
    title: candidateChunk?.title ?? "Candidate profile",
    chunk: (candidateChunk?.chunkIndex ?? 0) + 1,
    score: 0.91,
    text:
      candidateChunk?.text ??
      "Daily work with Next.js, Node.js, TypeScript, AI coding tools, and LLM-driven product workflows.",
  },
  {
    title: roleChunk?.title ?? "AI Engineer role",
    chunk: (roleChunk?.chunkIndex ?? 0) + 1,
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
                  Next.js, Node.js, Mantine, Qdrant, OpenAI, OpenRouter
                </Text>
              </div>
            </Group>
            <Group gap="xs" visibleFrom="sm">
              <Badge variant="light" color="teal">
                Local Qdrant
              </Badge>
              <Badge variant="light" color="blue">
                OpenAI embeddings
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
              <Button leftSection={<Sparkles size={16} />} variant="light">
                Seed documents
              </Button>
              <Button leftSection={<UploadCloud size={16} />}>Import text</Button>
            </Group>
          </Group>
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
  return (
    <Stack gap="md">
      <Card withBorder radius="md" padding="lg">
        <Stack gap="md">
          <Group align="flex-end">
            <Textarea
              label="Query"
              autosize
              minRows={2}
              defaultValue="AI engineer with RAG, vector search, Next.js and TypeScript experience"
              style={{ flex: 1 }}
            />
            <NumberInput label="TopK" defaultValue={5} min={1} max={20} w={110} />
            <Button leftSection={<Search size={16} />}>Search</Button>
          </Group>
          <Divider />
          <Stack gap="sm">
            {searchResults.map((result) => (
              <Paper key={`${result.title}-${result.chunk}`} withBorder radius="md" p="md">
                <Group justify="space-between" align="flex-start">
                  <div>
                    <Group gap="xs">
                      <Text fw={600}>{result.title}</Text>
                      <Badge variant="light">chunk {result.chunk}</Badge>
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
  return (
    <Stack gap="md">
      <Card withBorder radius="md" padding="lg">
        <Stack gap="md">
          <Group align="flex-end">
            <Textarea
              label="Question"
              autosize
              minRows={2}
              defaultValue="How well does this candidate match the AI Engineer role?"
              style={{ flex: 1 }}
            />
            <Select
              label="Prompt"
              defaultValue="rag_strict_v2"
              data={["rag_v1", "rag_strict_v2", "match_score_v1"]}
              w={190}
            />
            <Button leftSection={<Bot size={16} />}>Ask</Button>
          </Group>
          <Alert color="blue" variant="light" title="Answer preview">
            Match score: 84/100. The candidate is a strong match for Next.js,
            TypeScript, Node.js, AI developer tooling, semantic search, and
            RAG workflows. Sources: Candidate profile chunk 7, AI Engineer role
            chunk 3.
          </Alert>
          <JsonInput
            label="Retrieved context"
            autosize
            minRows={7}
            value={JSON.stringify(searchResults, null, 2)}
            readOnly
          />
        </Stack>
      </Card>
    </Stack>
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
