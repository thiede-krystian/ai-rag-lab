export type CvLink = {
  label: string;
  url: string;
};

export type CvPersonalInfo = {
  name: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  website: string;
  links: CvLink[];
};

export type CvExperienceItem = {
  role: string;
  company: string;
  location: string;
  period: string;
  bullets: string[];
};

export type CvProjectItem = {
  name: string;
  description: string;
  technologies: string[];
};

export type CvEducationItem = {
  school: string;
  degree: string;
  period: string;
  details: string;
};

export type CvDraft = {
  personal: CvPersonalInfo;
  summary: string;
  aspirations: string;
  skills: string[];
  experience: CvExperienceItem[];
  projects: CvProjectItem[];
  education: CvEducationItem[];
  certifications: string[];
  languages: string[];
};

export type CvTemplateId = "classic-a4" | "three-column-a4";

export const CV_MAKER_STORAGE_KEY = "ai-rag-lab-cv-maker-draft-v1";

export const LINKEDIN_PROFILE_STORAGE_KEY = "ai-rag-lab-linkedin-profile-v1";

export type LinkedInProfile = {
  personal: {
    firstName: string;
    lastName: string;
    fullName: string;
    headline: string;
    location: string;
    website: string;
    email: string;
    phone: string;
  };
  about: string;
  positions: CvExperienceItem[];
  education: CvEducationItem[];
  skills: string[];
  certifications: string[];
  languages: string[];
  projects: CvProjectItem[];
};

export type LinkedInDifferenceSection =
  | "personal"
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "certifications"
  | "languages"
  | "projects";

export type LinkedInDifferenceType =
  | "missing-in-cv"
  | "only-in-cv"
  | "conflict"
  | "richer-on-linkedin";

export type LinkedInDifferenceSeverity = "info" | "medium" | "high";

export type LinkedInDifference = {
  id: string;
  section: LinkedInDifferenceSection;
  type: LinkedInDifferenceType;
  severity: LinkedInDifferenceSeverity;
  title: string;
  cvValue?: string;
  linkedInValue?: string;
  suggestion?: string;
  suggestionId?: string;
};

export type LinkedInSuggestionAction =
  | "set-personal"
  | "set-summary"
  | "add-skill"
  | "add-experience"
  | "update-experience"
  | "add-education"
  | "add-certification"
  | "add-language"
  | "add-project";

export type LinkedInSuggestion = {
  id: string;
  section: LinkedInDifferenceSection;
  action: LinkedInSuggestionAction;
  label: string;
  value: unknown;
  target?: {
    company?: string;
    role?: string;
    field?: keyof CvPersonalInfo;
  };
};
