"use client";

import {
  Alert,
  Badge,
  Button,
  Card,
  Divider,
  Fieldset,
  FileInput,
  Group,
  Modal,
  SimpleGrid,
  Stack,
  TagsInput,
  Text,
  TextInput,
  Textarea,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  Download,
  FileDown,
  Plus,
  Sparkles,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { readApiResponse } from "@/lib/api-response";
import { createEmptyCvDraft, normalizeCvDraft } from "@/lib/cv/draft";
import { cvDraftToMarkdown } from "@/lib/cv/markdown";
import { CV_MAKER_STORAGE_KEY, type CvDraft } from "@/lib/cv/types";

type CvImportPdfResponse = {
  filename: string;
  text: string;
  pageCount: number;
  extractedCharacters: number;
  draft: CvDraft;
  parser: "heuristic";
  error?: string;
};

type CvAiParseResponse = {
  draft: CvDraft;
  model: string;
  error?: string;
};

type CvMakerStorage = {
  draft: CvDraft;
  sourceText: string;
  sourceFilename: string;
};
type PersonalTextField = Exclude<keyof CvDraft["personal"], "links">;

export function CvMakerPanel() {
  const [draft, setDraft] = useState<CvDraft>(() => createEmptyCvDraft());
  const [sourceText, setSourceText] = useState("");
  const [sourceFilename, setSourceFilename] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isParsingAi, setIsParsingAi] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isAiConfirmOpen, setIsAiConfirmOpen] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const saved = readStoredDraft();

      if (saved) {
        setDraft(saved.draft);
        setSourceText(saved.sourceText);
        setSourceFilename(saved.sourceFilename);
      }

      setIsHydrated(true);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    window.localStorage.setItem(
      CV_MAKER_STORAGE_KEY,
      JSON.stringify({
        draft,
        sourceText,
        sourceFilename,
      } satisfies CvMakerStorage),
    );
  }, [draft, isHydrated, sourceFilename, sourceText]);

  async function handleImportPdf() {
    if (!importFile) {
      notifications.show({
        title: "CV import failed",
        message: "Choose a searchable PDF file first.",
        color: "red",
      });
      return;
    }

    setIsImporting(true);

    try {
      const formData = new FormData();
      formData.append("file", importFile);

      const response = await fetch("/api/cv/import-pdf", {
        method: "POST",
        body: formData,
      });
      const payload = await readApiResponse<CvImportPdfResponse>(response);

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not import CV PDF.");
      }

      setDraft(normalizeCvDraft(payload.draft));
      setSourceText(payload.text);
      setSourceFilename(payload.filename);
      notifications.show({
        title: "CV imported",
        message: `${payload.extractedCharacters} characters extracted from ${payload.pageCount} page(s).`,
        color: "green",
      });
    } catch (error) {
      notifications.show({
        title: "CV import failed",
        message: getErrorMessage(error),
        color: "red",
      });
    } finally {
      setIsImporting(false);
    }
  }

  async function handleImproveWithAi() {
    if (!sourceText.trim()) {
      notifications.show({
        title: "AI parse unavailable",
        message: "Import a searchable CV PDF before using AI parsing.",
        color: "red",
      });
      return;
    }

    setIsParsingAi(true);

    try {
      const response = await fetch("/api/cv/parse-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: sourceText,
          currentDraft: draft,
        }),
      });
      const payload = await readApiResponse<CvAiParseResponse>(response);

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not improve CV draft with AI.");
      }

      setDraft(normalizeCvDraft(payload.draft));
      setIsAiConfirmOpen(false);
      notifications.show({
        title: "CV draft improved",
        message: `Parsed with ${payload.model}`,
        color: "green",
      });
    } catch (error) {
      notifications.show({
        title: "AI parse failed",
        message: getErrorMessage(error),
        color: "red",
      });
    } finally {
      setIsParsingAi(false);
    }
  }

  function handleDownloadMarkdown() {
    downloadBlob(
      cvDraftToMarkdown(draft),
      "text/markdown;charset=utf-8",
      getDownloadFilename(draft, "md"),
    );
  }

  async function handleDownloadPdf() {
    setIsExportingPdf(true);

    try {
      const response = await fetch("/api/cv/export/pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          draft,
          template: "classic-a4",
        }),
      });

      if (!response.ok) {
        const payload = await readApiResponse<{ error?: string }>(response);
        throw new Error(payload.error ?? "Could not export CV PDF.");
      }

      const blob = await response.blob();
      downloadBlob(blob, "application/pdf", getDownloadFilename(draft, "pdf"));
    } catch (error) {
      notifications.show({
        title: "PDF export failed",
        message: getErrorMessage(error),
        color: "red",
      });
    } finally {
      setIsExportingPdf(false);
    }
  }

  function handleClearDraft() {
    setDraft(createEmptyCvDraft());
    setSourceText("");
    setSourceFilename("");
    setImportFile(null);
    window.localStorage.removeItem(CV_MAKER_STORAGE_KEY);
    notifications.show({
      title: "CV draft cleared",
      message: "Local CV Maker draft was removed from this browser.",
      color: "green",
    });
  }

  return (
    <Stack gap="md">
      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
        <Card withBorder radius="md" padding="lg" data-tour="cv-import">
          <Stack gap="md">
            <Group justify="space-between" align="flex-start">
              <div>
                <Title order={3} size="h4">
                  Import CV PDF
                </Title>
                <Text size="sm" c="dimmed" mt={4}>
                  Start from a searchable PDF. This does not index anything in Qdrant.
                </Text>
              </div>
              {sourceFilename ? <Badge variant="light">{sourceFilename}</Badge> : null}
            </Group>
            <FileInput
              accept="application/pdf"
              clearable
              label="CV PDF"
              leftSection={<UploadCloud size={16} />}
              onChange={setImportFile}
              placeholder="Choose searchable CV PDF"
              value={importFile}
            />
            <Group>
              <Button
                leftSection={<UploadCloud size={16} />}
                loading={isImporting}
                onClick={handleImportPdf}
              >
                Import PDF
              </Button>
              <Button color="red" leftSection={<Trash2 size={16} />} onClick={handleClearDraft} variant="light">
                Clear draft
              </Button>
            </Group>
            <Alert color="blue" variant="light">
              The first pass uses local heuristics. Use AI parsing only if you want to send the extracted CV
              text to OpenRouter for better structure.
            </Alert>
            <Textarea
              autosize
              label="Extracted text preview"
              minRows={10}
              placeholder="Extracted CV text will appear here after PDF import"
              readOnly
              value={sourceText}
            />
          </Stack>
        </Card>

        <Card withBorder radius="md" padding="lg" data-tour="cv-export">
          <Stack gap="md">
            <Group justify="space-between" align="flex-start">
              <div>
                <Title order={3} size="h4">
                  Export
                </Title>
                <Text size="sm" c="dimmed" mt={4}>
                  Download a regenerated CV from the structured draft.
                </Text>
              </div>
              <Badge color="blue" variant="light">
                classic-a4
              </Badge>
            </Group>
            <Group>
              <Button leftSection={<Download size={16} />} onClick={handleDownloadMarkdown} variant="default">
                Download MD
              </Button>
              <Button
                leftSection={<FileDown size={16} />}
                loading={isExportingPdf}
                onClick={handleDownloadPdf}
              >
                Download PDF
              </Button>
              <Button
                data-tour="cv-ai"
                disabled={!sourceText.trim()}
                leftSection={<Sparkles size={16} />}
                onClick={() => setIsAiConfirmOpen(true)}
                variant="light"
              >
                Improve with AI
              </Button>
            </Group>
            <Alert color="yellow" variant="light">
              PDF export uses an A4 template with automatic wrapping. It may flow to a second page for longer
              CVs.
            </Alert>
          </Stack>
        </Card>
      </SimpleGrid>

      <Card withBorder radius="md" padding="lg" data-tour="cv-editor">
        <Stack gap="lg">
          <Group justify="space-between">
            <Title order={3} size="h4">
              Editable CV draft
            </Title>
            <Badge variant="light">{draft.experience.length} experience items</Badge>
          </Group>

          <Fieldset legend="Personal info">
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
              <TextInput
                label="Name"
                onChange={(event) => updatePersonal("name", event.currentTarget.value)}
                value={draft.personal.name}
              />
              <TextInput
                label="Headline"
                onChange={(event) => updatePersonal("headline", event.currentTarget.value)}
                value={draft.personal.headline}
              />
              <TextInput
                label="Email"
                onChange={(event) => updatePersonal("email", event.currentTarget.value)}
                value={draft.personal.email}
              />
              <TextInput
                label="Phone"
                onChange={(event) => updatePersonal("phone", event.currentTarget.value)}
                value={draft.personal.phone}
              />
              <TextInput
                label="Location"
                onChange={(event) => updatePersonal("location", event.currentTarget.value)}
                value={draft.personal.location}
              />
              <TextInput
                label="Website"
                onChange={(event) => updatePersonal("website", event.currentTarget.value)}
                value={draft.personal.website}
              />
            </SimpleGrid>
            <TagsInput
              label="Links"
              mt="sm"
              onChange={(links) =>
                setDraft((current) => ({
                  ...current,
                  personal: {
                    ...current.personal,
                    links: links.map((url) => ({ label: getLinkLabel(url), url })),
                  },
                }))
              }
              placeholder="Add LinkedIn, GitHub, portfolio"
              value={draft.personal.links.map((link) => link.url)}
            />
          </Fieldset>

          <Fieldset legend="Summary">
            <Textarea
              autosize
              minRows={4}
              onChange={(event) => setDraft((current) => ({ ...current, summary: event.currentTarget.value }))}
              value={draft.summary}
            />
          </Fieldset>

          <Fieldset legend="Skills">
            <TagsInput
              onChange={(skills) => setDraft((current) => ({ ...current, skills }))}
              placeholder="Add skill"
              value={draft.skills}
            />
          </Fieldset>

          <EditableExperienceSection draft={draft} setDraft={setDraft} />
          <EditableProjectsSection draft={draft} setDraft={setDraft} />
          <EditableEducationSection draft={draft} setDraft={setDraft} />

          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
            <Fieldset legend="Certifications">
              <TagsInput
                onChange={(certifications) => setDraft((current) => ({ ...current, certifications }))}
                placeholder="Add certification"
                value={draft.certifications}
              />
            </Fieldset>
            <Fieldset legend="Languages">
              <TagsInput
                onChange={(languages) => setDraft((current) => ({ ...current, languages }))}
                placeholder="Add language"
                value={draft.languages}
              />
            </Fieldset>
          </SimpleGrid>
        </Stack>
      </Card>

      <Modal
        centered
        opened={isAiConfirmOpen}
        onClose={() => setIsAiConfirmOpen(false)}
        title="Improve CV with AI"
      >
        <Stack gap="md">
          <Alert color="yellow" variant="light">
            This sends the extracted CV text to OpenRouter to produce a cleaner structured draft.
          </Alert>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setIsAiConfirmOpen(false)}>
              Cancel
            </Button>
            <Button leftSection={<Sparkles size={16} />} loading={isParsingAi} onClick={handleImproveWithAi}>
              Send to OpenRouter
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );

  function updatePersonal(field: PersonalTextField, value: string) {
    setDraft((current) => ({
      ...current,
      personal: {
        ...current.personal,
        [field]: value,
      },
    }));
  }
}

function EditableExperienceSection({
  draft,
  setDraft,
}: {
  draft: CvDraft;
  setDraft: Dispatch<SetStateAction<CvDraft>>;
}) {
  return (
    <Fieldset legend="Experience">
      <Stack gap="sm">
        {draft.experience.map((item, index) => (
          <Stack key={`${item.role}-${item.company}-${index}`} gap="sm">
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
              <TextInput
                label="Role"
                onChange={(event) => updateExperience(index, { role: event.currentTarget.value })}
                value={item.role}
              />
              <TextInput
                label="Company"
                onChange={(event) => updateExperience(index, { company: event.currentTarget.value })}
                value={item.company}
              />
              <TextInput
                label="Period"
                onChange={(event) => updateExperience(index, { period: event.currentTarget.value })}
                value={item.period}
              />
              <TextInput
                label="Location"
                onChange={(event) => updateExperience(index, { location: event.currentTarget.value })}
                value={item.location}
              />
            </SimpleGrid>
            <Textarea
              autosize
              label="Bullets"
              minRows={3}
              onChange={(event) =>
                updateExperience(index, {
                  bullets: linesToArray(event.currentTarget.value),
                })
              }
              value={arrayToLines(item.bullets)}
            />
            <Group justify="flex-end">
              <Button color="red" leftSection={<Trash2 size={16} />} onClick={() => removeExperience(index)} variant="subtle">
                Remove experience
              </Button>
            </Group>
            {index < draft.experience.length - 1 ? <Divider /> : null}
          </Stack>
        ))}
        <Button leftSection={<Plus size={16} />} onClick={addExperience} variant="default">
          Add experience
        </Button>
      </Stack>
    </Fieldset>
  );

  function updateExperience(index: number, patch: Partial<CvDraft["experience"][number]>) {
    setDraft((current) => ({
      ...current,
      experience: current.experience.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    }));
  }

  function addExperience() {
    setDraft((current) => ({
      ...current,
      experience: [
        ...current.experience,
        {
          role: "",
          company: "",
          location: "",
          period: "",
          bullets: [],
        },
      ],
    }));
  }

  function removeExperience(index: number) {
    setDraft((current) => ({
      ...current,
      experience: current.experience.filter((_, itemIndex) => itemIndex !== index),
    }));
  }
}

function EditableProjectsSection({
  draft,
  setDraft,
}: {
  draft: CvDraft;
  setDraft: Dispatch<SetStateAction<CvDraft>>;
}) {
  return (
    <Fieldset legend="Projects">
      <Stack gap="sm">
        {draft.projects.map((project, index) => (
          <Stack key={`${project.name}-${index}`} gap="sm">
            <TextInput
              label="Name"
              onChange={(event) => updateProject(index, { name: event.currentTarget.value })}
              value={project.name}
            />
            <Textarea
              autosize
              label="Description"
              minRows={2}
              onChange={(event) => updateProject(index, { description: event.currentTarget.value })}
              value={project.description}
            />
            <TagsInput
              label="Technologies"
              onChange={(technologies) => updateProject(index, { technologies })}
              value={project.technologies}
            />
            <Group justify="flex-end">
              <Button color="red" leftSection={<Trash2 size={16} />} onClick={() => removeProject(index)} variant="subtle">
                Remove project
              </Button>
            </Group>
            {index < draft.projects.length - 1 ? <Divider /> : null}
          </Stack>
        ))}
        <Button leftSection={<Plus size={16} />} onClick={addProject} variant="default">
          Add project
        </Button>
      </Stack>
    </Fieldset>
  );

  function updateProject(index: number, patch: Partial<CvDraft["projects"][number]>) {
    setDraft((current) => ({
      ...current,
      projects: current.projects.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    }));
  }

  function addProject() {
    setDraft((current) => ({
      ...current,
      projects: [...current.projects, { name: "", description: "", technologies: [] }],
    }));
  }

  function removeProject(index: number) {
    setDraft((current) => ({
      ...current,
      projects: current.projects.filter((_, itemIndex) => itemIndex !== index),
    }));
  }
}

function EditableEducationSection({
  draft,
  setDraft,
}: {
  draft: CvDraft;
  setDraft: Dispatch<SetStateAction<CvDraft>>;
}) {
  return (
    <Fieldset legend="Education">
      <Stack gap="sm">
        {draft.education.map((item, index) => (
          <Stack key={`${item.school}-${index}`} gap="sm">
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
              <TextInput
                label="School"
                onChange={(event) => updateEducation(index, { school: event.currentTarget.value })}
                value={item.school}
              />
              <TextInput
                label="Degree"
                onChange={(event) => updateEducation(index, { degree: event.currentTarget.value })}
                value={item.degree}
              />
              <TextInput
                label="Period"
                onChange={(event) => updateEducation(index, { period: event.currentTarget.value })}
                value={item.period}
              />
              <TextInput
                label="Details"
                onChange={(event) => updateEducation(index, { details: event.currentTarget.value })}
                value={item.details}
              />
            </SimpleGrid>
            <Group justify="flex-end">
              <Button color="red" leftSection={<Trash2 size={16} />} onClick={() => removeEducation(index)} variant="subtle">
                Remove education
              </Button>
            </Group>
            {index < draft.education.length - 1 ? <Divider /> : null}
          </Stack>
        ))}
        <Button leftSection={<Plus size={16} />} onClick={addEducation} variant="default">
          Add education
        </Button>
      </Stack>
    </Fieldset>
  );

  function updateEducation(index: number, patch: Partial<CvDraft["education"][number]>) {
    setDraft((current) => ({
      ...current,
      education: current.education.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    }));
  }

  function addEducation() {
    setDraft((current) => ({
      ...current,
      education: [...current.education, { school: "", degree: "", period: "", details: "" }],
    }));
  }

  function removeEducation(index: number) {
    setDraft((current) => ({
      ...current,
      education: current.education.filter((_, itemIndex) => itemIndex !== index),
    }));
  }
}

function readStoredDraft(): CvMakerStorage | null {
  try {
    const value = window.localStorage.getItem(CV_MAKER_STORAGE_KEY);

    if (!value) {
      return null;
    }

    const parsed = JSON.parse(value) as Partial<CvMakerStorage>;

    return {
      draft: normalizeCvDraft(parsed.draft),
      sourceText: typeof parsed.sourceText === "string" ? parsed.sourceText : "",
      sourceFilename: typeof parsed.sourceFilename === "string" ? parsed.sourceFilename : "",
    };
  } catch {
    return null;
  }
}

function downloadBlob(content: BlobPart | Blob, type: string, filename: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function getDownloadFilename(draft: CvDraft, extension: "md" | "pdf") {
  const slug = draft.personal.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `${slug || "cv"}-updated.${extension}`;
}

function getLinkLabel(url: string) {
  if (url.includes("linkedin.")) {
    return "LinkedIn";
  }

  if (url.includes("github.")) {
    return "GitHub";
  }

  return "Link";
}

function arrayToLines(values: string[]) {
  return values.join("\n");
}

function linesToArray(value: string) {
  return value
    .split("\n")
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}
