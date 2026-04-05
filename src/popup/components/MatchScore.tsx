import { useState } from 'preact/hooks';
import { sendMessage } from '../../shared/messaging';
import { MessageType } from '../../shared/constants';
import type { MatchScoreResult } from '../../shared/types';

interface Props {
  jobDescription: string;
  jobTitle: string;
  company: string;
}

export function MatchScore({ jobDescription, jobTitle, company }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MatchScoreResult | null>(null);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);

  const handleCheck = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await sendMessage<unknown, MatchScoreResult>(
        MessageType.GET_MATCH_SCORE,
        { jobDescription, jobTitle, company }
      );
      if (res.success && res.data) {
        setResult(res.data);
      } else {
        setError(res.error || 'Failed to get match score');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
    setLoading(false);
  };

  if (!result && !loading) {
    return (
      <div>
        <button
          class="btn-secondary"
          style={{ width: '100%', fontSize: 12 }}
          onClick={handleCheck}
        >
          Check Match Score
        </button>
        {error && <div class="error-msg">{error}</div>}
      </div>
    );
  }

  if (loading) {
    return (
      <div class="loading" style={{ justifyContent: 'center' }}>
        <div class="spinner" />
        <span>Analyzing match...</span>
      </div>
    );
  }

  if (!result) return null;

  const scoreColor = result.overallScore >= 70 ? 'var(--success)' :
                     result.overallScore >= 40 ? 'var(--warning)' : 'var(--danger)';

  return (
    <div class="card" style={{ background: 'var(--bg-secondary)' }}>
      {/* Score header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Score circle */}
        <div style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          border: `3px solid ${scoreColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          fontWeight: 700,
          color: scoreColor,
          flexShrink: 0,
        }}>
          {result.overallScore}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600 }}>Match Score</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
            {result.summary}
          </div>
        </div>
        <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
          {expanded ? '\u25B2' : '\u25BC'}
        </span>
      </div>

      {/* Expanded breakdown */}
      {expanded && (
        <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
          {/* Breakdown bars */}
          {[
            { label: 'Skills', score: result.breakdown.skills.score },
            { label: 'Experience', score: result.breakdown.experience.score },
            { label: 'Education', score: result.breakdown.education.score },
          ].map((item) => (
            <div key={item.label} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                <span>{item.label}</span>
                <span style={{ fontWeight: 600 }}>{item.score}%</span>
              </div>
              <div style={{ height: 4, background: 'var(--border)', borderRadius: 2 }}>
                <div style={{
                  height: '100%',
                  width: `${item.score}%`,
                  background: item.score >= 70 ? 'var(--success)' : item.score >= 40 ? 'var(--warning)' : 'var(--danger)',
                  borderRadius: 2,
                }} />
              </div>
            </div>
          ))}

          {/* Skills detail */}
          {result.breakdown.skills.matched.length > 0 && (
            <div style={{ fontSize: 11, marginBottom: 6 }}>
              <span style={{ fontWeight: 600 }}>Matched skills: </span>
              <span style={{ color: 'var(--success)' }}>{result.breakdown.skills.matched.join(', ')}</span>
            </div>
          )}
          {result.breakdown.skills.missing.length > 0 && (
            <div style={{ fontSize: 11, marginBottom: 6 }}>
              <span style={{ fontWeight: 600 }}>Missing skills: </span>
              <span style={{ color: 'var(--danger)' }}>{result.breakdown.skills.missing.join(', ')}</span>
            </div>
          )}

          {/* Experience & education notes */}
          {result.breakdown.experience.notes && (
            <div style={{ fontSize: 11, marginBottom: 4, color: 'var(--text-secondary)' }}>
              <strong>Experience:</strong> {result.breakdown.experience.notes}
            </div>
          )}
          {result.breakdown.education.notes && (
            <div style={{ fontSize: 11, marginBottom: 8, color: 'var(--text-secondary)' }}>
              <strong>Education:</strong> {result.breakdown.education.notes}
            </div>
          )}

          {/* Tips */}
          {result.tips.length > 0 && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Tips</div>
              {result.tips.map((tip, i) => (
                <div key={i} style={{ fontSize: 11, color: 'var(--text-secondary)', padding: '2px 0', paddingLeft: 8 }}>
                  &bull; {tip}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
