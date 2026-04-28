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
