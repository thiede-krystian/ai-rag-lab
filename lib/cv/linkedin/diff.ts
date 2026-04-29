import { normalizeCvDraft } from "@/lib/cv/draft";
import type {
  CvDraft,
  CvExperienceItem,
  LinkedInDifference,
  LinkedInProfile,
  LinkedInSuggestion,
} from "@/lib/cv/types";
import { normalizeKey, normalizeLinkedInProfile, sameText } from "@/lib/cv/linkedin/profile";

export type LinkedInCompareResult = {
  differences: LinkedInDifference[];
  suggestions: LinkedInSuggestion[];
  summary: {
    differences: number;
    actionable: number;
    missingInCv: number;
    conflicts: number;
    richerOnLinkedIn: number;
  };
};

type DifferenceInput = Omit<LinkedInDifference, "id">;

export function compareCvWithLinkedIn(draftInput: unknown, profileInput: unknown): LinkedInCompareResult {
  const draft = normalizeCvDraft(draftInput);
  const profile = normalizeLinkedInProfile(profileInput);
  const differences: LinkedInDifference[] = [];
  const suggestions: LinkedInSuggestion[] = [];

  addPersonalDifferences(draft, profile, differences, suggestions);
  addSummaryDifference(draft, profile, differences, suggestions);
  addSkillDifferences(draft, profile, differences, suggestions);
  addExperienceDifferences(draft, profile, differences, suggestions);
  addEducationDifferences(draft, profile, differences, suggestions);
  addListDifferences("certifications", draft.certifications, profile.certifications, differences, suggestions);
  addListDifferences("languages", draft.languages, profile.languages, differences, suggestions);
  addProjectDifferences(draft, profile, differences, suggestions);

  return {
    differences,
    suggestions,
    summary: {
      differences: differences.length,
      actionable: suggestions.length,
      missingInCv: differences.filter((item) => item.type === "missing-in-cv").length,
      conflicts: differences.filter((item) => item.type === "conflict").length,
      richerOnLinkedIn: differences.filter((item) => item.type === "richer-on-linkedin").length,
    },
  };
}

export function applyLinkedInSuggestions(draftInput: unknown, suggestionsInput: unknown): CvDraft {
  const draft = normalizeCvDraft(draftInput);
  const suggestions = Array.isArray(suggestionsInput)
    ? suggestionsInput.filter(isSuggestion)
    : [];

  return normalizeCvDraft(
    suggestions.reduce<CvDraft>((current, suggestion) => {
      if (suggestion.action === "set-personal" && suggestion.target?.field) {
        const field = suggestion.target.field;

        if (field === "links") {
          return current;
        }

        return {
          ...current,
          personal: {
            ...current.personal,
            [field]: typeof suggestion.value === "string" ? suggestion.value : current.personal[field],
          },
        };
      }

      if (suggestion.action === "set-summary" && typeof suggestion.value === "string") {
        return { ...current, summary: suggestion.value };
      }

      if (suggestion.action === "add-skill" && typeof suggestion.value === "string") {
        return includesText(current.skills, suggestion.value)
          ? current
          : { ...current, skills: [...current.skills, suggestion.value] };
      }

      if (suggestion.action === "add-experience" && isExperienceValue(suggestion.value)) {
        return hasMatchingExperience(current.experience, suggestion.value)
          ? current
          : { ...current, experience: [...current.experience, suggestion.value] };
      }

      if (suggestion.action === "update-experience" && isExperienceValue(suggestion.value)) {
        const experience = suggestion.value;

        return {
          ...current,
          experience: current.experience.map((item) =>
            isMatchingExperience(item, experience)
              ? {
                  ...item,
                  period: experience.period || item.period,
                  bullets: mergeTextArrays(item.bullets, experience.bullets),
                }
              : item,
          ),
        };
      }

      if (suggestion.action === "add-education" && isEducationValue(suggestion.value)) {
        return includesText(
          current.education.map((item) => item.school),
          suggestion.value.school,
        )
          ? current
          : { ...current, education: [...current.education, suggestion.value] };
      }

      if (suggestion.action === "add-certification" && typeof suggestion.value === "string") {
        return includesText(current.certifications, suggestion.value)
          ? current
          : { ...current, certifications: [...current.certifications, suggestion.value] };
      }

      if (suggestion.action === "add-language" && typeof suggestion.value === "string") {
        return includesText(current.languages, suggestion.value)
          ? current
          : { ...current, languages: [...current.languages, suggestion.value] };
      }

      if (suggestion.action === "add-project" && isProjectValue(suggestion.value)) {
        return includesText(
          current.projects.map((item) => item.name),
          suggestion.value.name,
        )
          ? current
          : { ...current, projects: [...current.projects, suggestion.value] };
      }

      return current;
    }, draft),
  );
}

function addPersonalDifferences(
  draft: CvDraft,
  profile: LinkedInProfile,
  differences: LinkedInDifference[],
  suggestions: LinkedInSuggestion[],
) {
  addPersonalFieldDifference("headline", draft.personal.headline, profile.personal.headline, differences, suggestions);
  addPersonalFieldDifference("location", draft.personal.location, profile.personal.location, differences, suggestions);
  addPersonalFieldDifference("website", draft.personal.website, profile.personal.website, differences, suggestions);
}

function addPersonalFieldDifference(
  field: "headline" | "location" | "website",
  cvValue: string,
  linkedInValue: string,
  differences: LinkedInDifference[],
  suggestions: LinkedInSuggestion[],
) {
  if (!linkedInValue || sameText(cvValue, linkedInValue)) {
    return;
  }

  const suggestion = addSuggestion(suggestions, {
    section: "personal",
    action: "set-personal",
    label: `Use LinkedIn ${field}`,
    value: linkedInValue,
    target: { field },
  });

  addDifference(differences, {
    section: "personal",
    type: cvValue ? "conflict" : "missing-in-cv",
    severity: cvValue ? "medium" : "info",
    title: cvValue ? `Different ${field}` : `Missing ${field}`,
    cvValue,
    linkedInValue,
    suggestion: suggestion.label,
    suggestionId: suggestion.id,
  });
}

function addSummaryDifference(
  draft: CvDraft,
  profile: LinkedInProfile,
  differences: LinkedInDifference[],
  suggestions: LinkedInSuggestion[],
) {
  if (!profile.about) {
    return;
  }

  if (!draft.summary || profile.about.length > draft.summary.length + 80) {
    const suggestion = addSuggestion(suggestions, {
      section: "summary",
      action: "set-summary",
      label: "Use richer LinkedIn about section",
      value: profile.about,
    });

    addDifference(differences, {
      section: "summary",
      type: draft.summary ? "richer-on-linkedin" : "missing-in-cv",
      severity: "medium",
      title: draft.summary ? "LinkedIn summary is richer" : "CV summary is missing",
      cvValue: draft.summary,
      linkedInValue: profile.about,
      suggestion: suggestion.label,
      suggestionId: suggestion.id,
    });
  }
}

function addSkillDifferences(
  draft: CvDraft,
  profile: LinkedInProfile,
  differences: LinkedInDifference[],
  suggestions: LinkedInSuggestion[],
) {
  for (const skill of profile.skills) {
    if (!includesText(draft.skills, skill)) {
      const suggestion = addSuggestion(suggestions, {
        section: "skills",
        action: "add-skill",
        label: `Add skill: ${skill}`,
        value: skill,
      });

      addDifference(differences, {
        section: "skills",
        type: "missing-in-cv",
        severity: "info",
        title: `Skill missing in CV: ${skill}`,
        linkedInValue: skill,
        suggestion: suggestion.label,
        suggestionId: suggestion.id,
      });
    }
  }

  for (const skill of draft.skills) {
    if (!includesText(profile.skills, skill)) {
      addDifference(differences, {
        section: "skills",
        type: "only-in-cv",
        severity: "info",
        title: `Skill only in CV: ${skill}`,
        cvValue: skill,
      });
    }
  }
}

function addExperienceDifferences(
  draft: CvDraft,
  profile: LinkedInProfile,
  differences: LinkedInDifference[],
  suggestions: LinkedInSuggestion[],
) {
  for (const position of profile.positions) {
    const match = draft.experience.find((item) => isMatchingExperience(item, position));

    if (!match) {
      const suggestion = addSuggestion(suggestions, {
        section: "experience",
        action: "add-experience",
        label: `Add experience: ${formatExperienceTitle(position)}`,
        value: position,
      });

      addDifference(differences, {
        section: "experience",
        type: "missing-in-cv",
        severity: "high",
        title: `Experience missing in CV: ${formatExperienceTitle(position)}`,
        linkedInValue: formatExperienceValue(position),
        suggestion: suggestion.label,
        suggestionId: suggestion.id,
      });
      continue;
    }

    if (position.period && match.period && !sameText(position.period, match.period)) {
      const suggestion = addSuggestion(suggestions, {
        section: "experience",
        action: "update-experience",
        label: `Use LinkedIn dates for ${formatExperienceTitle(position)}`,
        value: position,
      });

      addDifference(differences, {
        section: "experience",
        type: "conflict",
        severity: "medium",
        title: `Different dates: ${formatExperienceTitle(position)}`,
        cvValue: match.period,
        linkedInValue: position.period,
        suggestion: suggestion.label,
        suggestionId: suggestion.id,
      });
    }

    if (position.bullets.join(" ").length > match.bullets.join(" ").length + 80) {
      const suggestion = addSuggestion(suggestions, {
        section: "experience",
        action: "update-experience",
        label: `Merge richer LinkedIn description for ${formatExperienceTitle(position)}`,
        value: position,
      });

      addDifference(differences, {
        section: "experience",
        type: "richer-on-linkedin",
        severity: "medium",
        title: `LinkedIn has richer description: ${formatExperienceTitle(position)}`,
        cvValue: match.bullets.join("\n"),
        linkedInValue: position.bullets.join("\n"),
        suggestion: suggestion.label,
        suggestionId: suggestion.id,
      });
    }
  }

  for (const item of draft.experience) {
    if (!profile.positions.some((position) => isMatchingExperience(item, position))) {
      addDifference(differences, {
        section: "experience",
        type: "only-in-cv",
        severity: "info",
        title: `Experience only in CV: ${formatExperienceTitle(item)}`,
        cvValue: formatExperienceValue(item),
      });
    }
  }
}

function addEducationDifferences(
  draft: CvDraft,
  profile: LinkedInProfile,
  differences: LinkedInDifference[],
  suggestions: LinkedInSuggestion[],
) {
  for (const education of profile.education) {
    if (!draft.education.some((item) => sameText(item.school, education.school))) {
      const suggestion = addSuggestion(suggestions, {
        section: "education",
        action: "add-education",
        label: `Add education: ${education.school || education.degree}`,
        value: education,
      });

      addDifference(differences, {
        section: "education",
        type: "missing-in-cv",
        severity: "medium",
        title: `Education missing in CV: ${education.school || education.degree}`,
        linkedInValue: [education.degree, education.school, education.period].filter(Boolean).join(" | "),
        suggestion: suggestion.label,
        suggestionId: suggestion.id,
      });
    }
  }
}

function addListDifferences(
  section: "certifications" | "languages",
  cvValues: string[],
  linkedInValues: string[],
  differences: LinkedInDifference[],
  suggestions: LinkedInSuggestion[],
) {
  for (const value of linkedInValues) {
    if (!includesText(cvValues, value)) {
      const suggestion = addSuggestion(suggestions, {
        section,
        action: section === "certifications" ? "add-certification" : "add-language",
        label: `Add ${section.slice(0, -1)}: ${value}`,
        value,
      });

      addDifference(differences, {
        section,
        type: "missing-in-cv",
        severity: "info",
        title: `${capitalize(section.slice(0, -1))} missing in CV: ${value}`,
        linkedInValue: value,
        suggestion: suggestion.label,
        suggestionId: suggestion.id,
      });
    }
  }
}

function addProjectDifferences(
  draft: CvDraft,
  profile: LinkedInProfile,
  differences: LinkedInDifference[],
  suggestions: LinkedInSuggestion[],
) {
  for (const project of profile.projects) {
    if (!draft.projects.some((item) => sameText(item.name, project.name))) {
      const suggestion = addSuggestion(suggestions, {
        section: "projects",
        action: "add-project",
        label: `Add project: ${project.name}`,
        value: project,
      });

      addDifference(differences, {
        section: "projects",
        type: "missing-in-cv",
        severity: "medium",
        title: `Project missing in CV: ${project.name}`,
        linkedInValue: project.description,
        suggestion: suggestion.label,
        suggestionId: suggestion.id,
      });
    }
  }
}

function addDifference(differences: LinkedInDifference[], input: DifferenceInput) {
  differences.push({
    id: createId(`${input.section}-${input.type}-${input.title}-${differences.length}`),
    ...input,
  });
}

function addSuggestion(
  suggestions: LinkedInSuggestion[],
  input: Omit<LinkedInSuggestion, "id">,
) {
  const suggestion = {
    id: createId(`${input.section}-${input.action}-${input.label}-${suggestions.length}`),
    ...input,
  };

  suggestions.push(suggestion);

  return suggestion;
}

function includesText(values: string[], value: string) {
  return values.some((item) => sameText(item, value));
}

function isMatchingExperience(left: CvExperienceItem, right: CvExperienceItem) {
  const leftCompany = normalizeKey(left.company);
  const rightCompany = normalizeKey(right.company);
  const leftRole = normalizeKey(left.role);
  const rightRole = normalizeKey(right.role);

  return Boolean(
    (leftCompany && rightCompany && leftCompany === rightCompany) ||
      (leftCompany && rightCompany && (leftCompany.includes(rightCompany) || rightCompany.includes(leftCompany))) ||
      (leftRole && rightRole && leftRole === rightRole && !leftCompany && !rightCompany),
  );
}

function hasMatchingExperience(items: CvExperienceItem[], item: CvExperienceItem) {
  return items.some((current) => isMatchingExperience(current, item));
}

function mergeTextArrays(left: string[], right: string[]) {
  return [...left, ...right.filter((item) => !includesText(left, item))];
}

function formatExperienceTitle(item: CvExperienceItem) {
  return [item.role, item.company].filter(Boolean).join(" / ") || "Experience";
}

function formatExperienceValue(item: CvExperienceItem) {
  return [formatExperienceTitle(item), item.period, item.bullets.join("; ")].filter(Boolean).join(" | ");
}

function isSuggestion(value: unknown): value is LinkedInSuggestion {
  return value !== null && typeof value === "object" && "action" in value && "id" in value;
}

function isExperienceValue(value: unknown): value is CvExperienceItem {
  return value !== null && typeof value === "object" && ("role" in value || "company" in value);
}

function isEducationValue(value: unknown): value is CvDraft["education"][number] {
  return value !== null && typeof value === "object" && ("school" in value || "degree" in value);
}

function isProjectValue(value: unknown): value is CvDraft["projects"][number] {
  return value !== null && typeof value === "object" && ("name" in value || "description" in value);
}

function createId(value: string) {
  return normalizeKey(value).replace(/\s+/g, "-") || "linkedin-diff";
}

function capitalize(value: string) {
  return value ? `${value[0]?.toUpperCase()}${value.slice(1)}` : value;
}
