import { useState, useEffect } from 'preact/hooks';
import { sendMessage } from '../../shared/messaging';
import { MessageType } from '../../shared/constants';
import type { TrackedApplication } from '../../shared/types';

const STATUS_COLORS: Record<TrackedApplication['status'], string> = {
  applied: '#3b82f6',
  interviewing: '#eab308',
  offer: '#22c55e',
  rejected: '#ef4444',
  ghosted: '#6b7280',
};

const STATUS_LABELS: Record<TrackedApplication['status'], string> = {
  applied: 'Applied',
  interviewing: 'Interviewing',
  offer: 'Offer',
  rejected: 'Rejected',
  ghosted: 'Ghosted',
};

const ALL_STATUSES: TrackedApplication['status'][] = [
  'applied', 'interviewing', 'offer', 'rejected', 'ghosted',
];

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function ApplicationTracker() {
  const [apps, setApps] = useState<TrackedApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedNotes, setExpandedNotes] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    loadApps();
  }, []);

  const loadApps = async () => {
    const res = await sendMessage<void, TrackedApplication[]>(MessageType.GET_APPLICATIONS);
    if (res.success && res.data) {
      setApps(res.data.sort((a, b) => b.appliedAt - a.appliedAt));
    }
    setLoading(false);
  };

  const updateStatus = async (id: string, status: TrackedApplication['status']) => {
    const res = await sendMessage<Partial<TrackedApplication> & { id: string }, TrackedApplication>(
      MessageType.UPDATE_APPLICATION,
      { id, status }
    );
    if (res.success) {
      setApps((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status } : a))
      );
    }
  };

  const updateNotes = async (id: string, notes: string) => {
    const res = await sendMessage(MessageType.UPDATE_APPLICATION, { id, notes });
    if (res.success) {
      setApps((prev) =>
        prev.map((a) => (a.id === id ? { ...a, notes } : a))
      );
    }
  };

  const deleteApp = async (id: string) => {
    const res = await sendMessage(MessageType.DELETE_APPLICATION, id);
    if (res.success) {
      setApps((prev) => prev.filter((a) => a.id !== id));
      setConfirmDelete(null);
    }
  };

  if (loading) {
    return (
      <div class="loading" style={{ justifyContent: 'center', padding: 24 }}>
        <div class="spinner" />
        <span>Loading...</span>
      </div>
    );
  }

  const totalApplied = apps.length;
  const interviewing = apps.filter((a) => a.status === 'interviewing').length;
  const offers = apps.filter((a) => a.status === 'offer').length;

  return (
    <div style={{ padding: 16 }}>
      {/* Stats bar */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginBottom: 12,
      }}>
        <div class="card" style={{ flex: 1, textAlign: 'center', padding: '8px 4px' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary)' }}>{totalApplied}</div>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Applied</div>
        </div>
        <div class="card" style={{ flex: 1, textAlign: 'center', padding: '8px 4px' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#eab308' }}>{interviewing}</div>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Interviewing</div>
        </div>
        <div class="card" style={{ flex: 1, textAlign: 'center', padding: '8px 4px' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--success)' }}>{offers}</div>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Offers</div>
        </div>
      </div>

      {/* Empty state */}
      {apps.length === 0 && (
        <div class="empty-state">
          <div style={{ fontSize: 24, marginBottom: 8 }}>&#128203;</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>No Applications Tracked</div>
          <div style={{ fontSize: 12 }}>
            Applications are automatically tracked when you use autofill on a job posting.
          </div>
        </div>
      )}

      {/* Application list */}
      {apps.map((app) => (
        <div key={app.id} class="card" style={{ marginBottom: 8, padding: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 1 }}>
                {app.company}
              </div>
              <div style={{
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 4,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {app.jobTitle}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
                {formatDate(app.appliedAt)}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              {/* Status dropdown */}
              <select
                value={app.status}
                onChange={(e) => updateStatus(app.id, (e.target as HTMLSelectElement).value as TrackedApplication['status'])}
                style={{
                  fontSize: 10,
                  padding: '3px 4px',
                  borderRadius: 4,
                  border: '1px solid var(--border)',
                  background: STATUS_COLORS[app.status],
                  color: '#fff',
                  fontWeight: 600,
                  cursor: 'pointer',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  paddingRight: 14,
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8'%3E%3Cpath fill='white' d='M0 2l4 4 4-4z'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 4px center',
                }}
              >
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>

              {/* Delete button */}
              {confirmDelete === app.id ? (
                <div style={{ display: 'flex', gap: 2 }}>
                  <button
                    class="btn-danger"
                    style={{ fontSize: 9, padding: '2px 6px' }}
                    onClick={() => deleteApp(app.id)}
                  >
                    Yes
                  </button>
                  <button
                    class="btn-secondary"
                    style={{ fontSize: 9, padding: '2px 6px' }}
                    onClick={() => setConfirmDelete(null)}
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  class="btn-icon"
                  style={{ fontSize: 12, padding: '2px 4px', color: 'var(--text-secondary)' }}
                  onClick={() => setConfirmDelete(app.id)}
                  title="Delete"
                >
                  &#x2715;
                </button>
              )}
            </div>
          </div>

          {/* Notes section */}
          <div style={{ marginTop: 6 }}>
            {expandedNotes === app.id ? (
              <div>
                <textarea
                  value={app.notes}
                  onInput={(e) => {
                    const val = (e.target as HTMLTextAreaElement).value;
                    setApps((prev) =>
                      prev.map((a) => (a.id === app.id ? { ...a, notes: val } : a))
                    );
                  }}
                  onBlur={() => {
                    const current = apps.find((a) => a.id === app.id);
                    if (current) updateNotes(app.id, current.notes);
                    setExpandedNotes(null);
                  }}
                  placeholder="Add notes..."
                  style={{
                    width: '100%',
                    fontSize: 11,
                    padding: 6,
                    borderRadius: 4,
                    border: '1px solid var(--border)',
                    minHeight: 50,
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                  autoFocus
                />
              </div>
            ) : (
              <button
                style={{
                  fontSize: 10,
                  color: app.notes ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                onClick={() => setExpandedNotes(app.id)}
              >
                {app.notes || '+ Add notes'}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
