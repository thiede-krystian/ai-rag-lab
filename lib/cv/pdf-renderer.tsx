import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { ReactNode } from "react";
import { orderCvDraftForExport } from "@/lib/cv/export-order";
import { getCvDensityProfile, type CvDensityProfile, type CvDensityProfileId } from "@/lib/cv/pdf-density";
import { DEFAULT_CV_PDF_FONT, getCvPdfFontProfile, type CvPdfFontProfile } from "@/lib/cv/pdf-fonts";
import type { CvDraft, CvPdfFontId, CvTemplateId } from "@/lib/cv/types";

export async function renderCvPdf(
  draft: CvDraft,
  template: CvTemplateId = "three-column-a4",
  fontFamily: CvPdfFontId = DEFAULT_CV_PDF_FONT,
) {
  const document = getCvPdfDocument(orderCvDraftForExport(draft), template, fontFamily);

  return renderToBuffer(document);
}

function getCvPdfDocument(draft: CvDraft, template: CvTemplateId, fontFamily: CvPdfFontId) {
  const styleSet = createCvPdfStyleSet(getCvPdfFontProfile(fontFamily));

  if (template === "three-column-a4") {
    return <ThreeColumnCvPdfDocument draft={draft} styleSet={styleSet} />;
  }

  return <CvPdfDocument draft={draft} styleSet={styleSet} />;
}

function CvPdfDocument({ draft, styleSet }: { draft: CvDraft; styleSet: CvPdfStyleSet }) {
  const { styles } = styleSet;

  return (
    <Document title={`${draft.personal.name || "CV"} - CV`}>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header}>
          <Text style={styles.name}>{draft.personal.name || "Candidate"}</Text>
          {draft.personal.headline ? (
            <Text style={draft.personal.secondHeadline ? [styles.headline, styles.headlineTight] : styles.headline}>
              {draft.personal.headline}
            </Text>
          ) : null}
          {draft.personal.secondHeadline ? (
            <Text style={styles.secondHeadline}>{draft.personal.secondHeadline}</Text>
          ) : null}
          <Text style={styles.contact}>{formatContact(draft)}</Text>
        </View>

        <Section styles={styles} title="Summary" visible={Boolean(draft.summary)}>
          <Text style={styles.bodyText}>{draft.summary}</Text>
        </Section>

        <Section styles={styles} title="Aspirations" visible={Boolean(draft.aspirations)}>
          <Text style={styles.bodyText}>{draft.aspirations}</Text>
        </Section>

        <Section styles={styles} title="Skills" visible={draft.skills.length > 0}>
          <Text style={styles.bodyText}>{draft.skills.join(" · ")}</Text>
        </Section>

        <Section
          minPresenceAhead={classicSectionMinPresenceAhead.experience}
          styles={styles}
          title="Experience"
          visible={draft.experience.length > 0}
        >
          {draft.experience.map((item, index) => (
            <View key={`${item.role}-${item.company}-${index}`} style={styles.item}>
              <Text style={styles.itemTitle}>{[item.role, item.company].filter(Boolean).join(" · ")}</Text>
              <Text style={styles.meta}>{[item.period, item.location].filter(Boolean).join(" · ")}</Text>
              {item.bullets.map((bullet, bulletIndex) => (
                <Text key={`classic-experience-${index}-bullet-${bulletIndex}`} style={styles.bullet}>
                  • {bullet}
                </Text>
              ))}
            </View>
          ))}
        </Section>

        <Section
          minPresenceAhead={classicSectionMinPresenceAhead.projects}
          styles={styles}
          title="Projects"
          visible={draft.projects.length > 0}
        >
          {draft.projects.map((project, index) => (
            <View key={`${project.name}-${index}`} style={styles.item}>
              <Text style={styles.itemTitle}>{project.name || "Project"}</Text>
              {project.description ? <Text style={styles.bodyText}>{project.description}</Text> : null}
              {project.technologies.length > 0 ? (
                <Text style={styles.meta}>{project.technologies.join(" · ")}</Text>
              ) : null}
            </View>
          ))}
        </Section>

        <Section
          minPresenceAhead={classicSectionMinPresenceAhead.education}
          styles={styles}
          title="Education"
          visible={draft.education.length > 0}
        >
          {draft.education.map((item, index) => (
            <View key={`${item.school}-${index}`} style={styles.item}>
              <Text style={styles.itemTitle}>{[item.degree, item.school].filter(Boolean).join(" · ")}</Text>
              <Text style={styles.meta}>{[item.period, item.details].filter(Boolean).join(" · ")}</Text>
            </View>
          ))}
        </Section>

        <Section styles={styles} title="Certifications" visible={draft.certifications.length > 0}>
          <Text style={styles.bodyText}>{draft.certifications.join(" · ")}</Text>
        </Section>

        <Section styles={styles} title="Languages" visible={draft.languages.length > 0}>
          <Text style={styles.bodyText}>{draft.languages.join(" · ")}</Text>
        </Section>
      </Page>
    </Document>
  );
}

function ThreeColumnCvPdfDocument({ draft, styleSet }: { draft: CvDraft; styleSet: CvPdfStyleSet }) {
  const { threeColumnStyles } = styleSet;
  const density = getCvDensityProfile(draft);
  const pages = paginateThreeColumnDraft(draft, density.id);

  return (
    <Document title={`${draft.personal.name || "CV"} - CV`}>
      {pages.map((page, pageIndex) => (
        <Page key={`three-column-page-${pageIndex}`} size="A4" style={threeColumnStyles.page} wrap={false}>
          <View style={threeColumnStyles.leftColumn}>
            {pageIndex === 0 ? (
              <ThreeColumnProfileColumn draft={draft} densityId={density.id} threeColumnStyles={threeColumnStyles} />
            ) : (
              <ThreeColumnContinuationColumn
                draft={draft}
                pageNumber={pageIndex + 1}
                threeColumnStyles={threeColumnStyles}
              />
            )}
          </View>

          <View style={threeColumnStyles.separator} />

          <View style={threeColumnStyles.mainColumn}>
            {getExperienceColumnTitle(page, pageIndex) ? (
              <Text style={threeColumnStyles.columnTitle}>
                {getExperienceColumnTitle(page, pageIndex)}
              </Text>
            ) : null}
            {page.experience.map((item, index) => (
              <View
                key={`experience-page-${pageIndex}-${item.originalIndex}-${index}`}
                style={[threeColumnStyles.experienceItem, { marginBottom: density.itemGap }]}
              >
                <View style={threeColumnStyles.experienceHeader}>
                  <Text style={[threeColumnStyles.itemTitle, { fontSize: density.titleFontSize }]}>
                    {[item.role, item.company].filter(Boolean).join(" / ")}
                    {item.isContinuation ? " (continued)" : ""}
                  </Text>
                  <Text style={threeColumnStyles.meta}>
                    {[item.period, item.location].filter(Boolean).join(" · ")}
                  </Text>
                </View>
                {item.bullets.map((bullet, bulletIndex) =>
                  isSubheading(bullet) ? (
                    <Text
                      key={`experience-${pageIndex}-${item.originalIndex}-subheading-${bulletIndex}`}
                      style={threeColumnStyles.inlineSubheading}
                    >
                      {bullet.replace(/:$/, "")}
                    </Text>
                  ) : (
                    <View
                      key={`experience-${pageIndex}-${item.originalIndex}-bullet-${bulletIndex}`}
                      style={threeColumnStyles.bulletRow}
                    >
                      <Text style={threeColumnStyles.bulletDot}>•</Text>
                      <Text
                        style={[
                          threeColumnStyles.bulletText,
                          { fontSize: density.bulletFontSize, lineHeight: density.lineHeight },
                        ]}
                      >
                        {bullet}
                      </Text>
                    </View>
                  ),
                )}
              </View>
            ))}
          </View>

          <View style={threeColumnStyles.separator} />

          <View style={threeColumnStyles.rightColumn}>
            <ThreeColumnRightColumn
              blocks={page.rightBlocks}
              density={density}
              threeColumnStyles={threeColumnStyles}
            />
          </View>
        </Page>
      ))}
    </Document>
  );
}

function Section({
  children,
  minPresenceAhead,
  styles,
  title,
  visible,
}: {
  children: ReactNode;
  minPresenceAhead?: number;
  styles: CvPdfStyleSet["styles"];
  title: string;
  visible: boolean;
}) {
  if (!visible) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text minPresenceAhead={minPresenceAhead} style={styles.sectionTitle}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function ThreeColumnSection({
  children,
  gap,
  threeColumnStyles,
  title,
  visible,
}: {
  children: ReactNode;
  gap?: number;
  threeColumnStyles: CvPdfStyleSet["threeColumnStyles"];
  title: string;
  visible: boolean;
}) {
  if (!visible) {
    return null;
  }

  return (
    <View style={[threeColumnStyles.section, gap ? { marginBottom: gap } : {}]}>
      <Text style={threeColumnStyles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function ThreeColumnProfileColumn({
  densityId,
  draft,
  threeColumnStyles,
}: {
  densityId: CvDensityProfileId;
  draft: CvDraft;
  threeColumnStyles: CvPdfStyleSet["threeColumnStyles"];
}) {
  const density = getCvDensityProfile(draft);
  const limits = threeColumnProfileLimits[densityId];

  return (
    <>
      <View style={threeColumnStyles.identity}>
        <Text style={threeColumnStyles.name}>{draft.personal.name || "Candidate"}</Text>
        {draft.personal.headline ? (
          <Text
            style={
              draft.personal.secondHeadline
                ? [threeColumnStyles.headline, threeColumnStyles.headlineTight]
                : threeColumnStyles.headline
            }
          >
            {draft.personal.headline}
          </Text>
        ) : null}
        {draft.personal.secondHeadline ? (
          <Text style={threeColumnStyles.secondHeadline}>{draft.personal.secondHeadline}</Text>
        ) : null}
      </View>

      <ThreeColumnSection
        title="Contact"
        visible={hasContact(draft)}
        gap={density.sectionGap}
        threeColumnStyles={threeColumnStyles}
      >
        {formatContactItems(draft).map((item, itemIndex) => (
          <Text
            key={`contact-${itemIndex}`}
            style={[
              threeColumnStyles.sidebarText,
              { fontSize: density.sidebarFontSize, lineHeight: density.lineHeight },
            ]}
          >
            {shortenUrl(item)}
          </Text>
        ))}
      </ThreeColumnSection>

      <ThreeColumnSection
        title="Skills"
        visible={draft.skills.length > 0}
        gap={density.sectionGap}
        threeColumnStyles={threeColumnStyles}
      >
        <View style={threeColumnStyles.skillWrap}>
          {draft.skills.slice(0, limits.skills).map((skill, skillIndex) => (
            <Text
              key={`skill-${skillIndex}`}
              style={[threeColumnStyles.skillChip, { fontSize: density.skillFontSize }]}
            >
              {skill}
            </Text>
          ))}
        </View>
      </ThreeColumnSection>

      <ThreeColumnSection
        title="About me"
        visible={Boolean(draft.summary)}
        gap={density.sectionGap}
        threeColumnStyles={threeColumnStyles}
      >
        <Text
          style={[
            threeColumnStyles.sidebarText,
            { fontSize: density.sidebarFontSize, lineHeight: density.lineHeight },
          ]}
        >
          {truncateWords(draft.summary, limits.summaryWords)}
        </Text>
      </ThreeColumnSection>
    </>
  );
}

function ThreeColumnContinuationColumn({
  draft,
  pageNumber,
  threeColumnStyles,
}: {
  draft: CvDraft;
  pageNumber: number;
  threeColumnStyles: CvPdfStyleSet["threeColumnStyles"];
}) {
  return (
    <View style={threeColumnStyles.identityCompact}>
      <Text style={threeColumnStyles.continuedName}>{draft.personal.name || "Candidate"}</Text>
      {draft.personal.headline ? <Text style={threeColumnStyles.continuedMeta}>{draft.personal.headline}</Text> : null}
      <Text style={threeColumnStyles.continuedMeta}>Page {pageNumber}</Text>
    </View>
  );
}

function ThreeColumnRightColumn({
  blocks,
  density,
  threeColumnStyles,
}: {
  blocks: ThreeColumnRightBlock[];
  density: CvDensityProfile;
  threeColumnStyles: CvPdfStyleSet["threeColumnStyles"];
}) {
  const groups = groupRightBlocks(blocks);

  return (
    <>
      {groups.map((group, groupIndex) => (
        <ThreeColumnSection
          key={`${group.title}-${groupIndex}`}
          title={group.title}
          visible={group.blocks.length > 0}
          gap={density.sectionGap}
          threeColumnStyles={threeColumnStyles}
        >
          {group.blocks.map((block, blockIndex) =>
            renderRightBlock(block, blockIndex, density, threeColumnStyles),
          )}
        </ThreeColumnSection>
      ))}
    </>
  );
}

function formatContact(draft: CvDraft) {
  return [
    draft.personal.email,
    draft.personal.phone,
    draft.personal.location,
    draft.personal.website,
    ...draft.personal.links.map((link) => link.url),
  ]
    .filter(Boolean)
    .join(" · ");
}

function formatContactItems(draft: CvDraft) {
  return [
    draft.personal.location,
    draft.personal.phone,
    draft.personal.email,
    draft.personal.website,
    ...draft.personal.links.map((link) => link.url),
  ].filter(Boolean);
}

function hasContact(draft: CvDraft) {
  return formatContactItems(draft).length > 0;
}

type ThreeColumnExperienceItem = CvDraft["experience"][number] & {
  isContinuation?: boolean;
  originalIndex: number;
};

type ThreeColumnRightBlock =
  | {
      item: CvDraft["education"][number];
      section: "Education";
      type: "education";
    }
  | {
      item: CvDraft["projects"][number];
      section: "My Projects";
      type: "project";
    }
  | {
      section: "Aspirations";
      text: string;
      type: "text";
    }
  | {
      section: "Certifications" | "Languages";
      text: string;
      type: "list-item";
    };

type ThreeColumnPage = {
  experience: ThreeColumnExperienceItem[];
  rightBlocks: ThreeColumnRightBlock[];
};

export function paginateThreeColumnDraft(draft: CvDraft, densityId: CvDensityProfileId): ThreeColumnPage[] {
  const experiencePages = paginateExperienceItems(draft.experience, densityId);
  const rightPages = paginateRightBlocks(createRightBlocks(draft), densityId);
  const pageCount = Math.max(1, experiencePages.length, rightPages.length);

  return Array.from({ length: pageCount }, (_, index) => ({
    experience: experiencePages[index] ?? [],
    rightBlocks: rightPages[index] ?? [],
  }));
}

export function getExperienceColumnTitle(page: ThreeColumnPage, pageIndex: number) {
  if (page.experience.length === 0) {
    return null;
  }

  return pageIndex === 0 ? "Experience" : "Experience continued";
}

function paginateExperienceItems(items: CvDraft["experience"], densityId: CvDensityProfileId) {
  const capacity = mainColumnLineCapacity[densityId];
  const pages: ThreeColumnExperienceItem[][] = [];
  let currentPage: ThreeColumnExperienceItem[] = [];
  let usedLines = 0;

  function pushPage() {
    if (currentPage.length > 0) {
      pages.push(currentPage);
    }

    currentPage = [];
    usedLines = 0;
  }

  for (const [originalIndex, item] of items.entries()) {
    const bullets = item.bullets.flatMap((bullet) => splitLongBullet(bullet, densityId));

    if (bullets.length === 0) {
      const itemLines = estimateExperienceChunkLines(item, []);

      if (currentPage.length > 0 && usedLines + itemLines > capacity) {
        pushPage();
      }

      currentPage.push({ ...item, originalIndex });
      usedLines += itemLines;
      continue;
    }

    let bulletIndex = 0;
    let isContinuation = false;

    while (bulletIndex < bullets.length) {
      const headerLines = estimateExperienceHeaderLines(item);

      if (currentPage.length > 0 && usedLines + headerLines > capacity) {
        pushPage();
      }

      const chunkBullets: string[] = [];
      let chunkLines = headerLines;

      while (bulletIndex < bullets.length) {
        const bullet = bullets[bulletIndex] ?? "";
        const bulletLines = estimateBulletLines(bullet);
        const wouldOverflowCurrentPage = usedLines + chunkLines + bulletLines > capacity;
        const wouldOverflowEmptyPage = chunkLines + bulletLines > capacity;

        if (chunkBullets.length > 0 && wouldOverflowCurrentPage) {
          break;
        }

        if (chunkBullets.length === 0 && wouldOverflowCurrentPage && currentPage.length > 0) {
          pushPage();
          chunkLines = headerLines;
          continue;
        }

        chunkBullets.push(bullet);
        chunkLines += bulletLines;
        bulletIndex += 1;

        if (wouldOverflowEmptyPage) {
          break;
        }
      }

      currentPage.push({
        ...item,
        bullets: chunkBullets,
        isContinuation,
        originalIndex,
      });
      usedLines += chunkLines;
      isContinuation = true;

      if (bulletIndex < bullets.length) {
        pushPage();
      }
    }
  }

  pushPage();

  return pages;
}

function createRightBlocks(draft: CvDraft): ThreeColumnRightBlock[] {
  return [
    ...draft.education.map((item) => ({
      item,
      section: "Education" as const,
      type: "education" as const,
    })),
    ...draft.projects.map((item) => ({
      item,
      section: "My Projects" as const,
      type: "project" as const,
    })),
    ...(draft.aspirations
      ? [
          {
            section: "Aspirations" as const,
            text: draft.aspirations,
            type: "text" as const,
          },
        ]
      : []),
    ...draft.certifications.map((text) => ({
      section: "Certifications" as const,
      text,
      type: "list-item" as const,
    })),
    ...draft.languages.map((text) => ({
      section: "Languages" as const,
      text,
      type: "list-item" as const,
    })),
  ];
}

function paginateRightBlocks(blocks: ThreeColumnRightBlock[], densityId: CvDensityProfileId) {
  const capacity = rightColumnLineCapacity[densityId];
  const pages: ThreeColumnRightBlock[][] = [];
  let currentPage: ThreeColumnRightBlock[] = [];
  let usedLines = 0;

  for (const block of blocks) {
    const startsNewSection = currentPage.at(-1)?.section !== block.section;
    const sectionTitleLines = startsNewSection ? rightSectionTitleLines : 0;
    const sectionStartLines = startsNewSection ? estimateRightSectionStartLines(block) : 0;
    const blockLines = estimateRightBlockLines(block) + sectionTitleLines;

    if (currentPage.length > 0 && sectionStartLines > 0 && usedLines + sectionStartLines > capacity) {
      pages.push(currentPage);
      currentPage = [];
      usedLines = 0;
    }

    if (currentPage.length > 0 && usedLines + blockLines > capacity) {
      pages.push(currentPage);
      currentPage = [];
      usedLines = 0;
    }

    usedLines += estimateRightBlockLines(block) + (currentPage.at(-1)?.section === block.section ? 0 : rightSectionTitleLines);
    currentPage.push(block);
  }

  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  return pages;
}

function groupRightBlocks(blocks: ThreeColumnRightBlock[]) {
  const groups: Array<{ blocks: ThreeColumnRightBlock[]; title: ThreeColumnRightBlock["section"] }> = [];

  for (const block of blocks) {
    const previousGroup = groups.at(-1);

    if (previousGroup?.title === block.section) {
      previousGroup.blocks.push(block);
    } else {
      groups.push({ title: block.section, blocks: [block] });
    }
  }

  return groups;
}

function renderRightBlock(
  block: ThreeColumnRightBlock,
  blockIndex: number,
  density: CvDensityProfile,
  threeColumnStyles: CvPdfStyleSet["threeColumnStyles"],
) {
  if (block.type === "education") {
    const details = cleanEducationDetails(block.item.details, block.item);

    return (
      <View key={`right-education-${blockIndex}`} style={threeColumnStyles.sidebarItem}>
        <Text style={threeColumnStyles.sidebarItemTitle}>{block.item.school || block.item.degree}</Text>
        {block.item.period ? <Text style={threeColumnStyles.meta}>{block.item.period}</Text> : null}
        {block.item.degree ? (
          <Text style={[threeColumnStyles.sidebarTextStrong, { fontSize: density.sidebarFontSize }]}>
            {block.item.degree}
          </Text>
        ) : null}
        {details ? (
          <Text
            style={[
              threeColumnStyles.sidebarText,
              { fontSize: density.sidebarFontSize, lineHeight: density.lineHeight },
            ]}
          >
            {details}
          </Text>
        ) : null}
      </View>
    );
  }

  if (block.type === "project") {
    const projectText = getProjectText(block.item.description);

    return (
      <View key={`right-project-${blockIndex}`} style={threeColumnStyles.sidebarItem}>
        <Text style={threeColumnStyles.sidebarItemTitle}>{block.item.name || "Project"}</Text>
        {projectText.meta ? <Text style={threeColumnStyles.meta}>{projectText.meta}</Text> : null}
        {projectText.points.map((point, pointIndex) => (
          <View key={`right-project-${blockIndex}-point-${pointIndex}`} style={threeColumnStyles.smallBulletRow}>
            <Text style={threeColumnStyles.smallBulletDot}>•</Text>
            <Text
              style={[
                threeColumnStyles.sidebarText,
                { fontSize: density.sidebarFontSize, lineHeight: density.lineHeight },
              ]}
            >
              {point}
            </Text>
          </View>
        ))}
        {block.item.technologies.length > 0 ? (
          <Text style={threeColumnStyles.projectTech}>{block.item.technologies.join(" · ")}</Text>
        ) : null}
      </View>
    );
  }

  return (
    <Text
      key={`right-text-${blockIndex}`}
      style={[
        threeColumnStyles.sidebarText,
        { fontSize: density.sidebarFontSize, lineHeight: density.lineHeight },
      ]}
    >
      {block.text}
    </Text>
  );
}

function splitLongBullet(value: string, densityId: CvDensityProfileId) {
  if (isSubheading(value)) {
    return [value];
  }

  return splitIntoWordChunks(value, bulletWordChunkSize[densityId]);
}

function splitIntoWordChunks(value: string, wordsPerChunk: number) {
  const words = value.split(/\s+/).filter(Boolean);

  if (words.length <= wordsPerChunk) {
    return [value];
  }

  const chunks: string[] = [];

  for (let index = 0; index < words.length; index += wordsPerChunk) {
    chunks.push(words.slice(index, index + wordsPerChunk).join(" "));
  }

  return chunks;
}

function estimateExperienceChunkLines(item: CvDraft["experience"][number], bullets: string[]) {
  return estimateExperienceHeaderLines(item) + bullets.reduce((sum, bullet) => sum + estimateBulletLines(bullet), 0);
}

function estimateExperienceHeaderLines(item: CvDraft["experience"][number]) {
  return (
    estimateTextLines([item.role, item.company].filter(Boolean).join(" / "), 42) +
    estimateTextLines([item.period, item.location].filter(Boolean).join(" · "), 56) +
    2
  );
}

function estimateBulletLines(value: string) {
  return estimateTextLines(value, isSubheading(value) ? 54 : 66) + 1;
}

function estimateRightBlockLines(block: ThreeColumnRightBlock) {
  if (block.type === "education") {
    return (
      estimateTextLines(block.item.school || block.item.degree, 24) +
      estimateTextLines(block.item.period, 30) +
      estimateTextLines(block.item.degree, 28) +
      estimateTextLines(cleanEducationDetails(block.item.details, block.item), 28) +
      2
    );
  }

  if (block.type === "project") {
    const projectText = getProjectText(block.item.description);

    return (
      estimateTextLines(block.item.name || "Project", 24) +
      estimateTextLines(projectText.meta, 28) +
      projectText.points.reduce((sum, point) => sum + estimateTextLines(point, 28) + 1, 0) +
      estimateTextLines(block.item.technologies.join(" · "), 28) +
      2
    );
  }

  return estimateTextLines(block.text, 28) + 1;
}

function estimateRightSectionStartLines(block: ThreeColumnRightBlock) {
  return rightSectionTitleLines + Math.min(estimateRightBlockLines(block), rightFirstBlockMinimumLines[block.type]);
}

function estimateTextLines(value: string, charactersPerLine: number) {
  if (!value) {
    return 0;
  }

  return Math.max(1, Math.ceil(value.length / charactersPerLine));
}

const mainColumnLineCapacity: Record<CvDensityProfileId, number> = {
  relaxed: 54,
  balanced: 60,
  dense: 68,
};

const rightColumnLineCapacity: Record<CvDensityProfileId, number> = {
  relaxed: 62,
  balanced: 68,
  dense: 76,
};

const rightSectionTitleLines = 3;

const rightFirstBlockMinimumLines: Record<ThreeColumnRightBlock["type"], number> = {
  education: 5,
  project: 5,
  text: 4,
  "list-item": 3,
};

const classicSectionMinPresenceAhead = {
  education: 56,
  experience: 72,
  projects: 64,
} as const;

const bulletWordChunkSize: Record<CvDensityProfileId, number> = {
  relaxed: 34,
  balanced: 30,
  dense: 26,
};

const threeColumnProfileLimits: Record<CvDensityProfileId, { skills: number; summaryWords: number }> = {
  relaxed: { skills: 32, summaryWords: 96 },
  balanced: { skills: 28, summaryWords: 84 },
  dense: { skills: 24, summaryWords: 72 },
};

function isSubheading(value: string) {
  return value.endsWith(":") && value.length <= 64;
}

function truncateWords(value: string, limit: number) {
  const words = value.split(/\s+/).filter(Boolean);

  if (words.length <= limit) {
    return value;
  }

  return `${words.slice(0, limit).join(" ")}...`;
}

function shortenUrl(value: string) {
  return value.replace(/^https?:\/\//i, "");
}

function getProjectText(description: string) {
  const [meta, body] = splitProjectMeta(description);
  const points = body
    .split(/(?<=\.)\s+(?=[A-Z])/)
    .map((point) => point.trim().replace(/\.$/, ""))
    .filter(Boolean);

  return {
    meta,
    points: points.length > 0 ? points : description ? [description] : [],
  };
}

function splitProjectMeta(description: string) {
  const match = description.match(/^(.+?\d{4}\s*-\s*\d{4})\s+(.+)$/);

  if (!match) {
    return ["", description] as const;
  }

  return [match[1], match[2]] as const;
}

function cleanEducationDetails(details: string, item: { degree: string; period: string; school: string }) {
  return details
    .replace(item.school, "")
    .replace(item.degree, "")
    .replace(item.period, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function createCvPdfStyleSet(pdfFont: CvPdfFontProfile) {
  return {
    styles: createClassicStyles(pdfFont),
    threeColumnStyles: createThreeColumnStyles(pdfFont),
  };
}

type CvPdfStyleSet = ReturnType<typeof createCvPdfStyleSet>;

function createClassicStyles(pdfFont: CvPdfFontProfile) {
  return StyleSheet.create({
  page: {
    paddingTop: 34,
    paddingRight: 38,
    paddingBottom: 34,
    paddingLeft: 38,
    fontFamily: pdfFont.regular,
    color: "#172033",
    fontSize: 9.5,
    lineHeight: 1.35,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: "#D7DCE5",
    paddingBottom: 14,
    marginBottom: 16,
  },
  name: {
    fontSize: 23,
    lineHeight: 1.18,
    fontFamily: pdfFont.bold,
    color: "#0F172A",
    marginBottom: 7,
  },
  headline: {
    fontSize: 11,
    fontFamily: pdfFont.regular,
    lineHeight: 1.25,
    color: "#374151",
    marginBottom: 7,
  },
  headlineTight: {
    marginBottom: 2,
  },
  secondHeadline: {
    fontSize: 9.4,
    fontFamily: pdfFont.regular,
    lineHeight: 1.22,
    color: "#6B7280",
    marginBottom: 7,
  },
  contact: {
    fontSize: 8.5,
    fontFamily: pdfFont.regular,
    color: "#475569",
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: pdfFont.bold,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    color: "#111827",
    marginBottom: 5,
  },
  item: {
    marginBottom: 8,
  },
  itemTitle: {
    fontSize: 10,
    fontFamily: pdfFont.bold,
    color: "#111827",
    marginBottom: 2,
  },
  meta: {
    color: "#64748B",
    fontSize: 8.5,
    fontFamily: pdfFont.regular,
    marginBottom: 3,
  },
  bodyText: {
    fontSize: 9.5,
    fontFamily: pdfFont.regular,
    color: "#253047",
  },
  bullet: {
    fontSize: 9,
    fontFamily: pdfFont.regular,
    color: "#253047",
    marginBottom: 2,
  },
  });
}

function createThreeColumnStyles(pdfFont: CvPdfFontProfile) {
  return StyleSheet.create({
  page: {
    paddingTop: 26,
    paddingRight: 24,
    paddingBottom: 24,
    paddingLeft: 24,
    fontFamily: pdfFont.regular,
    color: "#172033",
    fontSize: 7.7,
    lineHeight: 1.28,
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
  },
  leftColumn: {
    width: 120,
  },
  mainColumn: {
    width: 252,
  },
  rightColumn: {
    width: 127,
  },
  separator: {
    width: 1,
    marginRight: 9,
    marginLeft: 9,
    marginTop: 4,
    marginBottom: 18,
    backgroundColor: "#E5E7EB",
  },
  identity: {
    marginBottom: 18,
  },
  identityCompact: {
    marginBottom: 14,
  },
  name: {
    fontSize: 21,
    lineHeight: 0.96,
    fontFamily: pdfFont.bold,
    color: "#111827",
    marginBottom: 6,
  },
  headline: {
    fontSize: 9.6,
    fontFamily: pdfFont.regular,
    color: "#374151",
    lineHeight: 1.2,
  },
  headlineTight: {
    marginBottom: 2,
  },
  secondHeadline: {
    fontSize: 7.6,
    fontFamily: pdfFont.regular,
    color: "#6B7280",
    lineHeight: 1.22,
  },
  continuedName: {
    fontSize: 12,
    lineHeight: 1.08,
    fontFamily: pdfFont.bold,
    color: "#111827",
    marginBottom: 4,
  },
  continuedMeta: {
    fontSize: 7,
    fontFamily: pdfFont.regular,
    color: "#6B7280",
    lineHeight: 1.2,
    marginBottom: 3,
  },
  columnTitle: {
    fontSize: 8.2,
    color: "#111827",
    fontFamily: pdfFont.bold,
    textTransform: "uppercase",
    letterSpacing: 0.45,
    marginBottom: 10,
  },
  section: {
    marginBottom: 13,
  },
  sectionTitle: {
    fontSize: 7.3,
    fontFamily: pdfFont.bold,
    textTransform: "uppercase",
    letterSpacing: 0.45,
    color: "#111827",
    marginBottom: 5,
  },
  sidebarText: {
    fontSize: 7.1,
    fontFamily: pdfFont.regular,
    color: "#253047",
    marginBottom: 3,
  },
  sidebarTextStrong: {
    fontSize: 7.2,
    fontFamily: pdfFont.bold,
    color: "#1F2937",
    marginBottom: 3,
  },
  skillWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 3,
  },
  skillChip: {
    fontSize: 6.5,
    fontFamily: pdfFont.regular,
    color: "#1F2937",
    backgroundColor: "#F3F4F6",
    borderRadius: 3,
    paddingTop: 2,
    paddingRight: 4,
    paddingBottom: 2,
    paddingLeft: 4,
    marginRight: 3,
    marginBottom: 3,
  },
  experienceItem: {
    marginBottom: 10,
  },
  experienceHeader: {
    marginBottom: 3,
  },
  itemTitle: {
    fontSize: 9.1,
    fontFamily: pdfFont.bold,
    color: "#111827",
    marginBottom: 1,
  },
  meta: {
    color: "#64748B",
    fontSize: 6.6,
    fontFamily: pdfFont.regular,
    marginBottom: 3,
  },
  inlineSubheading: {
    color: "#334155",
    fontSize: 7,
    fontFamily: pdfFont.bold,
    marginTop: 3,
    marginBottom: 2,
  },
  bulletRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  bulletDot: {
    width: 6,
    fontSize: 7,
    fontFamily: pdfFont.regular,
    color: "#4B5563",
  },
  bulletText: {
    flexGrow: 1,
    fontSize: 7.45,
    fontFamily: pdfFont.regular,
    color: "#253047",
  },
  smallBulletRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  smallBulletDot: {
    width: 5,
    fontSize: 6.5,
    fontFamily: pdfFont.regular,
    color: "#4B5563",
  },
  sidebarItem: {
    marginBottom: 9,
  },
  sidebarItemTitle: {
    fontSize: 8.1,
    fontFamily: pdfFont.bold,
    color: "#111827",
    marginBottom: 2,
  },
  projectTech: {
    color: "#374151",
    fontSize: 6.6,
    fontFamily: pdfFont.regular,
    marginTop: 1,
  },
  });
}
