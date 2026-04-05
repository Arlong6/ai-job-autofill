import { useState, useEffect } from 'preact/hooks';
import { sendMessage } from '../shared/messaging';
import { MessageType } from '../shared/constants';
import type { FieldMap } from '../shared/types';
import { AutofillPanel } from './components/AutofillPanel';
import { CoverLetter } from './components/CoverLetter';
import { ApplicationTracker } from './components/ApplicationTracker';
import { ProfileForm } from './components/ProfileForm';
import { Settings } from './components/Settings';

type Tab = 'autofill' | 'cover-letter' | 'tracker' | 'profile' | 'settings';

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [fieldMap, setFieldMap] = useState<FieldMap | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sendMessage<void, FieldMap>(MessageType.GET_FIELD_MAP).then((res) => {
      if (res.success && res.data) {
        setFieldMap(res.data);
        setActiveTab('autofill');
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'autofill', label: 'Autofill' },
    { key: 'cover-letter', label: 'Cover Letter' },
    { key: 'tracker', label: 'Tracker' },
    { key: 'profile', label: 'Profile' },
    { key: 'settings', label: 'Settings' },
  ];

  return (
    <div style={{ width: 380, minHeight: 400, display: 'flex', flexDirection: 'column' }}>
      {/* Tab navigation */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-secondary)',
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1,
              padding: '10px 4px',
              fontSize: 11,
              fontWeight: activeTab === tab.key ? 600 : 400,
              background: 'transparent',
              color: activeTab === tab.key ? 'var(--primary)' : 'var(--text-secondary)',
              borderBottom: activeTab === tab.key ? '2px solid var(--primary)' : '2px solid transparent',
              borderRadius: 0,
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {loading ? (
          <div class="loading" style={{ justifyContent: 'center', padding: 24 }}>
            <div class="spinner" />
            <span>Loading...</span>
          </div>
        ) : (
          <>
            {activeTab === 'autofill' && <AutofillPanel fieldMap={fieldMap} />}
            {activeTab === 'cover-letter' && (
              <CoverLetter
                jobDescription={fieldMap?.jobDescription || ''}
                jobTitle={fieldMap?.jobTitle || ''}
                company={fieldMap?.company || ''}
              />
            )}
            {activeTab === 'tracker' && <ApplicationTracker />}
            {activeTab === 'profile' && <ProfileForm />}
            {activeTab === 'settings' && <Settings />}
          </>
        )}
      </div>
    </div>
  );
}
