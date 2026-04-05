import type { PlatformAdapter, DetectedField } from './platforms/types';

// Inline the field label map (content script must be self-contained)
const FIELD_LABEL_MAP: Record<string, string> = {
  // --- Name ---
  'first name': 'firstName',
  'first': 'firstName',
  'given name': 'firstName',
  'preferred name': 'firstName',
  'preferred first name': 'firstName',
  'last name': 'lastName',
  'last': 'lastName',
  'family name': 'lastName',
  'surname': 'lastName',
  'full name': 'fullName',
  'name': 'fullName',
  // --- Contact ---
  'email': 'email',
  'email address': 'email',
  'e-mail': 'email',
  'phone': 'phone',
  'phone number': 'phone',
  'mobile': 'phone',
  'mobile number': 'phone',
  'mobile phone': 'phone',
  'cell phone': 'phone',
  'telephone': 'phone',
  'contact number': 'phone',
  // --- Location ---
  'location': 'location',
  'city': 'location',
  'address': 'location',
  'current location': 'location',
  'country': 'country',
  'country/region': 'country',
  'country of residence': 'country',
  // --- Links ---
  'linkedin': 'linkedinUrl',
  'linkedin url': 'linkedinUrl',
  'linkedin profile': 'linkedinUrl',
  'linkedin profile url': 'linkedinUrl',
  'portfolio': 'portfolioUrl',
  'portfolio url': 'portfolioUrl',
  'website': 'portfolioUrl',
  'website url': 'portfolioUrl',
  'personal website': 'portfolioUrl',
  'personal site': 'portfolioUrl',
  'github': 'portfolioUrl',
  'github url': 'portfolioUrl',
  'github profile': 'portfolioUrl',
  'dribbble': 'portfolioUrl',
  'behance': 'portfolioUrl',
  // --- Education ---
  'school': 'school',
  'university': 'school',
  'college': 'school',
  'school name': 'school',
  'institution': 'school',
  'degree': 'degree',
  'degree type': 'degree',
  'education level': 'degree',
  'highest education': 'degree',
  'level of education': 'degree',
  'field of study': 'field',
  'major': 'field',
  'discipline': 'field',
  'area of study': 'field',
  'concentration': 'field',
  'specialization': 'field',
  'graduation year': 'graduationYear',
  'grad year': 'graduationYear',
  'year of graduation': 'graduationYear',
  'graduation date': 'graduationYear',
  'gpa': 'gpa',
  'grade point average': 'gpa',
  'cumulative gpa': 'gpa',
  // --- Work ---
  'current company': 'currentCompany',
  'company': 'currentCompany',
  'company name': 'currentCompany',
  'current employer': 'currentCompany',
  'organization': 'currentCompany',
  'current title': 'currentTitle',
  'job title': 'currentTitle',
  'title': 'currentTitle',
  'current role': 'currentTitle',
  'current position': 'currentTitle',
  'years of experience': 'yearsExperience',
  'total experience': 'yearsExperience',
  'experience': 'yearsExperience',
  'work experience': 'yearsExperience',
  // --- Text areas ---
  'summary': 'summary',
  'cover letter': 'summary',
  'additional information': 'summary',
  'anything else': 'summary',
  'resume': 'resumeText',
  'resume text': 'resumeText',
  // --- Application details ---
  'salary expectation': 'expectedSalary',
  'salary expectations': 'expectedSalary',
  'desired salary': 'expectedSalary',
  'expected salary': 'expectedSalary',
  'expected compensation': 'expectedSalary',
  'salary requirement': 'expectedSalary',
  'salary requirements': 'expectedSalary',
  'start date': 'startDate',
  'available start date': 'startDate',
  'earliest start date': 'startDate',
  'when can you start': 'startDate',
  'availability': 'startDate',
  'notice period': 'noticePeriod',
  'current notice period': 'noticePeriod',
  'how much notice': 'noticePeriod',
  'pronouns': 'pronouns',
  'preferred pronouns': 'pronouns',
  'personal pronouns': 'pronouns',
  'how did you hear about us': 'howDidYouHear',
  'how did you hear about this job': 'howDidYouHear',
  'how did you hear about this role': 'howDidYouHear',
  'how did you hear about this position': 'howDidYouHear',
  'where did you hear about us': 'howDidYouHear',
  'source': 'howDidYouHear',
  'referral source': 'howDidYouHear',
  'work arrangement': 'preferredWorkArrangement',
  'work preference': 'preferredWorkArrangement',
  'preferred work arrangement': 'preferredWorkArrangement',
  'work style': 'preferredWorkArrangement',
};

// Maps common question-like labels to profile fields
const COMMON_ANSWERS: Record<string, string> = {
  // --- Work authorization ---
  'authorized to work': 'workAuthorization',
  'legally authorized': 'workAuthorization',
  'work authorization': 'workAuthorization',
  'right to work': 'workAuthorization',
  'eligible to work': 'workAuthorization',
  'authorized to work in the united states': 'workAuthorization',
  'legally authorized to work in the united states': 'workAuthorization',
  'authorized to work in the us': 'workAuthorization',
  // --- Visa sponsorship ---
  'require sponsorship': 'needSponsorship',
  'need sponsorship': 'needSponsorship',
  'visa sponsorship': 'needSponsorship',
  'immigration sponsorship': 'needSponsorship',
  'require visa sponsorship': 'needSponsorship',
  'sponsorship for employment visa': 'needSponsorship',
  'require employment visa sponsorship': 'needSponsorship',
  'future require sponsorship': 'needSponsorship',
  // --- Salary ---
  'compensation': 'expectedSalary',
  'compensation expectation': 'expectedSalary',
  'total compensation': 'expectedSalary',
  // --- Availability ---
  'available to start': 'startDate',
  'when are you available': 'startDate',
  // --- Gender & Identity ---
  'gender': 'gender',
  'gender identity': 'gender',
  'what is your gender': 'gender',
  'transgender': 'transgender',
  'identify as transgender': 'transgender',
  'do you identify as transgender': 'transgender',
  'sexual orientation': 'sexualOrientation',
  'pronouns': 'pronouns',
  // --- Ethnicity & Race ---
  'hispanic or latinx': 'hispanicOrLatinx',
  'hispanic or latino': 'hispanicOrLatinx',
  'are you hispanic or latinx': 'hispanicOrLatinx',
  'are you hispanic or latino': 'hispanicOrLatinx',
  'hispanic, latinx or of spanish origin': 'hispanicOrLatinx',
  'race': 'ethnicity',
  'ethnicity': 'ethnicity',
  'race/ethnicity': 'ethnicity',
  'racial identity': 'ethnicity',
  'race (*please select': 'ethnicity',
  // --- Veteran ---
  'veteran': 'veteranStatus',
  'veteran status': 'veteranStatus',
  'protected veteran': 'veteranStatus',
  'protected veteran status': 'veteranStatus',
  'military service': 'veteranStatus',
  'military status': 'veteranStatus',
  // --- Disability ---
  'disability': 'disabilityStatus',
  'disability status': 'disabilityStatus',
  'disability/chronic condition': 'disabilityStatus',
  'do you have a disability': 'disabilityStatus',
  // --- Work arrangement ---
  'remote or in-office': 'preferredWorkArrangement',
  'work location preference': 'preferredWorkArrangement',
  'willing to work on-site': 'preferredWorkArrangement',
  // --- Source ---
  'how did you hear': 'howDidYouHear',
  'where did you hear': 'howDidYouHear',
  'how did you find': 'howDidYouHear',
  'how did you learn': 'howDidYouHear',
};

export interface FieldMapEntry {
  detected: DetectedField;
  profileKey: string | null;
  confidence: number;
}

export interface FieldMap {
  platform: string;
  jobTitle: string;
  company: string;
  jobDescription: string;
  fields: FieldMapEntry[];
}

function matchLabel(label: string): { key: string | null; confidence: number } {
  const normalized = label.toLowerCase().trim();

  // Exact match in FIELD_LABEL_MAP
  if (FIELD_LABEL_MAP[normalized]) {
    return { key: FIELD_LABEL_MAP[normalized], confidence: 0.9 };
  }

  // Exact match in COMMON_ANSWERS
  if (COMMON_ANSWERS[normalized]) {
    return { key: COMMON_ANSWERS[normalized], confidence: 0.85 };
  }

  // Fuzzy match: check if any known label is a substring of the field label
  // Require minimum 4 chars to avoid false positives on short labels
  for (const [knownLabel, profileKey] of Object.entries(FIELD_LABEL_MAP)) {
    if (knownLabel.length >= 4 && normalized.length >= 4) {
      if (normalized.includes(knownLabel) || knownLabel.includes(normalized)) {
        return { key: profileKey, confidence: 0.6 };
      }
    }
  }

  // Fuzzy match against COMMON_ANSWERS for question-type fields
  for (const [questionPhrase, profileKey] of Object.entries(COMMON_ANSWERS)) {
    if (questionPhrase.length >= 5 && normalized.length >= 5) {
      if (normalized.includes(questionPhrase) || questionPhrase.includes(normalized)) {
        return { key: profileKey, confidence: 0.5 };
      }
    }
  }

  return { key: null, confidence: 0 };
}

export function scanPage(adapter: PlatformAdapter): FieldMap {
  const detectedFields = adapter.scanFields();
  const jobTitle = adapter.extractJobTitle();
  const company = adapter.extractCompany();
  const jobDescription = adapter.extractJobDescription();

  const fields: FieldMapEntry[] = detectedFields.map((detected) => {
    const { key, confidence } = matchLabel(detected.label);
    return { detected, profileKey: key, confidence };
  });

  return {
    platform: 'unknown', // Will be set by caller
    jobTitle,
    company,
    jobDescription,
    fields,
  };
}
