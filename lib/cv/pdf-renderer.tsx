import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { ReactNode } from "react";
import type { CvDraft } from "@/lib/cv/types";

export async function renderCvPdf(draft: CvDraft) {
  return renderToBuffer(<CvPdfDocument draft={draft} />);
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
    color: "#2563EB",
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
    letterSpacing: 0.8,
    color: "#1D4ED8",
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
