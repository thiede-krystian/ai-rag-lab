import type { CvDraft } from "@/lib/cv/types";

export function cvDraftToMarkdown(draft: CvDraft) {
  const lines: string[] = [];

  pushHeading(lines, draft.personal.name || "CV", 1);
  pushText(lines, draft.personal.headline);
  pushContact(lines, draft);
  pushSection(lines, "Summary", draft.summary);
  pushListSection(lines, "Skills", draft.skills);
  pushExperience(lines, draft);
  pushProjects(lines, draft);
  pushEducation(lines, draft);
  pushListSection(lines, "Certifications", draft.certifications);
  pushListSection(lines, "Languages", draft.languages);

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
