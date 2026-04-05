import { useState } from 'preact/hooks';
import { sendMessage } from '../../shared/messaging';
import { MessageType } from '../../shared/constants';
import type { CoverLetterResult } from '../../shared/types';

interface Props {
  jobDescription: string;
  jobTitle: string;
  company: string;
}

export function CoverLetter({ jobDescription, jobTitle, company }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CoverLetterResult | null>(null);
  const [editedText, setEditedText] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const hasJobInfo = !!(jobDescription || jobTitle);

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await sendMessage<unknown, CoverLetterResult>(
        MessageType.GENERATE_COVER_LETTER,
        { jobDescription, jobTitle, company }
      );
      if (res.success && res.data) {
        setResult(res.data);
        setEditedText(res.data.text);
      } else {
        setError(res.error || 'Failed to generate cover letter');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
    setLoading(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = editedText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const wordCount = editedText.trim() ? editedText.trim().split(/\s+/).length : 0;

  return (
    <div style={{ padding: 16 }}>
      <h3 style={{ fontSize: 14, marginBottom: 12 }}>Cover Letter</h3>

      {!hasJobInfo && (
        <div class="empty-state">
          <div style={{ fontSize: 12 }}>
            Navigate to a job application to generate a tailored cover letter.
          </div>
        </div>
      )}

      {hasJobInfo && !result && !loading && (
        <div>
          {jobTitle && (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
              Generate a cover letter for <strong>{jobTitle}</strong>
              {company && <> at <strong>{company}</strong></>}
            </div>
          )}
          <button
            class="btn-primary"
            style={{ width: '100%', padding: '10px 16px', fontSize: 13 }}
            onClick={handleGenerate}
          >
            Generate Cover Letter
          </button>
          {error && <div class="error-msg">{error}</div>}
        </div>
      )}

      {loading && (
        <div class="loading" style={{ justifyContent: 'center', flexDirection: 'column', gap: 8, padding: 24 }}>
          <div class="spinner" style={{ width: 24, height: 24 }} />
          <span style={{ fontSize: 12 }}>Writing your cover letter...</span>
        </div>
      )}

      {result && !loading && (
        <div>
          <textarea
            value={editedText}
            onInput={(e) => setEditedText((e.target as HTMLTextAreaElement).value)}
            style={{
              width: '100%',
              minHeight: 250,
              fontSize: 12,
              lineHeight: 1.6,
              marginBottom: 8,
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              {wordCount} words
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button class="btn-secondary" onClick={handleGenerate} style={{ fontSize: 11 }}>
                Regenerate
              </button>
              <button class="btn-primary" onClick={handleCopy} style={{ fontSize: 11 }}>
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </button>
            </div>
          </div>

          {error && <div class="error-msg">{error}</div>}
        </div>
      )}
    </div>
  );
}
