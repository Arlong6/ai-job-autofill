import { useState } from 'preact/hooks';
import { sendMessage } from '../../shared/messaging';
import { MessageType } from '../../shared/constants';
import type { FieldMap, FillResult } from '../../shared/types';
import { MatchScore } from './MatchScore';

interface Props {
  fieldMap: FieldMap | null;
}

export function AutofillPanel({ fieldMap }: Props) {
  const [filling, setFilling] = useState(false);
  const [result, setResult] = useState<FillResult | null>(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [scanning, setScanning] = useState(false);

  if (!fieldMap) {
    return (
      <div style={{ padding: 16 }}>
        <div class="empty-state">
          <div style={{ fontSize: 24, marginBottom: 8 }}>&#128270;</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>No Application Detected</div>
          <div style={{ fontSize: 12 }}>
            Navigate to a job application on Greenhouse or Lever to start auto-filling.
          </div>
          <button
            class="btn-secondary"
            style={{ marginTop: 12 }}
            disabled={scanning}
            onClick={async () => {
              setScanning(true);
              setError('');
              setSuccessMsg('');
              const res = await sendMessage<void, FieldMap>(MessageType.SCAN_PAGE);
              if (res.success) {
                setSuccessMsg('Page scanned. Please close and reopen the popup to see results.');
              } else {
                setError(res.error || 'Could not scan page');
              }
              setScanning(false);
            }}
          >
            {scanning ? 'Scanning...' : 'Scan Current Page'}
          </button>
          {error && <div class="error-msg">{error}</div>}
          {successMsg && <div style={{ fontSize: 11, color: 'var(--success)', marginTop: 8, textAlign: 'center' }}>{successMsg}</div>}
        </div>
      </div>
    );
  }

  const mappedCount = fieldMap.fields.filter((f) => f.profileKey).length;

  const handleFill = async () => {
    setFilling(true);
    setError('');
    setResult(null);
    try {
      const res = await sendMessage<void, FillResult>(MessageType.FILL_FIELDS);
      if (res.success && res.data) {
        setResult(res.data);
        // Application is automatically tracked by the background handler on successful fill
      } else {
        setError(res.error || 'Failed to fill fields');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
    setFilling(false);
  };

  return (
    <div style={{ padding: 16 }}>
      {/* Job info */}
      <div class="card" style={{ marginBottom: 12 }}>
        {fieldMap.company && (
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>
            {fieldMap.company}
          </div>
        )}
        {fieldMap.jobTitle && (
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
            {fieldMap.jobTitle}
          </div>
        )}
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          {fieldMap.fields.length} fields detected &middot; {mappedCount} auto-mappable
        </div>
      </div>

      {/* Match score */}
      {fieldMap.jobDescription && (
        <div style={{ marginBottom: 12 }}>
          <MatchScore
            jobDescription={fieldMap.jobDescription}
            jobTitle={fieldMap.jobTitle}
            company={fieldMap.company}
          />
        </div>
      )}

      {/* Fill button */}
      <button
        class="btn-primary"
        style={{ width: '100%', padding: '10px 16px', fontSize: 13, fontWeight: 600 }}
        onClick={handleFill}
        disabled={filling || mappedCount === 0}
      >
        {filling ? (
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span class="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
            Filling...
          </span>
        ) : (
          `Fill All Fields (${mappedCount})`
        )}
      </button>

      {error && <div class="error-msg">{error}</div>}

      {/* Results */}
      {result && (
        <div style={{ marginTop: 12 }}>
          <div class="card" style={{ background: 'var(--bg-secondary)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
              {result.filled}/{result.total} fields filled
              {result.skipped > 0 && `, ${result.skipped} skipped`}
              {result.failed > 0 && `, ${result.failed} failed`}
            </div>

            {/* Progress bar */}
            <div style={{
              height: 6,
              background: 'var(--border)',
              borderRadius: 3,
              overflow: 'hidden',
              marginBottom: 10,
            }}>
              <div style={{
                height: '100%',
                width: `${result.total > 0 ? (result.filled / result.total) * 100 : 0}%`,
                background: result.filled === result.total ? 'var(--success)' : 'var(--primary)',
                borderRadius: 3,
                transition: 'width 0.3s ease',
              }} />
            </div>

            {/* Details */}
            <div style={{ maxHeight: 150, overflow: 'auto' }}>
              {result.details.map((d, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 11,
                  padding: '3px 0',
                  color: d.status === 'filled' ? 'var(--success)' :
                         d.status === 'failed' ? 'var(--danger)' : 'var(--text-secondary)',
                }}>
                  <span>{d.status === 'filled' ? '\u2713' : d.status === 'failed' ? '\u2717' : '\u2014'}</span>
                  <span>{d.label}</span>
                  {d.reason && <span style={{ color: 'var(--text-secondary)', fontSize: 10 }}>({d.reason})</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
