import { MessageType, STORAGE_KEYS } from '../shared/constants';
import type { Message, MessageResponse } from '../shared/messaging';
import type { FieldMap, UserProfile, TrackedApplication } from '../shared/types';
import { getStorage, setStorage } from '../shared/storage';
import { validateApiKey, getMatchScore, generateCoverLetter } from './ai-service';
import { sendTabMessage } from '../shared/messaging';

// Cache field maps per tab
const fieldMapCache = new Map<number, FieldMap>();

// Register message listener synchronously (MV3 requirement)
chrome.runtime.onMessage.addListener(
  (message: Message, sender: chrome.runtime.MessageSender, sendResponse: (r: MessageResponse) => void) => {
    handleMessage(message, sender).then(sendResponse).catch((err) =>
      sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) })
    );
    return true;
  }
);

// Show badge on ATS pages
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const isATS = tab.url.includes('greenhouse.io') || tab.url.includes('jobs.lever.co');
    if (isATS) {
      chrome.action.setBadgeText({ text: 'JOB', tabId });
      chrome.action.setBadgeBackgroundColor({ color: '#22c55e', tabId });
    }
  }
});

// Clean up cache when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  fieldMapCache.delete(tabId);
});

async function handleMessage(message: Message, sender: chrome.runtime.MessageSender): Promise<MessageResponse> {
  switch (message.type) {
    case MessageType.PAGE_DETECTED: {
      // Content script detected an ATS page
      const tabId = sender.tab?.id;
      if (tabId) {
        chrome.action.setBadgeText({ text: 'JOB', tabId });
        chrome.action.setBadgeBackgroundColor({ color: '#22c55e', tabId });
      }
      return { success: true };
    }

    case MessageType.FIELDS_SCANNED: {
      // Content script scanned fields, cache them
      const tabId = sender.tab?.id;
      const fieldMap = message.payload as FieldMap;
      if (tabId && fieldMap) {
        fieldMapCache.set(tabId, fieldMap);
      }
      return { success: true };
    }

    case MessageType.GET_FIELD_MAP: {
      // Popup requesting field map for active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return { success: false, error: 'No active tab' };

      const cached = fieldMapCache.get(tab.id);
      if (cached) return { success: true, data: cached };

      // Try asking content script to scan
      try {
        const res = await sendTabMessage<void, FieldMap>(tab.id, MessageType.SCAN_PAGE);
        if (res.success && res.data) {
          fieldMapCache.set(tab.id, res.data);
          return { success: true, data: res.data };
        }
      } catch {
        // Content script not available
      }
      return { success: false, error: 'No field map available. Navigate to a job application on Greenhouse or Lever.' };
    }

    case MessageType.SCAN_PAGE: {
      // Forward scan request to content script
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return { success: false, error: 'No active tab' };
      try {
        const res = await sendTabMessage<void, FieldMap>(tab.id, MessageType.SCAN_PAGE);
        if (res.success && res.data) {
          fieldMapCache.set(tab.id, res.data);
        }
        return res;
      } catch {
        return { success: false, error: 'Could not communicate with the page. Make sure you are on a Greenhouse or Lever job application.' };
      }
    }

    case MessageType.FILL_FIELDS: {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return { success: false, error: 'No active tab' };

      // Get profile
      const profile = await getStorage(STORAGE_KEYS.PROFILE);
      if (!profile) return { success: false, error: 'No profile saved. Please fill out your profile first.' };

      // Get field map
      const fieldMap = fieldMapCache.get(tab.id);
      if (!fieldMap) return { success: false, error: 'No fields detected. Try refreshing the page.' };

      // Send fill command to content script with profile and field map
      try {
        const res = await sendTabMessage(tab.id, MessageType.FILL_FIELDS, { profile, fieldMap });

        // Auto-track the application on successful fill (deduplicate by URL)
        if (res.success && fieldMap) {
          try {
            const apps = (await getStorage(STORAGE_KEYS.APPLICATIONS)) || [];
            const url = tab.url || '';
            const alreadyTracked = url && apps.some((a) => a.url === url);
            if (!alreadyTracked) {
              const newApp: TrackedApplication = {
                id: crypto.randomUUID(),
                company: (fieldMap.company || '').trim() || 'Unknown Company',
                jobTitle: (fieldMap.jobTitle || '').trim() || 'Unknown Position',
                url,
                appliedAt: Date.now(),
                status: 'applied',
                notes: '',
              };
              apps.push(newApp);
              await setStorage(STORAGE_KEYS.APPLICATIONS, apps);
            }
          } catch {
            // Don't fail the fill if tracking fails
          }
        }

        return res;
      } catch {
        return { success: false, error: 'Could not fill fields. Make sure you are on the application page.' };
      }
    }

    case MessageType.GET_PROFILE: {
      const profile = await getStorage(STORAGE_KEYS.PROFILE);
      return { success: true, data: profile || null };
    }

    case MessageType.SET_PROFILE: {
      const profile = message.payload as UserProfile;
      await setStorage(STORAGE_KEYS.PROFILE, profile);
      return { success: true };
    }

    case MessageType.GET_SETTINGS: {
      const settings = await getStorage(STORAGE_KEYS.SETTINGS);
      return { success: true, data: settings || { apiKey: '' } };
    }

    case MessageType.SET_API_KEY: {
      const apiKey = message.payload as string;
      const current = await getStorage(STORAGE_KEYS.SETTINGS);
      await setStorage(STORAGE_KEYS.SETTINGS, { ...current, apiKey });
      return { success: true };
    }

    case MessageType.VALIDATE_API_KEY: {
      const key = message.payload as string;
      const valid = await validateApiKey(key);
      return { success: true, data: valid };
    }

    case MessageType.GET_MATCH_SCORE: {
      const { jobDescription, jobTitle, company } = message.payload as {
        jobDescription: string; jobTitle: string; company: string;
      };
      const profile = await getStorage(STORAGE_KEYS.PROFILE);
      if (!profile) return { success: false, error: 'No profile saved. Please fill out your profile first.' };

      const experienceText = profile.experience
        .map((e) => `${e.title} at ${e.company} (${e.startDate} - ${e.current ? 'Present' : e.endDate}): ${e.description}`)
        .join('\n');
      const educationText = profile.education
        .map((e) => `${e.degree} in ${e.field} from ${e.school} (${e.graduationYear})`)
        .join('\n');

      const result = await getMatchScore(
        { summary: profile.summary, skills: profile.skills, experience: experienceText, education: educationText, resumeText: profile.resumeText },
        jobDescription, jobTitle, company
      );
      return { success: true, data: result };
    }

    case MessageType.GENERATE_COVER_LETTER: {
      const { jobDescription, jobTitle, company } = message.payload as {
        jobDescription: string; jobTitle: string; company: string;
      };
      const profile = await getStorage(STORAGE_KEYS.PROFILE);
      if (!profile) return { success: false, error: 'No profile saved. Please fill out your profile first.' };

      const experienceText = profile.experience
        .map((e) => `${e.title} at ${e.company} (${e.startDate} - ${e.current ? 'Present' : e.endDate}): ${e.description}`)
        .join('\n');

      const result = await generateCoverLetter(
        { summary: profile.summary, skills: profile.skills, experience: experienceText, resumeText: profile.resumeText },
        jobDescription, jobTitle, company
      );
      return { success: true, data: result };
    }

    case MessageType.GET_APPLICATIONS: {
      const apps = (await getStorage(STORAGE_KEYS.APPLICATIONS)) || [];
      return { success: true, data: apps };
    }

    case MessageType.ADD_APPLICATION: {
      const newApp = message.payload as TrackedApplication;
      const apps = (await getStorage(STORAGE_KEYS.APPLICATIONS)) || [];
      apps.push(newApp);
      await setStorage(STORAGE_KEYS.APPLICATIONS, apps);
      return { success: true, data: newApp };
    }

    case MessageType.UPDATE_APPLICATION: {
      const update = message.payload as Partial<TrackedApplication> & { id: string };
      const apps = (await getStorage(STORAGE_KEYS.APPLICATIONS)) || [];
      const idx = apps.findIndex((a) => a.id === update.id);
      if (idx === -1) return { success: false, error: 'Application not found' };
      apps[idx] = { ...apps[idx], ...update };
      await setStorage(STORAGE_KEYS.APPLICATIONS, apps);
      return { success: true, data: apps[idx] };
    }

    case MessageType.DELETE_APPLICATION: {
      const deleteId = message.payload as string;
      const apps = (await getStorage(STORAGE_KEYS.APPLICATIONS)) || [];
      const filtered = apps.filter((a) => a.id !== deleteId);
      await setStorage(STORAGE_KEYS.APPLICATIONS, filtered);
      return { success: true };
    }

    default:
      return { success: false, error: `Unknown message type: ${message.type}` };
  }
}
