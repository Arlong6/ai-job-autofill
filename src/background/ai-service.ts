import { GEMINI_MODEL, LIMITS } from '../shared/constants';
import { getStorage } from '../shared/storage';
import { STORAGE_KEYS } from '../shared/constants';
import type { MatchScoreResult, CoverLetterResult } from '../shared/types';

async function getApiKey(): Promise<string> {
  const settings = await getStorage(STORAGE_KEYS.SETTINGS);
  if (!settings?.apiKey) throw new Error('API key not set. Please add your Gemini API key in Settings.');
  return settings.apiKey;
}

export function extractJson(text: string): string {
  let cleaned = text.replace(/```json?\s*/g, '').replace(/```/g, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) cleaned = match[0];
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');
  return cleaned;
}

async function callGemini(systemPrompt: string, userMessage: string, maxTokens = 1024): Promise<string> {
  const apiKey = await getApiKey();

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userMessage }] }],
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature: 0.2,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const errMsg = (err as { error?: { message?: string } }).error?.message || response.statusText;
    if (response.status === 401 || response.status === 403) throw new Error('Invalid API key. Please check your Gemini API key in Settings.');
    if (response.status === 429) throw new Error('Rate limit exceeded. Please wait a moment and try again.');
    throw new Error(`Gemini API error (${response.status}): ${errMsg}`);
  }

  const data = await response.json() as {
    candidates?: { content: { parts: { text?: string; thought?: boolean }[] } }[];
  };

  if (!data.candidates || data.candidates.length === 0) {
    throw new Error('Gemini returned no response. The content may have been blocked by safety filters.');
  }

  const parts = data.candidates[0].content.parts;
  for (const part of parts) {
    if (part.text && !part.thought) return part.text;
  }
  return parts[parts.length - 1].text || '';
}

async function callGeminiPlainText(systemPrompt: string, userMessage: string, maxTokens = 2048): Promise<string> {
  const apiKey = await getApiKey();

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userMessage }] }],
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature: 0.7,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const errMsg = (err as { error?: { message?: string } }).error?.message || response.statusText;
    if (response.status === 401 || response.status === 403) throw new Error('Invalid API key. Please check your Gemini API key in Settings.');
    if (response.status === 429) throw new Error('Rate limit exceeded. Please wait a moment and try again.');
    throw new Error(`Gemini API error (${response.status}): ${errMsg}`);
  }

  const data = await response.json() as {
    candidates?: { content: { parts: { text?: string; thought?: boolean }[] } }[];
  };

  if (!data.candidates || data.candidates.length === 0) {
    throw new Error('Gemini returned no response. The content may have been blocked by safety filters.');
  }

  const parts = data.candidates[0].content.parts;
  for (const part of parts) {
    if (part.text && !part.thought) return part.text;
  }
  return parts[parts.length - 1].text || '';
}

export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Hi' }] }],
          generationConfig: { maxOutputTokens: 10 },
        }),
      }
    );
    return response.ok;
  } catch {
    return false;
  }
}

export async function getMatchScore(
  profile: { summary: string; skills: string[]; experience: string; education: string; resumeText: string },
  jobDescription: string,
  jobTitle: string,
  company: string
): Promise<MatchScoreResult> {
  const systemPrompt = `You are an expert career advisor analyzing job fit. Given a candidate's profile and a job posting, assess how well the candidate matches.

Return valid JSON with this exact structure:
{
  "overallScore": <number 0-100>,
  "breakdown": {
    "skills": { "score": <number 0-100>, "matched": ["skill1", "skill2"], "missing": ["skill1"] },
    "experience": { "score": <number 0-100>, "notes": "brief assessment" },
    "education": { "score": <number 0-100>, "notes": "brief assessment" }
  },
  "summary": "2-3 sentence overall assessment",
  "tips": ["actionable tip 1", "actionable tip 2", "actionable tip 3"]
}

Be honest and realistic in scoring. A 70+ is a strong match. Under 40 is a poor match.`;

  const resumeSnippet = profile.resumeText.slice(0, LIMITS.RESUME_MAX_CHARS);
  const jdSnippet = jobDescription.slice(0, LIMITS.JOB_DESCRIPTION_MAX_CHARS);

  const userMessage = `JOB: ${jobTitle} at ${company}

JOB DESCRIPTION:
${jdSnippet}

CANDIDATE PROFILE:
Summary: ${profile.summary}
Skills: ${profile.skills.join(', ')}
Experience: ${profile.experience}
Education: ${profile.education}
Resume: ${resumeSnippet}`;

  const result = await callGemini(systemPrompt, userMessage, 1024);
  const json = extractJson(result);
  try {
    return JSON.parse(json) as MatchScoreResult;
  } catch {
    throw new Error('Failed to parse AI response. Please try again.');
  }
}

export async function generateCoverLetter(
  profile: { summary: string; skills: string[]; experience: string; resumeText: string },
  jobDescription: string,
  jobTitle: string,
  company: string
): Promise<CoverLetterResult> {
  const systemPrompt = `You are a professional cover letter writer. Write a compelling cover letter for the candidate applying to the specified job.

Guidelines:
- 250-350 words
- Natural, professional tone — NOT robotic or overly formal
- Specific to the job and company — reference actual requirements from the job description
- Highlight relevant skills and experience from the candidate's profile
- Do NOT use cliche phrases like "I am writing to express my interest" or "I believe I would be a great fit"
- Start with something engaging and specific
- End with a clear call to action
- Do NOT include addresses, dates, or "Dear Hiring Manager" — just the body text

Return ONLY the cover letter text, nothing else.`;

  const resumeSnippet = profile.resumeText.slice(0, LIMITS.RESUME_MAX_CHARS);
  const jdSnippet = jobDescription.slice(0, LIMITS.JOB_DESCRIPTION_MAX_CHARS);

  const userMessage = `JOB: ${jobTitle} at ${company}

JOB DESCRIPTION:
${jdSnippet}

CANDIDATE PROFILE:
Summary: ${profile.summary}
Skills: ${profile.skills.join(', ')}
Experience: ${profile.experience}
Resume: ${resumeSnippet}`;

  const text = await callGeminiPlainText(systemPrompt, userMessage, 2048);
  const wordCount = text.trim().split(/\s+/).length;
  return { text: text.trim(), wordCount };
}
