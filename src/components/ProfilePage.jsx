import { useState } from 'react';
import { updateUserRole } from '../services/firebase';

const ROLE_OPTIONS = [
  'IT Professional',
  'Working Professional',
  'Digital Marketer',
  'Designer',
  'Business Owner',
  'Student',
  'Freelancer',
  'Other',
];

export default function ProfilePage({ userEmail, userRole, uid, onRoleUpdate, onBack }) {
  const [role, setRole] = useState(ROLE_OPTIONS.includes(userRole) ? userRole : (userRole ? 'Other' : ''));
  const [customRole, setCustomRole] = useState(ROLE_OPTIONS.includes(userRole) ? '' : userRole);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    const finalRole = role === 'Other' ? customRole : role;
    await updateUserRole(uid, finalRole);
    onRoleUpdate(finalRole);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="profile-page">
      <button className="back-btn" onClick={onBack}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Back
      </button>
      <div className="profile-card">
        <h2 className="profile-title">Profile</h2>

        <div className="profile-field">
          <label>Email</label>
          <p className="profile-value">{userEmail}</p>
        </div>

        <div className="profile-field">
          <label htmlFor="profile-role">Your Role / Industry</label>
          <select
            id="profile-role"
            value={role}
            onChange={e => { setRole(e.target.value); setSaved(false); }}
            className="auth-select"
          >
            <option value="">Select your role</option>
            {ROLE_OPTIONS.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          {role === 'Other' && (
            <input
              type="text"
              placeholder="Enter your role"
              value={customRole}
              onChange={e => { setCustomRole(e.target.value); setSaved(false); }}
              className="auth-custom-role"
            />
          )}
        </div>

        <button className="profile-save-btn" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
