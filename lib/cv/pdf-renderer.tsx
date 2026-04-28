import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { ReactNode } from "react";
import { getCvDensityProfile } from "@/lib/cv/pdf-density";
import type { CvDraft, CvTemplateId } from "@/lib/cv/types";

export async function renderCvPdf(draft: CvDraft, template: CvTemplateId = "three-column-a4") {
  const document = getCvPdfDocument(draft, template);

  return renderToBuffer(document);
}

function getCvPdfDocument(draft: CvDraft, template: CvTemplateId) {
  if (template === "three-column-a4") {
    return <ThreeColumnCvPdfDocument draft={draft} />;
  }

  return <CvPdfDocument draft={draft} />;
}

function CvPdfDocument({ draft }: { draft: CvDraft }) {
  return (
    <Document title={`${draft.personal.name || "CV"} - CV`}>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header}>
          <Text style={styles.name}>{draft.personal.name || "Candidate"}</Text>
          {draft.personal.headline ? <Text style={styles.headline}>{draft.personal.headline}</Text> : null}
          <Text style={styles.contact}>{formatContact(draft)}</Text>
        </View>

        <Section title="Summary" visible={Boolean(draft.summary)}>
          <Text style={styles.bodyText}>{draft.summary}</Text>
        </Section>

        <Section title="Aspirations" visible={Boolean(draft.aspirations)}>
          <Text style={styles.bodyText}>{draft.aspirations}</Text>
        </Section>

        <Section title="Skills" visible={draft.skills.length > 0}>
          <Text style={styles.bodyText}>{draft.skills.join(" · ")}</Text>
        </Section>

        <Section title="Experience" visible={draft.experience.length > 0}>
          {draft.experience.map((item, index) => (
            <View key={`${item.role}-${item.company}-${index}`} style={styles.item} wrap={false}>
              <Text style={styles.itemTitle}>{[item.role, item.company].filter(Boolean).join(" · ")}</Text>
              <Text style={styles.meta}>{[item.period, item.location].filter(Boolean).join(" · ")}</Text>
              {item.bullets.map((bullet) => (
                <Text key={bullet} style={styles.bullet}>
                  • {bullet}
                </Text>
              ))}
            </View>
          ))}
        </Section>

        <Section title="Projects" visible={draft.projects.length > 0}>
          {draft.projects.map((project, index) => (
            <View key={`${project.name}-${index}`} style={styles.item} wrap={false}>
              <Text style={styles.itemTitle}>{project.name || "Project"}</Text>
              {project.description ? <Text style={styles.bodyText}>{project.description}</Text> : null}
              {project.technologies.length > 0 ? (
                <Text style={styles.meta}>{project.technologies.join(" · ")}</Text>
              ) : null}
            </View>
          ))}
        </Section>

        <Section title="Education" visible={draft.education.length > 0}>
          {draft.education.map((item, index) => (
            <View key={`${item.school}-${index}`} style={styles.item} wrap={false}>
              <Text style={styles.itemTitle}>{[item.degree, item.school].filter(Boolean).join(" · ")}</Text>
              <Text style={styles.meta}>{[item.period, item.details].filter(Boolean).join(" · ")}</Text>
            </View>
          ))}
        </Section>

        <Section title="Certifications" visible={draft.certifications.length > 0}>
          <Text style={styles.bodyText}>{draft.certifications.join(" · ")}</Text>
        </Section>

        <Section title="Languages" visible={draft.languages.length > 0}>
          <Text style={styles.bodyText}>{draft.languages.join(" · ")}</Text>
        </Section>
      </Page>
    </Document>
  );
}

function ThreeColumnCvPdfDocument({ draft }: { draft: CvDraft }) {
  const density = getCvDensityProfile(draft);

  return (
    <Document title={`${draft.personal.name || "CV"} - CV`}>
      <Page size="A4" style={threeColumnStyles.page} wrap>
        <View style={threeColumnStyles.leftColumn}>
          <View style={threeColumnStyles.identity}>
            <Text style={threeColumnStyles.name}>{draft.personal.name || "Candidate"}</Text>
            {draft.personal.headline ? <Text style={threeColumnStyles.headline}>{draft.personal.headline}</Text> : null}
          </View>

          <ThreeColumnSection title="Contact" visible={hasContact(draft)} gap={density.sectionGap}>
            {formatContactItems(draft).map((item) => (
              <Text key={item} style={[threeColumnStyles.sidebarText, { fontSize: density.sidebarFontSize, lineHeight: density.lineHeight }]}>
                {shortenUrl(item)}
              </Text>
            ))}
          </ThreeColumnSection>

          <ThreeColumnSection title="Skills" visible={draft.skills.length > 0} gap={density.sectionGap}>
            <View style={threeColumnStyles.skillWrap}>
              {draft.skills.map((skill) => (
                <Text key={skill} style={[threeColumnStyles.skillChip, { fontSize: density.skillFontSize }]}>
                  {skill}
                </Text>
              ))}
            </View>
          </ThreeColumnSection>

          <ThreeColumnSection title="About me" visible={Boolean(draft.summary)} gap={density.sectionGap}>
            <Text style={[threeColumnStyles.sidebarText, { fontSize: density.sidebarFontSize, lineHeight: density.lineHeight }]}>
              {truncateWords(draft.summary, 92)}
            </Text>
          </ThreeColumnSection>
        </View>

        <View style={threeColumnStyles.separator} />

        <View style={threeColumnStyles.mainColumn}>
          <Text style={threeColumnStyles.columnTitle}>Experience</Text>
          {draft.experience.map((item, index) => (
            <View key={`${item.role}-${item.company}-${index}`} style={[threeColumnStyles.experienceItem, { marginBottom: density.itemGap }]}>
              <View style={threeColumnStyles.experienceHeader}>
                <Text style={[threeColumnStyles.itemTitle, { fontSize: density.titleFontSize }]}>
                  {[item.role, item.company].filter(Boolean).join(" / ")}
                </Text>
                <Text style={threeColumnStyles.meta}>{[item.period, item.location].filter(Boolean).join(" · ")}</Text>
              </View>
              {item.bullets.map((bullet) =>
                isSubheading(bullet) ? (
                  <Text key={bullet} style={threeColumnStyles.inlineSubheading}>
                    {bullet.replace(/:$/, "")}
                  </Text>
                ) : (
                  <View key={bullet} style={threeColumnStyles.bulletRow}>
                    <Text style={threeColumnStyles.bulletDot}>•</Text>
                    <Text style={[threeColumnStyles.bulletText, { fontSize: density.bulletFontSize, lineHeight: density.lineHeight }]}>
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
          <ThreeColumnSection title="Education" visible={draft.education.length > 0} gap={density.sectionGap}>
            {draft.education.map((item, index) => (
              <View key={`${item.school}-${index}`} style={threeColumnStyles.sidebarItem}>
                <Text style={threeColumnStyles.sidebarItemTitle}>{item.school || item.degree}</Text>
                {item.period ? <Text style={threeColumnStyles.meta}>{item.period}</Text> : null}
                {item.degree ? <Text style={[threeColumnStyles.sidebarTextStrong, { fontSize: density.sidebarFontSize }]}>{item.degree}</Text> : null}
                {cleanEducationDetails(item.details, item) ? (
                  <Text style={[threeColumnStyles.sidebarText, { fontSize: density.sidebarFontSize, lineHeight: density.lineHeight }]}>
                    {truncateWords(cleanEducationDetails(item.details, item), 28)}
                  </Text>
                ) : null}
              </View>
            ))}
          </ThreeColumnSection>

          <ThreeColumnSection title="My Projects" visible={draft.projects.length > 0} gap={density.sectionGap}>
            {draft.projects.map((project, index) => {
              const projectText = getProjectText(project.description);

              return (
                <View key={`${project.name}-${index}`} style={threeColumnStyles.sidebarItem}>
                  <Text style={threeColumnStyles.sidebarItemTitle}>{project.name || "Project"}</Text>
                  {projectText.meta ? <Text style={threeColumnStyles.meta}>{projectText.meta}</Text> : null}
                  {projectText.points.map((point) => (
                    <View key={point} style={threeColumnStyles.smallBulletRow}>
                      <Text style={threeColumnStyles.smallBulletDot}>•</Text>
                      <Text style={[threeColumnStyles.sidebarText, { fontSize: density.sidebarFontSize, lineHeight: density.lineHeight }]}>{point}</Text>
                    </View>
                  ))}
                  {project.technologies.length > 0 ? (
                    <Text style={threeColumnStyles.projectTech}>{project.technologies.join(" · ")}</Text>
                  ) : null}
                </View>
              );
            })}
          </ThreeColumnSection>

          <ThreeColumnSection title="Aspirations" visible={Boolean(draft.aspirations)} gap={density.sectionGap}>
            <Text style={[threeColumnStyles.sidebarText, { fontSize: density.sidebarFontSize, lineHeight: density.lineHeight }]}>
              {truncateWords(draft.aspirations, 42)}
            </Text>
          </ThreeColumnSection>

          <ThreeColumnSection title="Certifications" visible={draft.certifications.length > 0} gap={density.sectionGap}>
            {draft.certifications.map((item) => (
              <Text key={item} style={[threeColumnStyles.sidebarText, { fontSize: density.sidebarFontSize, lineHeight: density.lineHeight }]}>
                {item}
              </Text>
            ))}
          </ThreeColumnSection>

          <ThreeColumnSection title="Languages" visible={draft.languages.length > 0} gap={density.sectionGap}>
            {draft.languages.map((item) => (
              <Text key={item} style={[threeColumnStyles.sidebarText, { fontSize: density.sidebarFontSize, lineHeight: density.lineHeight }]}>
                {item}
              </Text>
            ))}
          </ThreeColumnSection>
        </View>
      </Page>
    </Document>
  );
}

function Section({
  children,
  title,
  visible,
}: {
  children: ReactNode;
  title: string;
  visible: boolean;
}) {
  if (!visible) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function ThreeColumnSection({
  children,
  gap,
  title,
  visible,
}: {
  children: ReactNode;
  gap?: number;
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
    .filter(Boolean)
    .slice(0, 3)
    .map((point) => truncateWords(point, 18));

  return {
    meta,
    points: points.length > 0 ? points : description ? [truncateWords(description, 24)] : [],
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

const styles = StyleSheet.create({
  page: {
    paddingTop: 34,
    paddingRight: 38,
    paddingBottom: 34,
    paddingLeft: 38,
    fontFamily: "Helvetica",
    color: "#172033",
    fontSize: 9.5,
    lineHeight: 1.35,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: "#D7DCE5",
    paddingBottom: 12,
    marginBottom: 14,
  },
  name: {
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    color: "#0F172A",
    marginBottom: 4,
  },
  headline: {
    fontSize: 11,
    color: "#374151",
    marginBottom: 6,
  },
  contact: {
    fontSize: 8.5,
    color: "#475569",
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
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
    fontFamily: "Helvetica-Bold",
    color: "#111827",
    marginBottom: 2,
  },
  meta: {
    color: "#64748B",
    fontSize: 8.5,
    marginBottom: 3,
  },
  bodyText: {
    fontSize: 9.5,
    color: "#253047",
  },
  bullet: {
    fontSize: 9,
    color: "#253047",
    marginBottom: 2,
  },
});

const threeColumnStyles = StyleSheet.create({
  page: {
    paddingTop: 26,
    paddingRight: 24,
    paddingBottom: 24,
    paddingLeft: 24,
    fontFamily: "Helvetica",
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
  name: {
    fontSize: 21,
    lineHeight: 0.96,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
    marginBottom: 6,
  },
  headline: {
    fontSize: 9.6,
    color: "#374151",
    lineHeight: 1.2,
  },
  columnTitle: {
    fontSize: 8.2,
    color: "#111827",
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.45,
    marginBottom: 10,
  },
  section: {
    marginBottom: 13,
  },
  sectionTitle: {
    fontSize: 7.3,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.45,
    color: "#111827",
    marginBottom: 5,
  },
  sidebarText: {
    fontSize: 7.1,
    color: "#253047",
    marginBottom: 3,
  },
  sidebarTextStrong: {
    fontSize: 7.2,
    fontFamily: "Helvetica-Bold",
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
    fontFamily: "Helvetica-Bold",
    color: "#111827",
    marginBottom: 1,
  },
  meta: {
    color: "#64748B",
    fontSize: 6.6,
    marginBottom: 3,
  },
  inlineSubheading: {
    color: "#334155",
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
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
    color: "#4B5563",
  },
  bulletText: {
    flexGrow: 1,
    fontSize: 7.45,
    color: "#253047",
  },
  smallBulletRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  smallBulletDot: {
    width: 5,
    fontSize: 6.5,
    color: "#4B5563",
  },
  sidebarItem: {
    marginBottom: 9,
  },
  sidebarItemTitle: {
    fontSize: 8.1,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
    marginBottom: 2,
  },
  projectTech: {
    color: "#374151",
    fontSize: 6.6,
    marginTop: 1,
  },
});
