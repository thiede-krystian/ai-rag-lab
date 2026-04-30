import { orderCvDraftForExport } from "@/lib/cv/export-order";
import type { CvDraft } from "@/lib/cv/types";

export function cvDraftToMarkdown(draft: CvDraft) {
  const orderedDraft = orderCvDraftForExport(draft);
  const lines: string[] = [];

  pushHeading(lines, orderedDraft.personal.name || "CV", 1);
  pushText(lines, orderedDraft.personal.headline);
  pushText(lines, orderedDraft.personal.secondHeadline);
  pushContact(lines, orderedDraft);
  pushSection(lines, "Summary", orderedDraft.summary);
  pushSection(lines, "Aspirations", orderedDraft.aspirations);
  pushListSection(lines, "Skills", orderedDraft.skills);
  pushExperience(lines, orderedDraft);
  pushProjects(lines, orderedDraft);
  pushEducation(lines, orderedDraft);
  pushListSection(lines, "Certifications", orderedDraft.certifications);
  pushListSection(lines, "Languages", orderedDraft.languages);

  return `${lines.join("\n").replace(/\n{3,}/g, "\n\n").trim()}\n`;
}

function pushHeading(lines: string[], text: string, level: 1 | 2 | 3) {
  lines.push(`${"#".repeat(level)} ${text}`, "");
}

function pushText(lines: string[], text: string) {
  if (text) {
    lines.push(text, "");
  }
}

function pushContact(lines: string[], draft: CvDraft) {
  const contact = [
    draft.personal.email,
    draft.personal.phone,
    draft.personal.location,
    draft.personal.website,
    ...draft.personal.links.map((link) => `[${link.label || link.url}](${link.url})`),
  ].filter(Boolean);

  if (contact.length > 0) {
    lines.push(contact.join(" | "), "");
  }
}

function pushSection(lines: string[], title: string, text: string) {
  if (!text) {
    return;
  }

  pushHeading(lines, title, 2);
  lines.push(text, "");
}

function pushListSection(lines: string[], title: string, items: string[]) {
  if (items.length === 0) {
    return;
  }

  pushHeading(lines, title, 2);
  lines.push(...items.map((item) => `- ${item}`), "");
}

function pushExperience(lines: string[], draft: CvDraft) {
  if (draft.experience.length === 0) {
    return;
  }

  pushHeading(lines, "Experience", 2);

  for (const item of draft.experience) {
    const title = [item.role, item.company].filter(Boolean).join(" - ");
    pushHeading(lines, title || "Experience item", 3);
    pushText(lines, [item.period, item.location].filter(Boolean).join(" | "));
    lines.push(...item.bullets.map((bullet) => `- ${bullet}`), "");
  }
}

function pushProjects(lines: string[], draft: CvDraft) {
  if (draft.projects.length === 0) {
    return;
  }

  pushHeading(lines, "Projects", 2);

  for (const project of draft.projects) {
    pushHeading(lines, project.name || "Project", 3);
    pushText(lines, project.description);
    pushListSection(lines, "Technologies", project.technologies);
  }
}

function pushEducation(lines: string[], draft: CvDraft) {
  if (draft.education.length === 0) {
    return;
  }

  pushHeading(lines, "Education", 2);

  for (const item of draft.education) {
    const title = [item.degree, item.school].filter(Boolean).join(" - ");
    pushHeading(lines, title || item.school || "Education item", 3);
    pushText(lines, [item.period, item.details].filter(Boolean).join(" | "));
  }
}
