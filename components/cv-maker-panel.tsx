"use client";

import {
  Accordion,
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Divider,
  Fieldset,
  FileInput,
  Group,
  Modal,
  Paper,
  Popover,
  Select,
  SimpleGrid,
  Stack,
  Table,
  TagsInput,
  Text,
  TextInput,
  Textarea,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  Clipboard,
  Download,
  FileDown,
  CheckCircle2,
  Info,
  Link2,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { readApiResponse } from "@/lib/api-response";
import { createEmptyCvDraft, hasCvContent, normalizeCvDraft } from "@/lib/cv/draft";
import { cvDraftToMarkdown } from "@/lib/cv/markdown";
import { DEFAULT_CV_TEMPLATE, cvTemplateOptions, normalizeCvTemplateId } from "@/lib/cv/templates";
import {
  CV_MAKER_STORAGE_KEY,
  LINKEDIN_PROFILE_STORAGE_KEY,
  type CvDraft,
  type CvTemplateId,
  type LinkedInDifference,
  type LinkedInDifferenceType,
  type LinkedInProfile,
  type LinkedInSuggestion,
} from "@/lib/cv/types";

type CvImportPdfResponse = {
  filename: string;
  text: string;
  pageCount: number;
  extractedCharacters: number;
  draft: CvDraft;
  extractionMode: "layout-aware";
  parser: "layout-aware-heuristic";
  error?: string;
};

type CvAiParseResponse = {
  draft: CvDraft;
  model: string;
  error?: string;
};

type LinkedInImportResponse = {
  profile: LinkedInProfile;
  source: "zip" | "csv" | "text";
  parsedFiles: string[];
  warnings: string[];
  error?: string;
};

type LinkedInCompareResponse = {
  differences: LinkedInDifference[];
  suggestions: LinkedInSuggestion[];
  summary: {
    differences: number;
    actionable: number;
    missingInCv: number;
    conflicts: number;
    richerOnLinkedIn: number;
  };
  error?: string;
};

type LinkedInApplyResponse = {
  draft: CvDraft;
  error?: string;
};

type CvMakerStorage = {
  draft: CvDraft;
  sourceText: string;
  sourceFilename: string;
  sourceExtractionMode: string;
  template: CvTemplateId;
};
type LinkedInProfileStorage = {
  profile: LinkedInProfile | null;
  source: LinkedInImportResponse["source"] | "";
  parsedFiles: string[];
  warnings: string[];
};
type PersonalTextField = Exclude<keyof CvDraft["personal"], "links">;
type DifferenceFilter = "all" | LinkedInDifferenceType;

const differenceFilterOptions: { value: DifferenceFilter; label: string }[] = [
  { value: "all", label: "All differences" },
  { value: "missing-in-cv", label: "Missing in CV" },
  { value: "only-in-cv", label: "Only in CV" },
  { value: "conflict", label: "Conflicts" },
  { value: "richer-on-linkedin", label: "Richer on LinkedIn" },
];

export function CvMakerPanel() {
  const [draft, setDraft] = useState<CvDraft>(() => createEmptyCvDraft());
  const [sourceText, setSourceText] = useState("");
  const [sourceFilename, setSourceFilename] = useState("");
  const [sourceExtractionMode, setSourceExtractionMode] = useState("");
  const [template, setTemplate] = useState<CvTemplateId>(DEFAULT_CV_TEMPLATE);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isParsingAi, setIsParsingAi] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isAiConfirmOpen, setIsAiConfirmOpen] = useState(false);
  const [linkedInFile, setLinkedInFile] = useState<File | null>(null);
  const [linkedInText, setLinkedInText] = useState("");
  const [linkedInProfile, setLinkedInProfile] = useState<LinkedInProfile | null>(null);
  const [linkedInSource, setLinkedInSource] = useState<LinkedInImportResponse["source"] | "">("");
  const [linkedInParsedFiles, setLinkedInParsedFiles] = useState<string[]>([]);
  const [linkedInWarnings, setLinkedInWarnings] = useState<string[]>([]);
  const [linkedInDifferences, setLinkedInDifferences] = useState<LinkedInDifference[]>([]);
  const [linkedInSuggestions, setLinkedInSuggestions] = useState<LinkedInSuggestion[]>([]);
  const [selectedLinkedInSuggestionIds, setSelectedLinkedInSuggestionIds] = useState<string[]>([]);
  const [differenceFilter, setDifferenceFilter] = useState<DifferenceFilter>("all");
  const [isImportingLinkedIn, setIsImportingLinkedIn] = useState(false);
  const [isComparingLinkedIn, setIsComparingLinkedIn] = useState(false);
  const [isApplyingLinkedIn, setIsApplyingLinkedIn] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const saved = readStoredDraft();
      const linkedInSaved = readStoredLinkedInProfile();

      if (saved) {
        setDraft(saved.draft);
        setSourceText(saved.sourceText);
        setSourceFilename(saved.sourceFilename);
        setSourceExtractionMode(saved.sourceExtractionMode);
        setTemplate(saved.template);
      }

      if (linkedInSaved?.profile) {
        setLinkedInProfile(linkedInSaved.profile);
        setLinkedInSource(linkedInSaved.source);
        setLinkedInParsedFiles(linkedInSaved.parsedFiles);
        setLinkedInWarnings(linkedInSaved.warnings);
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
        sourceExtractionMode,
        template,
      } satisfies CvMakerStorage),
    );
  }, [draft, isHydrated, sourceExtractionMode, sourceFilename, sourceText, template]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    window.localStorage.setItem(
      LINKEDIN_PROFILE_STORAGE_KEY,
      JSON.stringify({
        profile: linkedInProfile,
        source: linkedInSource,
        parsedFiles: linkedInParsedFiles,
        warnings: linkedInWarnings,
      } satisfies LinkedInProfileStorage),
    );
  }, [isHydrated, linkedInParsedFiles, linkedInProfile, linkedInSource, linkedInWarnings]);

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
      setSourceExtractionMode(payload.extractionMode);
      notifications.show({
        title: "CV imported",
        message: `${payload.extractedCharacters} characters extracted with ${payload.extractionMode} mode from ${payload.pageCount} page(s).`,
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
          template,
        }),
      });

      if (!response.ok) {
        const payload = await readApiResponse<{ error?: string }>(response);
        throw new Error(payload.error ?? "Could not export CV PDF.");
      }

      const blob = await response.blob();
      downloadBlob(blob, "application/pdf", getDownloadFilename(draft, "pdf", template));
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

  async function handleImportLinkedInData() {
    if (!linkedInFile && !linkedInText.trim()) {
      notifications.show({
        title: "LinkedIn import failed",
        message: "Upload a LinkedIn ZIP/CSV export or paste profile text first.",
        color: "red",
      });
      return;
    }

    setIsImportingLinkedIn(true);

    try {
      const formData = new FormData();

      if (linkedInFile) {
        formData.append("file", linkedInFile);
      }

      if (linkedInText.trim()) {
        formData.append("text", linkedInText);
      }

      const response = await fetch("/api/cv/linkedin/import", {
        method: "POST",
        body: formData,
      });
      const payload = await readApiResponse<LinkedInImportResponse>(response);

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not import LinkedIn data.");
      }

      setLinkedInProfile(payload.profile);
      setLinkedInSource(payload.source);
      setLinkedInParsedFiles(payload.parsedFiles);
      setLinkedInWarnings(payload.warnings);
      await handleCompareLinkedIn(payload.profile);
      notifications.show({
        title: "LinkedIn data imported",
        message: `${payload.source.toUpperCase()} import parsed ${payload.parsedFiles.length} file(s).`,
        color: "green",
      });
    } catch (error) {
      notifications.show({
        title: "LinkedIn import failed",
        message: getErrorMessage(error),
        color: "red",
      });
    } finally {
      setIsImportingLinkedIn(false);
    }
  }

  async function handleCompareLinkedIn(profile = linkedInProfile) {
    if (!profile) {
      notifications.show({
        title: "LinkedIn compare unavailable",
        message: "Import LinkedIn data first.",
        color: "red",
      });
      return;
    }

    setIsComparingLinkedIn(true);

    try {
      const response = await fetch("/api/cv/linkedin/compare", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          draft,
          profile,
        }),
      });
      const payload = await readApiResponse<LinkedInCompareResponse>(response);

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not compare CV with LinkedIn.");
      }

      setLinkedInDifferences(payload.differences);
      setLinkedInSuggestions(payload.suggestions);
      setSelectedLinkedInSuggestionIds(payload.suggestions.map((suggestion) => suggestion.id));
    } catch (error) {
      notifications.show({
        title: "LinkedIn compare failed",
        message: getErrorMessage(error),
        color: "red",
      });
    } finally {
      setIsComparingLinkedIn(false);
    }
  }

  async function handleApplyLinkedInSuggestions() {
    const selectedSuggestions = linkedInSuggestions.filter((suggestion) =>
      selectedLinkedInSuggestionIds.includes(suggestion.id),
    );

    if (selectedSuggestions.length === 0) {
      notifications.show({
        title: "No LinkedIn suggestions selected",
        message: "Select at least one suggestion before applying changes.",
        color: "yellow",
      });
      return;
    }

    setIsApplyingLinkedIn(true);

    try {
      const response = await fetch("/api/cv/linkedin/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          draft,
          suggestions: selectedSuggestions,
        }),
      });
      const payload = await readApiResponse<LinkedInApplyResponse>(response);

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not apply LinkedIn suggestions.");
      }

      const nextDraft = normalizeCvDraft(payload.draft);

      setDraft(nextDraft);
      setSelectedLinkedInSuggestionIds([]);
      if (linkedInProfile) {
        await refreshLinkedInCompare(nextDraft, linkedInProfile);
      }
      notifications.show({
        title: "CV draft updated",
        message: `${selectedSuggestions.length} LinkedIn suggestion(s) applied.`,
        color: "green",
      });
    } catch (error) {
      notifications.show({
        title: "LinkedIn apply failed",
        message: getErrorMessage(error),
        color: "red",
      });
    } finally {
      setIsApplyingLinkedIn(false);
    }
  }

  async function refreshLinkedInCompare(nextDraft: CvDraft, profile: LinkedInProfile) {
    const response = await fetch("/api/cv/linkedin/compare", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        draft: nextDraft,
        profile,
      }),
    });
    const payload = await readApiResponse<LinkedInCompareResponse>(response);

    if (response.ok) {
      setLinkedInDifferences(payload.differences);
      setLinkedInSuggestions(payload.suggestions);
    }
  }

  function handleIgnoreSelectedLinkedInSuggestions() {
    setLinkedInDifferences((current) =>
      current.filter((difference) => !selectedLinkedInSuggestionIds.includes(difference.suggestionId ?? "")),
    );
    setLinkedInSuggestions((current) =>
      current.filter((suggestion) => !selectedLinkedInSuggestionIds.includes(suggestion.id)),
    );
    setSelectedLinkedInSuggestionIds([]);
  }

  async function handleCopySelectedLinkedInSuggestions() {
    const selectedSuggestions = linkedInSuggestions.filter((suggestion) =>
      selectedLinkedInSuggestionIds.includes(suggestion.id),
    );
    const text = selectedSuggestions.map((suggestion) => suggestion.label).join("\n");

    if (!text) {
      return;
    }

    await window.navigator.clipboard.writeText(text);
    notifications.show({
      title: "Suggestions copied",
      message: `${selectedSuggestions.length} suggestion(s) copied to clipboard.`,
      color: "green",
    });
  }

  function handleClearDraft() {
    setDraft(createEmptyCvDraft());
    setSourceText("");
    setSourceFilename("");
    setSourceExtractionMode("");
    setImportFile(null);
    setLinkedInProfile(null);
    setLinkedInSource("");
    setLinkedInParsedFiles([]);
    setLinkedInWarnings([]);
    setLinkedInDifferences([]);
    setLinkedInSuggestions([]);
    setSelectedLinkedInSuggestionIds([]);
    window.localStorage.removeItem(CV_MAKER_STORAGE_KEY);
    window.localStorage.removeItem(LINKEDIN_PROFILE_STORAGE_KEY);
    notifications.show({
      title: "CV draft cleared",
      message: "Local CV Maker draft was removed from this browser.",
      color: "green",
    });
  }

  const hasImportedSource = Boolean(sourceText.trim());
  const hasStructuredDraft = hasCvContent(draft);
  const hasLinkedInProfile = Boolean(linkedInProfile);
  const visibleLinkedInDifferences = linkedInDifferences.filter(
    (difference) => differenceFilter === "all" || difference.type === differenceFilter,
  );

  return (
    <Stack gap="md">
      <CvWorkflowSteps
        hasImportedSource={hasImportedSource}
        hasLinkedInProfile={hasLinkedInProfile}
        hasStructuredDraft={hasStructuredDraft}
      />
      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
        <Card withBorder radius="md" padding="lg" data-tour="cv-import">
          <Stack gap="md">
            <Group justify="space-between" align="flex-start">
              <Group gap="sm" align="flex-start" wrap="nowrap">
                <StepNumberBadge value={1} />
                <div>
                  <Title order={3} size="h4">
                    Import CV PDF
                  </Title>
                  <Text size="sm" c="dimmed" mt={4}>
                    Start from a searchable PDF. This does not index anything in Qdrant.
                  </Text>
                </div>
              </Group>
              <Group gap="xs">
                {sourceExtractionMode ? <Badge variant="light">{sourceExtractionMode}</Badge> : null}
                {sourceFilename ? <Badge variant="light">{sourceFilename}</Badge> : null}
              </Group>
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
              The first pass uses local layout-aware heuristics. Use AI parsing only if you want to send the
              extracted CV text to OpenRouter for better structure.
            </Alert>
            <Accordion variant="contained">
              <Accordion.Item value="source-text">
                <Accordion.Control>Advanced details: extracted text preview</Accordion.Control>
                <Accordion.Panel>
                  <Textarea
                    autosize
                    label="Extracted text preview"
                    minRows={10}
                    placeholder="Extracted CV text will appear here after PDF import"
                    readOnly
                    value={sourceText}
                  />
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>
          </Stack>
        </Card>

        <LinkedInCompareCard
          differences={visibleLinkedInDifferences}
          differenceFilter={differenceFilter}
          file={linkedInFile}
          isApplying={isApplyingLinkedIn}
          isComparing={isComparingLinkedIn}
          isImporting={isImportingLinkedIn}
          onApplySelected={handleApplyLinkedInSuggestions}
          onCompare={() => handleCompareLinkedIn()}
          onCopySelected={handleCopySelectedLinkedInSuggestions}
          onDifferenceFilterChange={setDifferenceFilter}
          onFileChange={setLinkedInFile}
          onIgnoreSelected={handleIgnoreSelectedLinkedInSuggestions}
          onImport={handleImportLinkedInData}
          onSelectedSuggestionIdsChange={setSelectedLinkedInSuggestionIds}
          onTextChange={setLinkedInText}
          parsedFiles={linkedInParsedFiles}
          profile={linkedInProfile}
          selectedSuggestionIds={selectedLinkedInSuggestionIds}
          source={linkedInSource}
          suggestions={linkedInSuggestions}
          text={linkedInText}
          warnings={linkedInWarnings}
        />
      </SimpleGrid>

      <Card withBorder radius="md" padding="lg" data-tour="cv-editor">
        <Stack gap="lg">
          <Group justify="space-between">
            <Group gap="sm" align="flex-start" wrap="nowrap">
              <StepNumberBadge value={2} />
              <div>
                <Title order={3} size="h4">
                  Editable CV draft
                </Title>
                <Text size="sm" c="dimmed" mt={4}>
                  Review structured fields before exporting the regenerated CV.
                </Text>
              </div>
            </Group>
            <Badge variant="light">{draft.experience.length} experience items</Badge>
          </Group>

          <Accordion multiple defaultValue={["basics", "experience"]} variant="separated">
            <Accordion.Item value="basics">
              <Accordion.Control>Personal info, summary and skills</Accordion.Control>
              <Accordion.Panel>
                <Stack gap="md">
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
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, summary: event.currentTarget.value }))
                      }
                      value={draft.summary}
                    />
                  </Fieldset>

                  <Fieldset legend="Aspirations">
                    <Textarea
                      autosize
                      minRows={3}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, aspirations: event.currentTarget.value }))
                      }
                      value={draft.aspirations}
                    />
                  </Fieldset>

                  <Fieldset legend="Skills">
                    <TagsInput
                      onChange={(skills) => setDraft((current) => ({ ...current, skills }))}
                      placeholder="Add skill"
                      value={draft.skills}
                    />
                  </Fieldset>

                  <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                    <Fieldset legend="Certifications">
                      <TagsInput
                        onChange={(certifications) =>
                          setDraft((current) => ({ ...current, certifications }))
                        }
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
              </Accordion.Panel>
            </Accordion.Item>

            <Accordion.Item value="experience">
              <Accordion.Control>Experience ({draft.experience.length})</Accordion.Control>
              <Accordion.Panel>
                <EditableExperienceSection draft={draft} setDraft={setDraft} />
              </Accordion.Panel>
            </Accordion.Item>

            <Accordion.Item value="projects">
              <Accordion.Control>Projects ({draft.projects.length})</Accordion.Control>
              <Accordion.Panel>
                <EditableProjectsSection draft={draft} setDraft={setDraft} />
              </Accordion.Panel>
            </Accordion.Item>

            <Accordion.Item value="education">
              <Accordion.Control>Education ({draft.education.length})</Accordion.Control>
              <Accordion.Panel>
                <EditableEducationSection draft={draft} setDraft={setDraft} />
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </Stack>
      </Card>

      <Card withBorder radius="md" padding="lg" data-tour="cv-export" style={{ alignSelf: "start" }}>
        <Stack gap="md">
          <Group justify="space-between" align="flex-start">
            <Group gap="sm" align="flex-start" wrap="nowrap">
              <StepNumberBadge value={4} />
              <div>
                <Title order={3} size="h4">
                  Export
                </Title>
                <Text size="sm" c="dimmed" mt={4}>
                  Download a regenerated CV from the structured draft.
                </Text>
              </div>
            </Group>
            <Badge color="blue" variant="light">
              {template}
            </Badge>
          </Group>
          <Select
            allowDeselect={false}
            data={cvTemplateOptions}
            label="PDF template"
            onChange={(value) => setTemplate(normalizeCvTemplateId(value))}
            value={template}
          />
          <Group>
            <Button
              disabled={!hasStructuredDraft}
              leftSection={<Download size={16} />}
              onClick={handleDownloadMarkdown}
              variant="default"
            >
              Download MD
            </Button>
            <Button
              disabled={!hasStructuredDraft}
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
            PDF export uses an A4 template with automatic wrapping. It may flow to a second page for longer CVs.
          </Alert>
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

function LinkedInCompareCard({
  differences,
  differenceFilter,
  file,
  isApplying,
  isComparing,
  isImporting,
  onApplySelected,
  onCompare,
  onCopySelected,
  onDifferenceFilterChange,
  onFileChange,
  onIgnoreSelected,
  onImport,
  onSelectedSuggestionIdsChange,
  onTextChange,
  parsedFiles,
  profile,
  selectedSuggestionIds,
  source,
  suggestions,
  text,
  warnings,
}: {
  differences: LinkedInDifference[];
  differenceFilter: DifferenceFilter;
  file: File | null;
  isApplying: boolean;
  isComparing: boolean;
  isImporting: boolean;
  onApplySelected: () => void;
  onCompare: () => void;
  onCopySelected: () => void;
  onDifferenceFilterChange: (value: DifferenceFilter) => void;
  onFileChange: (file: File | null) => void;
  onIgnoreSelected: () => void;
  onImport: () => void;
  onSelectedSuggestionIdsChange: (ids: string[]) => void;
  onTextChange: (value: string) => void;
  parsedFiles: string[];
  profile: LinkedInProfile | null;
  selectedSuggestionIds: string[];
  source: LinkedInImportResponse["source"] | "";
  suggestions: LinkedInSuggestion[];
  text: string;
  warnings: string[];
}) {
  const actionableVisibleIds = differences
    .map((difference) => difference.suggestionId)
    .filter((id): id is string => Boolean(id));
  const allVisibleSelected =
    actionableVisibleIds.length > 0 &&
    actionableVisibleIds.every((id) => selectedSuggestionIds.includes(id));

  return (
    <Card withBorder radius="md" padding="lg" data-tour="cv-linkedin">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start">
          <Group gap="sm" align="flex-start" wrap="nowrap">
            <StepNumberBadge value={3} />
            <div>
              <Group gap="xs" align="center">
                <Title order={3} size="h4">
                  Compare with LinkedIn
                </Title>
                <LinkedInDataHelp />
              </Group>
              <Text size="sm" c="dimmed" mt={4}>
                Import data you provide, review differences, then apply selected suggestions.
              </Text>
            </div>
          </Group>
          {source ? <Badge variant="light">{source.toUpperCase()}</Badge> : null}
        </Group>

        <Alert color="blue" icon={<Link2 size={16} />} variant="light">
          This app does not log in to LinkedIn and does not scrape profiles. Use the official LinkedIn data
          export ZIP/CSV or paste profile text manually.
        </Alert>

        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
          <FileInput
            accept=".zip,.csv,application/zip,application/x-zip-compressed,text/csv"
            clearable
            label="LinkedIn ZIP or CSV"
            leftSection={<Link2 size={16} />}
            onChange={onFileChange}
            placeholder="Choose official LinkedIn export"
            value={file}
          />
          <Textarea
            autosize
            label="Paste LinkedIn profile text"
            minRows={3}
            onChange={(event) => onTextChange(event.currentTarget.value)}
            placeholder="Paste profile text as a fallback"
            value={text}
          />
        </SimpleGrid>

        <Group>
          <Button leftSection={<UploadCloud size={16} />} loading={isImporting} onClick={onImport}>
            Import LinkedIn data
          </Button>
          <Button
            disabled={!profile}
            leftSection={<RefreshCw size={16} />}
            loading={isComparing}
            onClick={onCompare}
            variant="default"
          >
            Compare again
          </Button>
        </Group>

        {profile ? (
          <Stack gap="sm">
            <Group gap="xs">
              <Badge variant="light">{profile.positions.length} positions</Badge>
              <Badge variant="light">{profile.skills.length} skills</Badge>
              <Badge variant="light">{profile.education.length} education</Badge>
              <Badge variant="light">{profile.certifications.length} certifications</Badge>
            </Group>
            <Text size="sm" c="dimmed">
              {getLinkedInProfileSummary(profile)}
            </Text>
          </Stack>
        ) : null}

        {parsedFiles.length > 0 ? (
          <Text size="xs" c="dimmed">
            Parsed files: {parsedFiles.join(", ")}
          </Text>
        ) : null}

        {warnings.length > 0 ? (
          <Alert color="yellow" variant="light">
            {warnings.join(" ")}
          </Alert>
        ) : null}

        <Divider />

        <Group justify="space-between" align="flex-end">
          <Select
            allowDeselect={false}
            data={differenceFilterOptions}
            label="Differences report"
            onChange={(value) => onDifferenceFilterChange((value as DifferenceFilter) ?? "all")}
            value={differenceFilter}
          />
          <Group>
            <Button
              disabled={selectedSuggestionIds.length === 0}
              leftSection={<Clipboard size={16} />}
              onClick={onCopySelected}
              variant="default"
            >
              Copy suggestion text
            </Button>
            <Button
              disabled={selectedSuggestionIds.length === 0}
              onClick={onIgnoreSelected}
              variant="default"
            >
              Ignore selected
            </Button>
            <Button
              disabled={selectedSuggestionIds.length === 0}
              leftSection={<CheckCircle2 size={16} />}
              loading={isApplying}
              onClick={onApplySelected}
            >
              Apply selected suggestions
            </Button>
          </Group>
        </Group>

        {profile && differences.length === 0 ? (
          <Alert color="green" icon={<CheckCircle2 size={16} />} variant="light">
            No differences for the selected filter. Your CV draft and imported LinkedIn data are aligned here.
          </Alert>
        ) : null}

        {!profile ? (
          <Alert color="gray" variant="light">
            Import LinkedIn data to generate a deterministic comparison against the current CV draft.
          </Alert>
        ) : null}

        {differences.length > 0 ? (
          <Table.ScrollContainer minWidth={820}>
            <Table verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th w={44}>
                    <Checkbox
                      aria-label="Select all visible LinkedIn suggestions"
                      checked={allVisibleSelected}
                      disabled={actionableVisibleIds.length === 0}
                      indeterminate={
                        actionableVisibleIds.some((id) => selectedSuggestionIds.includes(id)) &&
                        !allVisibleSelected
                      }
                      onChange={(event) => {
                        if (event.currentTarget.checked) {
                          onSelectedSuggestionIdsChange(uniqueValues([
                            ...selectedSuggestionIds,
                            ...actionableVisibleIds,
                          ]));
                          return;
                        }

                        onSelectedSuggestionIdsChange(
                          selectedSuggestionIds.filter((id) => !actionableVisibleIds.includes(id)),
                        );
                      }}
                    />
                  </Table.Th>
                  <Table.Th>Type</Table.Th>
                  <Table.Th>Section</Table.Th>
                  <Table.Th>Difference</Table.Th>
                  <Table.Th>CV</Table.Th>
                  <Table.Th>LinkedIn</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {differences.map((difference) => (
                  <Table.Tr key={difference.id}>
                    <Table.Td>
                      {difference.suggestionId ? (
                        <Checkbox
                          aria-label={`Select suggestion: ${difference.title}`}
                          checked={selectedLinkedInSuggestionIdsIncludes(
                            selectedSuggestionIds,
                            difference.suggestionId,
                          )}
                          onChange={(event) => {
                            if (!difference.suggestionId) {
                              return;
                            }

                            if (event.currentTarget.checked) {
                              onSelectedSuggestionIdsChange(
                                uniqueValues([...selectedSuggestionIds, difference.suggestionId]),
                              );
                              return;
                            }

                            onSelectedSuggestionIdsChange(
                              selectedSuggestionIds.filter((id) => id !== difference.suggestionId),
                            );
                          }}
                        />
                      ) : null}
                    </Table.Td>
                    <Table.Td>
                      <Badge color={getDifferenceTypeColor(difference.type)} variant="light">
                        {getDifferenceTypeLabel(difference.type)}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{getSectionLabel(difference.section)}</Table.Td>
                    <Table.Td>
                      <Stack gap={4}>
                        <Text size="sm" fw={700}>
                          {difference.title}
                        </Text>
                        {difference.suggestion ? (
                          <Text size="xs" c="dimmed">
                            Suggestion: {difference.suggestion}
                          </Text>
                        ) : null}
                      </Stack>
                    </Table.Td>
                    <Table.Td>
                      <DifferenceValue value={difference.cvValue} />
                    </Table.Td>
                    <Table.Td>
                      <DifferenceValue value={difference.linkedInValue} />
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        ) : null}

        {suggestions.length > 0 ? (
          <Text size="xs" c="dimmed">
            {suggestions.length} actionable suggestion(s), {selectedSuggestionIds.length} selected.
          </Text>
        ) : null}
      </Stack>
    </Card>
  );
}

function LinkedInDataHelp() {
  return (
    <Popover position="bottom-start" shadow="md" width={380} withArrow>
      <Popover.Target>
        <ActionIcon aria-label="How to download LinkedIn data" size="sm" variant="subtle">
          <Info size={16} />
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="xs">
          <Text fw={700} size="sm">
            How to get the ZIP/CSV from LinkedIn
          </Text>
          <Text size="sm">
            On desktop LinkedIn, open Me, then Settings & Privacy, Data Privacy, Get a copy of
            your data, select the profile-related data, and request the archive.
          </Text>
          <Text size="sm">
            For this demo, the most useful files are Profile, Positions, Education, Skills,
            Certifications, Languages, and Projects. You can upload the whole ZIP or one CSV file.
          </Text>
          <Text size="xs" c="dimmed">
            LinkedIn says smaller exports are usually emailed within minutes, larger archives can
            take up to 24 hours, and the download link is available for 72 hours.
          </Text>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}

function CvWorkflowSteps({
  hasImportedSource,
  hasLinkedInProfile,
  hasStructuredDraft,
}: {
  hasImportedSource: boolean;
  hasLinkedInProfile: boolean;
  hasStructuredDraft: boolean;
}) {
  return (
    <Paper withBorder radius="md" p="md">
      <SimpleGrid cols={{ base: 1, md: 4 }} spacing="sm">
        <CvWorkflowStep
          done={hasImportedSource}
          label="1. Import"
          detail="Upload a searchable PDF and extract text locally."
        />
        <CvWorkflowStep
          done={hasStructuredDraft}
          label="2. Edit"
          detail="Review structured fields, skills, experience, projects and education."
        />
        <CvWorkflowStep
          done={hasLinkedInProfile}
          label="3. Compare"
          detail="Optionally compare the draft with LinkedIn data you provide."
        />
        <CvWorkflowStep
          done={hasStructuredDraft}
          label="4. Export"
          detail="Download a regenerated PDF or Markdown CV."
        />
      </SimpleGrid>
    </Paper>
  );
}

function StepNumberBadge({ value }: { value: number }) {
  return (
    <ThemeIcon color="blue" variant="light" radius="xl" size="lg">
      <Text fw={800} size="sm" c="blue">
        {value}
      </Text>
    </ThemeIcon>
  );
}

function CvWorkflowStep({
  detail,
  done,
  label,
}: {
  detail: string;
  done: boolean;
  label: string;
}) {
  return (
    <Group gap="sm" wrap="nowrap" align="flex-start">
      <ThemeIcon color={done ? "green" : "gray"} variant="light" radius="xl">
        <CheckCircle2 size={16} />
      </ThemeIcon>
      <div>
        <Text fw={700} size="sm">
          {label}
        </Text>
        <Text size="xs" c="dimmed">
          {detail}
        </Text>
      </div>
    </Group>
  );
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
      sourceExtractionMode:
        typeof parsed.sourceExtractionMode === "string" ? parsed.sourceExtractionMode : "",
      template: normalizeCvTemplateId(parsed.template),
    };
  } catch {
    return null;
  }
}

function readStoredLinkedInProfile(): LinkedInProfileStorage | null {
  try {
    const value = window.localStorage.getItem(LINKEDIN_PROFILE_STORAGE_KEY);

    if (!value) {
      return null;
    }

    const parsed = JSON.parse(value) as Partial<LinkedInProfileStorage>;
    const source =
      parsed.source === "zip" || parsed.source === "csv" || parsed.source === "text" ? parsed.source : "";

    return {
      profile: parsed.profile && typeof parsed.profile === "object" ? parsed.profile : null,
      source,
      parsedFiles: Array.isArray(parsed.parsedFiles) ? parsed.parsedFiles.filter(isString) : [],
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings.filter(isString) : [],
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

function getDownloadFilename(draft: CvDraft, extension: "md" | "pdf", template?: CvTemplateId) {
  const slug = draft.personal.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const suffix = extension === "pdf" && template ? template : "updated";

  return `${slug || "cv"}-${suffix}.${extension}`;
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
    .map((line) => line.replace(/^[-*\u2022]\s*/, "").trim())
    .filter(Boolean);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

function getLinkedInProfileSummary(profile: LinkedInProfile) {
  return [profile.personal.fullName, profile.personal.headline, profile.personal.location]
    .filter(Boolean)
    .join(" | ") || "Imported LinkedIn profile data is ready to compare.";
}

function getDifferenceTypeLabel(type: LinkedInDifferenceType) {
  if (type === "missing-in-cv") return "Missing in CV";
  if (type === "only-in-cv") return "Only in CV";
  if (type === "conflict") return "Conflict";
  return "Richer on LinkedIn";
}

function getDifferenceTypeColor(type: LinkedInDifferenceType) {
  if (type === "missing-in-cv") return "yellow";
  if (type === "only-in-cv") return "gray";
  if (type === "conflict") return "red";
  return "blue";
}

function getSectionLabel(section: LinkedInDifference["section"]) {
  return section
    .split("-")
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}

function DifferenceValue({ value }: { value?: string }) {
  return (
    <Text size="sm" c={value ? undefined : "dimmed"} lineClamp={4}>
      {value || "-"}
    </Text>
  );
}

function uniqueValues(values: string[]) {
  return values.filter((value, index, array) => array.indexOf(value) === index);
}

function selectedLinkedInSuggestionIdsIncludes(values: string[], id: string) {
  return values.includes(id);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}
