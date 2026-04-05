export interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  linkedinUrl: string;
  portfolioUrl: string;
  currentTitle: string;
  yearsExperience: string;
  summary: string;
  skills: string[];
  education: Education[];
  experience: WorkExperience[];
  customAnswers: CustomAnswer[];
  resumeText: string;
  // Application details
  country: string;
  workAuthorization: string;
  needSponsorship: string;
  expectedSalary: string;
  startDate: string;
  noticePeriod?: string;
  preferredWorkArrangement?: string;
  howDidYouHear?: string;
  pronouns?: string;
  // EEO / Demographics
  gender?: string;
  transgender?: string;
  sexualOrientation?: string;
  hispanicOrLatinx?: string;
  ethnicity?: string;
  veteranStatus?: string;
  disabilityStatus?: string;
}

export interface Education {
  school: string;
  degree: string;
  field: string;
  graduationYear: string;
  gpa: string;
}

export interface WorkExperience {
  company: string;
  title: string;
  startDate: string;
  endDate: string;
  description: string;
  current: boolean;
}

export interface CustomAnswer {
  question: string;
  answer: string;
}

export type ATSPlatform = 'greenhouse' | 'lever' | 'unknown';

export type FieldType = 'text' | 'email' | 'tel' | 'url' | 'date' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'file' | 'custom-dropdown';

export interface DetectedField {
  selector: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
}

export interface FieldMap {
  platform: ATSPlatform;
  jobTitle: string;
  company: string;
  jobDescription: string;
  fields: Array<{
    detected: DetectedField;
    profileKey: string | null;
    confidence: number;
  }>;
}

export interface FillInstruction {
  selector: string;
  value: string;
  type: FieldType;
}

export interface FillResult {
  total: number;
  filled: number;
  failed: number;
  skipped: number;
  details: Array<{
    label: string;
    status: 'filled' | 'failed' | 'skipped';
    reason?: string;
  }>;
}

export interface MatchScoreResult {
  overallScore: number;
  breakdown: {
    skills: { score: number; matched: string[]; missing: string[] };
    experience: { score: number; notes: string };
    education: { score: number; notes: string };
  };
  summary: string;
  tips: string[];
}

export interface CoverLetterResult {
  text: string;
  wordCount: number;
}

export interface Settings {
  apiKey: string;
}

export interface TrackedApplication {
  id: string;
  company: string;
  jobTitle: string;
  url: string;
  appliedAt: number;
  matchScore?: number;
  status: 'applied' | 'interviewing' | 'rejected' | 'offer' | 'ghosted';
  notes: string;
}
