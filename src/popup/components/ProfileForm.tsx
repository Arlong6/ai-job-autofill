import { useState, useEffect } from 'preact/hooks';
import { sendMessage } from '../../shared/messaging';
import { MessageType } from '../../shared/constants';
import type { UserProfile, Education, WorkExperience } from '../../shared/types';

const emptyEducation: Education = { school: '', degree: '', field: '', graduationYear: '', gpa: '' };
const emptyExperience: WorkExperience = { company: '', title: '', startDate: '', endDate: '', description: '', current: false };

const defaultProfile: UserProfile = {
  firstName: '', lastName: '', email: '', phone: '', location: '',
  linkedinUrl: '', portfolioUrl: '', currentTitle: '', yearsExperience: '',
  summary: '', skills: [], education: [{ ...emptyEducation }],
  experience: [{ ...emptyExperience }], customAnswers: [], resumeText: '',
  country: '', workAuthorization: '', needSponsorship: '', expectedSalary: '',
  startDate: '', noticePeriod: '', preferredWorkArrangement: '', howDidYouHear: '', pronouns: '',
  gender: '', transgender: '', sexualOrientation: '', hispanicOrLatinx: '', ethnicity: '', veteranStatus: '', disabilityStatus: '',
};

export function ProfileForm() {
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [skillsInput, setSkillsInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<Record<string, boolean>>({
    personal: true, professional: false, applicationDetails: false, education: false, experience: false, skills: false, resume: false,
  });

  useEffect(() => {
    sendMessage<void, UserProfile>(MessageType.GET_PROFILE).then((res) => {
      if (res.success && res.data) {
        setProfile(res.data);
        setSkillsInput(res.data.skills.join(', '));
      }
      setLoading(false);
    });
  }, []);

  const toggle = (section: string) => {
    setSections((s) => ({ ...s, [section]: !s[section] }));
  };

  const update = <K extends keyof UserProfile>(key: K, value: UserProfile[K]) => {
    setProfile((p) => ({ ...p, [key]: value }));
    setSaved(false);
  };

  const updateEducation = (index: number, field: keyof Education, value: string) => {
    const edu = [...profile.education];
    edu[index] = { ...edu[index], [field]: value };
    update('education', edu);
  };

  const addEducation = () => update('education', [...profile.education, { ...emptyEducation }]);
  const removeEducation = (i: number) => update('education', profile.education.filter((_, idx) => idx !== i));

  const updateExperience = (index: number, field: keyof WorkExperience, value: string | boolean) => {
    const exp = [...profile.experience];
    exp[index] = { ...exp[index], [field]: value };
    update('experience', exp);
  };

  const addExperience = () => update('experience', [...profile.experience, { ...emptyExperience }]);
  const removeExperience = (i: number) => update('experience', profile.experience.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    setSaving(true);
    const updatedProfile = { ...profile, skills: skillsInput.split(',').map((s) => s.trim()).filter(Boolean) };
    setProfile(updatedProfile);
    const res = await sendMessage(MessageType.SET_PROFILE, updatedProfile);
    setSaving(false);
    if (res.success) {
      setSaved(true);
    }
  };

  if (loading) {
    return (
      <div class="loading" style={{ justifyContent: 'center', padding: 24 }}>
        <div class="spinner" />
        <span>Loading profile...</span>
      </div>
    );
  }

  const sectionStyle = { marginBottom: 2 };
  const headerStyle = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '8px 12px', background: 'var(--bg-secondary)', cursor: 'pointer',
    fontSize: 12, fontWeight: 600, borderBottom: '1px solid var(--border)',
  };
  const bodyStyle = { padding: '10px 12px' };
  const fieldStyle = { marginBottom: 8 };
  const labelStyle: Record<string, string | number> = { fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 3, color: 'var(--text-secondary)' };

  return (
    <div style={{ paddingBottom: 60 }}>
      {/* Personal Info */}
      <div style={sectionStyle}>
        <div style={headerStyle} onClick={() => toggle('personal')}>
          <span>Personal Info</span>
          <span style={{ fontSize: 10 }}>{sections.personal ? '\u25B2' : '\u25BC'}</span>
        </div>
        {sections.personal && (
          <div style={bodyStyle}>
            <div style={{ display: 'flex', gap: 8, ...fieldStyle }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>First Name</label>
                <input type="text" value={profile.firstName} onInput={(e) => update('firstName', (e.target as HTMLInputElement).value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Last Name</label>
                <input type="text" value={profile.lastName} onInput={(e) => update('lastName', (e.target as HTMLInputElement).value)} />
              </div>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Email</label>
              <input type="email" value={profile.email} onInput={(e) => update('email', (e.target as HTMLInputElement).value)} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Phone</label>
              <input type="tel" value={profile.phone} onInput={(e) => update('phone', (e.target as HTMLInputElement).value)} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Location</label>
              <input type="text" value={profile.location} onInput={(e) => update('location', (e.target as HTMLInputElement).value)} placeholder="City, State" />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>LinkedIn URL</label>
              <input type="url" value={profile.linkedinUrl} onInput={(e) => update('linkedinUrl', (e.target as HTMLInputElement).value)} placeholder="https://linkedin.com/in/..." />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Portfolio / Website</label>
              <input type="url" value={profile.portfolioUrl} onInput={(e) => update('portfolioUrl', (e.target as HTMLInputElement).value)} placeholder="https://..." />
            </div>
          </div>
        )}
      </div>

      {/* Professional */}
      <div style={sectionStyle}>
        <div style={headerStyle} onClick={() => toggle('professional')}>
          <span>Professional</span>
          <span style={{ fontSize: 10 }}>{sections.professional ? '\u25B2' : '\u25BC'}</span>
        </div>
        {sections.professional && (
          <div style={bodyStyle}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Current Title</label>
              <input type="text" value={profile.currentTitle} onInput={(e) => update('currentTitle', (e.target as HTMLInputElement).value)} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Years of Experience</label>
              <input type="text" value={profile.yearsExperience} onInput={(e) => update('yearsExperience', (e.target as HTMLInputElement).value)} placeholder="e.g. 5" />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Professional Summary</label>
              <textarea
                value={profile.summary}
                onInput={(e) => update('summary', (e.target as HTMLTextAreaElement).value)}
                style={{ minHeight: 60 }}
                placeholder="Brief summary of your background and goals..."
              />
            </div>
          </div>
        )}
      </div>

      {/* Application Details */}
      <div style={sectionStyle}>
        <div style={headerStyle} onClick={() => toggle('applicationDetails')}>
          <span>Application Details</span>
          <span style={{ fontSize: 10 }}>{sections.applicationDetails ? '\u25B2' : '\u25BC'}</span>
        </div>
        {sections.applicationDetails && (
          <div style={bodyStyle}>
            <div style={{ display: 'flex', gap: 8, ...fieldStyle }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Country</label>
                <input type="text" value={profile.country} onInput={(e) => update('country', (e.target as HTMLInputElement).value)} placeholder="e.g. United States" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Pronouns</label>
                <select value={profile.pronouns || ''} onChange={(e) => update('pronouns', (e.target as HTMLSelectElement).value)}>
                  <option value="">--</option>
                  <option value="he/him/his">he/him/his</option>
                  <option value="she/her/hers">she/her/hers</option>
                  <option value="they/them/theirs">they/them/theirs</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, ...fieldStyle }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Work Authorization</label>
                <select value={profile.workAuthorization} onChange={(e) => update('workAuthorization', (e.target as HTMLSelectElement).value)}>
                  <option value="">--</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Need Visa Sponsorship</label>
                <select value={profile.needSponsorship} onChange={(e) => update('needSponsorship', (e.target as HTMLSelectElement).value)}>
                  <option value="">--</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, ...fieldStyle }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Expected Salary</label>
                <input type="text" value={profile.expectedSalary} onInput={(e) => update('expectedSalary', (e.target as HTMLInputElement).value)} placeholder="e.g. $120,000" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Earliest Start Date</label>
                <input type="text" value={profile.startDate} onInput={(e) => update('startDate', (e.target as HTMLInputElement).value)} placeholder="e.g. Immediately" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, ...fieldStyle }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Notice Period</label>
                <select value={profile.noticePeriod || ''} onChange={(e) => update('noticePeriod', (e.target as HTMLSelectElement).value)}>
                  <option value="">--</option>
                  <option value="Immediately">Immediately</option>
                  <option value="1 week">1 week</option>
                  <option value="2 weeks">2 weeks</option>
                  <option value="1 month">1 month</option>
                  <option value="2 months">2 months</option>
                  <option value="3 months">3 months</option>
                  <option value="More than 3 months">More than 3 months</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Work Arrangement</label>
                <select value={profile.preferredWorkArrangement || ''} onChange={(e) => update('preferredWorkArrangement', (e.target as HTMLSelectElement).value)}>
                  <option value="">--</option>
                  <option value="Remote">Remote</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="On-site">On-site</option>
                  <option value="No preference">No preference</option>
                </select>
              </div>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>How Did You Hear About Us (default answer)</label>
              <select value={profile.howDidYouHear || ''} onChange={(e) => update('howDidYouHear', (e.target as HTMLSelectElement).value)}>
                <option value="">--</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="Indeed">Indeed</option>
                <option value="Glassdoor">Glassdoor</option>
                <option value="Company Website">Company Website</option>
                <option value="Referral">Referral</option>
                <option value="Job Board">Job Board</option>
                <option value="Google">Google</option>
                <option value="Career Fair">Career Fair</option>
                <option value="Social Media">Social Media</option>
                <option value="University">University</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', margin: '12px 0 6px', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
              EEO / Demographics (Voluntary)
            </div>
            <div style={{ display: 'flex', gap: 8, ...fieldStyle }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Gender</label>
                <select value={profile.gender || ''} onChange={(e) => update('gender', (e.target as HTMLSelectElement).value)}>
                  <option value="">--</option>
                  <option value="Male">Male</option>
                  <option value="Man">Man</option>
                  <option value="Female">Female</option>
                  <option value="Woman">Woman</option>
                  <option value="Non-binary">Non-binary</option>
                  <option value="I don't wish to answer">I don't wish to answer</option>
                  <option value="Decline to Self Identify">Decline to Self Identify</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Transgender</label>
                <select value={profile.transgender || ''} onChange={(e) => update('transgender', (e.target as HTMLSelectElement).value)}>
                  <option value="">--</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                  <option value="I don't wish to answer">I don't wish to answer</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, ...fieldStyle }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Sexual Orientation</label>
                <select value={profile.sexualOrientation || ''} onChange={(e) => update('sexualOrientation', (e.target as HTMLSelectElement).value)}>
                  <option value="">--</option>
                  <option value="Heterosexual">Heterosexual</option>
                  <option value="Gay">Gay</option>
                  <option value="Lesbian">Lesbian</option>
                  <option value="Bisexual and/or pansexual">Bisexual and/or pansexual</option>
                  <option value="Asexual">Asexual</option>
                  <option value="Queer">Queer</option>
                  <option value="I don't wish to answer">I don't wish to answer</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Hispanic or Latinx</label>
                <select value={profile.hispanicOrLatinx || ''} onChange={(e) => update('hispanicOrLatinx', (e.target as HTMLSelectElement).value)}>
                  <option value="">--</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                  <option value="I don't wish to answer">I don't wish to answer</option>
                </select>
              </div>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Ethnicity / Race</label>
              <select value={profile.ethnicity || ''} onChange={(e) => update('ethnicity', (e.target as HTMLSelectElement).value)}>
                <option value="">--</option>
                <option value="American Indian or Alaska Native">American Indian or Alaska Native</option>
                <option value="Asian">Asian</option>
                <option value="East Asian">East Asian</option>
                <option value="South Asian">South Asian</option>
                <option value="Southeast Asian">Southeast Asian</option>
                <option value="Black or African American">Black or African American</option>
                <option value="Black or of African descent">Black or of African descent</option>
                <option value="Hispanic or Latino">Hispanic or Latino</option>
                <option value="Hispanic, Latinx or of Spanish Origin">Hispanic, Latinx or of Spanish Origin</option>
                <option value="Middle Eastern or North African">Middle Eastern or North African</option>
                <option value="Native Hawaiian or Other Pacific Islander">Native Hawaiian or Other Pacific Islander</option>
                <option value="White">White</option>
                <option value="White or European">White or European</option>
                <option value="Two or More Races">Two or More Races</option>
                <option value="Decline to Self Identify">Decline to Self Identify</option>
                <option value="I don't wish to answer">I don't wish to answer</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, ...fieldStyle }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Veteran Status</label>
                <select value={profile.veteranStatus || ''} onChange={(e) => update('veteranStatus', (e.target as HTMLSelectElement).value)}>
                  <option value="">--</option>
                  <option value="I am not a protected veteran">I am not a protected veteran</option>
                  <option value="I identify as one or more of the classifications of a protected veteran">Protected veteran</option>
                  <option value="I am a veteran or active member">Veteran or active member</option>
                  <option value="I don't wish to answer">I don't wish to answer</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Disability Status</label>
                <select value={profile.disabilityStatus || ''} onChange={(e) => update('disabilityStatus', (e.target as HTMLSelectElement).value)}>
                  <option value="">--</option>
                  <option value="Yes, I have a disability, or have a history/record of having a disability">Yes, I have a disability</option>
                  <option value="No, I don't have a disability, or a history/record of having a disability">No disability</option>
                  <option value="I don't wish to answer">I don't wish to answer</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Education */}
      <div style={sectionStyle}>
        <div style={headerStyle} onClick={() => toggle('education')}>
          <span>Education ({profile.education.length})</span>
          <span style={{ fontSize: 10 }}>{sections.education ? '\u25B2' : '\u25BC'}</span>
        </div>
        {sections.education && (
          <div style={bodyStyle}>
            {profile.education.map((edu, i) => (
              <div key={i} class="card" style={{ marginBottom: 8, padding: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 600 }}>Education {i + 1}</span>
                  {profile.education.length > 1 && (
                    <button class="btn-danger" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => removeEducation(i)}>Remove</button>
                  )}
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>School</label>
                  <input type="text" value={edu.school} onInput={(e) => updateEducation(i, 'school', (e.target as HTMLInputElement).value)} />
                </div>
                <div style={{ display: 'flex', gap: 8, ...fieldStyle }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Degree</label>
                    <input type="text" value={edu.degree} onInput={(e) => updateEducation(i, 'degree', (e.target as HTMLInputElement).value)} placeholder="B.S." />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Field</label>
                    <input type="text" value={edu.field} onInput={(e) => updateEducation(i, 'field', (e.target as HTMLInputElement).value)} placeholder="Computer Science" />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, ...fieldStyle }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Graduation Year</label>
                    <input type="text" value={edu.graduationYear} onInput={(e) => updateEducation(i, 'graduationYear', (e.target as HTMLInputElement).value)} placeholder="2024" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>GPA</label>
                    <input type="text" value={edu.gpa} onInput={(e) => updateEducation(i, 'gpa', (e.target as HTMLInputElement).value)} placeholder="3.8" />
                  </div>
                </div>
              </div>
            ))}
            <button class="btn-secondary" onClick={addEducation} style={{ fontSize: 11, width: '100%' }}>
              + Add Education
            </button>
          </div>
        )}
      </div>

      {/* Experience */}
      <div style={sectionStyle}>
        <div style={headerStyle} onClick={() => toggle('experience')}>
          <span>Experience ({profile.experience.length})</span>
          <span style={{ fontSize: 10 }}>{sections.experience ? '\u25B2' : '\u25BC'}</span>
        </div>
        {sections.experience && (
          <div style={bodyStyle}>
            {profile.experience.map((exp, i) => (
              <div key={i} class="card" style={{ marginBottom: 8, padding: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 600 }}>Experience {i + 1}</span>
                  {profile.experience.length > 1 && (
                    <button class="btn-danger" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => removeExperience(i)}>Remove</button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, ...fieldStyle }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Company</label>
                    <input type="text" value={exp.company} onInput={(e) => updateExperience(i, 'company', (e.target as HTMLInputElement).value)} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Title</label>
                    <input type="text" value={exp.title} onInput={(e) => updateExperience(i, 'title', (e.target as HTMLInputElement).value)} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, ...fieldStyle }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Start Date</label>
                    <input type="text" value={exp.startDate} onInput={(e) => updateExperience(i, 'startDate', (e.target as HTMLInputElement).value)} placeholder="Jan 2022" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>End Date</label>
                    <input
                      type="text"
                      value={exp.current ? 'Present' : exp.endDate}
                      disabled={exp.current}
                      onInput={(e) => updateExperience(i, 'endDate', (e.target as HTMLInputElement).value)}
                      placeholder="Present"
                    />
                  </div>
                </div>
                <div style={{ marginBottom: 6 }}>
                  <label style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={exp.current}
                      onChange={(e) => updateExperience(i, 'current', (e.target as HTMLInputElement).checked)}
                    />
                    <span style={{ color: 'var(--text-secondary)' }}>Current role</span>
                  </label>
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Description</label>
                  <textarea
                    value={exp.description}
                    onInput={(e) => updateExperience(i, 'description', (e.target as HTMLTextAreaElement).value)}
                    style={{ minHeight: 50 }}
                    placeholder="Key responsibilities and achievements..."
                  />
                </div>
              </div>
            ))}
            <button class="btn-secondary" onClick={addExperience} style={{ fontSize: 11, width: '100%' }}>
              + Add Experience
            </button>
          </div>
        )}
      </div>

      {/* Skills */}
      <div style={sectionStyle}>
        <div style={headerStyle} onClick={() => toggle('skills')}>
          <span>Skills ({profile.skills.length})</span>
          <span style={{ fontSize: 10 }}>{sections.skills ? '\u25B2' : '\u25BC'}</span>
        </div>
        {sections.skills && (
          <div style={bodyStyle}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Skills (comma-separated)</label>
              <textarea
                value={skillsInput}
                onInput={(e) => { setSkillsInput((e.target as HTMLTextAreaElement).value); setSaved(false); }}
                style={{ minHeight: 50 }}
                placeholder="JavaScript, React, Python, SQL, ..."
              />
            </div>
            {skillsInput && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {skillsInput.split(',').map((s) => s.trim()).filter(Boolean).map((skill, i) => (
                  <span key={i} style={{
                    fontSize: 10, padding: '2px 8px', background: 'var(--primary-light)',
                    color: 'var(--primary)', borderRadius: 12, border: '1px solid var(--primary)',
                  }}>
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Resume */}
      <div style={sectionStyle}>
        <div style={headerStyle} onClick={() => toggle('resume')}>
          <span>Resume Text</span>
          <span style={{ fontSize: 10 }}>{sections.resume ? '\u25B2' : '\u25BC'}</span>
        </div>
        {sections.resume && (
          <div style={bodyStyle}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Paste your resume text here</label>
              <textarea
                value={profile.resumeText}
                onInput={(e) => update('resumeText', (e.target as HTMLTextAreaElement).value)}
                style={{ minHeight: 120 }}
                placeholder="Paste your full resume text here for AI-powered matching and cover letter generation..."
              />
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
              {profile.resumeText.length > 0 ? `${profile.resumeText.length} characters` : 'No resume text'}
            </div>
          </div>
        )}
      </div>

      {/* Save button - fixed at bottom */}
      <div style={{
        position: 'sticky',
        bottom: 0,
        padding: '10px 12px',
        background: 'var(--bg)',
        borderTop: '1px solid var(--border)',
      }}>
        <button
          class="btn-primary"
          style={{ width: '100%', padding: '10px 16px', fontSize: 13, fontWeight: 600 }}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Profile'}
        </button>
      </div>
    </div>
  );
}
