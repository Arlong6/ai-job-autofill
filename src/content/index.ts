import { detectPlatform } from './detector';
import { GreenhouseAdapter } from './platforms/greenhouse';
import { LeverAdapter } from './platforms/lever';
import type { PlatformAdapter } from './platforms/types';
import { scanPage } from './scanner';
import type { FieldMap } from './scanner';
import { fillTextField, fillDropdown, fillRadio, fillCheckbox, fillCustomDropdown } from './filler';

// Inline message types (content script must be self-contained — these match shared/constants.ts)
const MSG = {
  SCAN_PAGE: 'SCAN_PAGE',
  GET_FIELD_MAP: 'GET_FIELD_MAP',
  FILL_FIELDS: 'FILL_FIELDS',
  PAGE_DETECTED: 'PAGE_DETECTED',
  FIELDS_SCANNED: 'FIELDS_SCANNED',
} as const;

interface UserProfile {
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
  education: Array<{ school: string; degree: string; field: string; graduationYear: string; gpa: string }>;
  experience: Array<{ company: string; title: string; startDate: string; endDate: string; description: string; current: boolean }>;
  resumeText: string;
  country: string;
  workAuthorization: string;
  needSponsorship: string;
  expectedSalary: string;
  startDate: string;
  noticePeriod?: string;
  preferredWorkArrangement?: string;
  howDidYouHear?: string;
  pronouns?: string;
  gender?: string;
  transgender?: string;
  sexualOrientation?: string;
  hispanicOrLatinx?: string;
  ethnicity?: string;
  veteranStatus?: string;
  disabilityStatus?: string;
}

let currentAdapter: PlatformAdapter | null = null;
let cachedFieldMap: FieldMap | null = null;

function getAdapter(): PlatformAdapter | null {
  const platform = detectPlatform();
  if (platform === 'greenhouse') return new GreenhouseAdapter();
  if (platform === 'lever') return new LeverAdapter();
  return null;
}

function getProfileValue(profile: UserProfile, key: string): string {
  switch (key) {
    case 'firstName': return profile.firstName;
    case 'lastName': return profile.lastName;
    case 'fullName': return `${profile.firstName} ${profile.lastName}`.trim();
    case 'email': return profile.email;
    case 'phone': return profile.phone;
    case 'location': return profile.location;
    case 'linkedinUrl': return profile.linkedinUrl;
    case 'portfolioUrl': return profile.portfolioUrl;
    case 'currentTitle': return profile.currentTitle;
    case 'yearsExperience': return profile.yearsExperience;
    case 'summary': return profile.summary;
    case 'school': return profile.education[0]?.school || '';
    case 'degree': return profile.education[0]?.degree || '';
    case 'field': return profile.education[0]?.field || '';
    case 'graduationYear': return profile.education[0]?.graduationYear || '';
    case 'gpa': return profile.education[0]?.gpa || '';
    case 'currentCompany': return profile.experience[0]?.company || '';
    case 'resumeText': return profile.resumeText;
    case 'country': return profile.country;
    case 'workAuthorization': return profile.workAuthorization;
    case 'needSponsorship': return profile.needSponsorship;
    case 'expectedSalary': return profile.expectedSalary;
    case 'startDate': return profile.startDate;
    case 'noticePeriod': return profile.noticePeriod || '';
    case 'preferredWorkArrangement': return profile.preferredWorkArrangement || '';
    case 'howDidYouHear': return profile.howDidYouHear || '';
    case 'pronouns': return profile.pronouns || '';
    case 'gender': return profile.gender || '';
    case 'transgender': return profile.transgender || '';
    case 'sexualOrientation': return profile.sexualOrientation || '';
    case 'hispanicOrLatinx': return profile.hispanicOrLatinx || '';
    case 'ethnicity': return profile.ethnicity || '';
    case 'veteranStatus': return profile.veteranStatus || '';
    case 'disabilityStatus': return profile.disabilityStatus || '';
    default: return '';
  }
}

function doFill(profile: UserProfile, fieldMap: FieldMap) {
  const results: Array<{ label: string; status: 'filled' | 'failed' | 'skipped'; reason?: string }> = [];
  let filled = 0;
  let failed = 0;
  let skipped = 0;

  for (const entry of fieldMap.fields) {
    const { detected, profileKey } = entry;

    if (!profileKey) {
      skipped++;
      results.push({ label: detected.label, status: 'skipped', reason: 'No matching profile field' });
      continue;
    }

    if (detected.type === 'file') {
      skipped++;
      results.push({ label: detected.label, status: 'skipped', reason: 'File upload not supported' });
      continue;
    }

    const value = getProfileValue(profile, profileKey);
    if (!value) {
      skipped++;
      results.push({ label: detected.label, status: 'skipped', reason: 'Profile field is empty' });
      continue;
    }

    const el = document.querySelector(detected.selector) as HTMLElement | null;
    if (!el) {
      failed++;
      results.push({ label: detected.label, status: 'failed', reason: 'Element not found' });
      continue;
    }

    let success = false;
    if (detected.type === 'select') {
      success = fillDropdown(el as HTMLSelectElement, value);
    } else if (detected.type === 'custom-dropdown') {
      // fillCustomDropdown is async; handle synchronously for now
      fillCustomDropdown(el, value).then((ok) => {
        if (!ok) console.warn(`[autofill] custom-dropdown fill failed: ${detected.label}`);
      });
      success = true; // optimistic
    } else if (detected.type === 'radio') {
      const container = el.closest('fieldset') || el.parentElement || el;
      success = fillRadio(container as HTMLElement, value);
    } else if (detected.type === 'checkbox') {
      const container = el.closest('fieldset') || el.parentElement || el;
      success = fillCheckbox(container as HTMLElement, value);
    } else {
      success = fillTextField(el as HTMLInputElement | HTMLTextAreaElement, value);
    }

    if (success) {
      filled++;
      results.push({ label: detected.label, status: 'filled' });
    } else {
      failed++;
      results.push({ label: detected.label, status: 'failed', reason: 'Could not set value' });
    }
  }

  return {
    total: fieldMap.fields.length,
    filled,
    failed,
    skipped,
    details: results,
  };
}

// Listen for messages from popup/background
chrome.runtime.onMessage.addListener(
  (message: { type: string; payload?: unknown }, _sender, sendResponse) => {
    if (message.type === MSG.SCAN_PAGE) {
      const adapter = getAdapter();
      if (!adapter) {
        sendResponse({ success: false, error: 'Not on a supported ATS page' });
        return true;
      }
      const fieldMap = scanPage(adapter);
      fieldMap.platform = detectPlatform();
      cachedFieldMap = fieldMap;
      sendResponse({ success: true, data: fieldMap });
      return true;
    }

    if (message.type === MSG.FILL_FIELDS) {
      const { profile, fieldMap } = message.payload as { profile: UserProfile; fieldMap: FieldMap };
      const result = doFill(profile, fieldMap);
      sendResponse({ success: true, data: result });
      return true;
    }

    return false;
  }
);

// Auto-detect on load
function init() {
  currentAdapter = getAdapter();
  if (!currentAdapter) return;

  // Notify background that we detected an ATS page
  chrome.runtime.sendMessage({ type: MSG.PAGE_DETECTED }).catch(() => {});

  // Scan fields and send to background
  const fieldMap = scanPage(currentAdapter);
  fieldMap.platform = detectPlatform();
  cachedFieldMap = fieldMap;

  chrome.runtime.sendMessage({ type: MSG.FIELDS_SCANNED, payload: fieldMap }).catch(() => {});
}

// Run init after DOM is ready
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  init();
} else {
  document.addEventListener('DOMContentLoaded', init);
}
