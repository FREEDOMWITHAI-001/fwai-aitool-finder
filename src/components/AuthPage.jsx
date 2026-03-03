import { useState } from 'react';
import { signUp, logIn } from '../services/firebase';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('');
  const [customRole, setCustomRole] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await logIn(email, password);
      } else {
        const finalRole = role === 'Other' ? customRole : role;
        await signUp(email, password, finalRole);
      }
      // Auth state listener in App.jsx handles the rest
    } catch (err) {
      const code = err.code || '';
      if (code === 'auth/email-already-in-use') {
        setError('This email is already registered. Try logging in.');
      } else if (code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Incorrect email or password.');
      } else if (code === 'auth/user-not-found') {
        setError('No account found with this email. Try signing up.');
      } else if (code === 'auth/too-many-requests') {
        setError('Too many attempts. Please try again later.');
      } else {
        setError(err.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-brand">
          <h1 className="auth-logo">AI RADAR</h1>
          <p className="auth-tagline">by Freedom with AI</p>
        </div>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${isLogin ? 'active' : ''}`}
            onClick={() => { setIsLogin(true); setError(''); }}
          >
            Log In
          </button>
          <button
            className={`auth-tab ${!isLogin ? 'active' : ''}`}
            onClick={() => { setIsLogin(false); setError(''); }}
          >
            Sign Up
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={loading}
              autoComplete="email"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={loading}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
            />
          </div>

          {!isLogin && (
            <div className="auth-field">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                disabled={loading}
                autoComplete="new-password"
              />
            </div>
          )}

          {!isLogin && (
            <div className="auth-field">
              <label htmlFor="role">What best describes you?</label>
              <select
                id="role"
                value={role}
                onChange={e => setRole(e.target.value)}
                disabled={loading}
                className="auth-select"
              >
                <option value="">Select your role (optional)</option>
                {ROLE_OPTIONS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              {role === 'Other' && (
                <input
                  type="text"
                  placeholder="Enter your role"
                  value={customRole}
                  onChange={e => setCustomRole(e.target.value)}
                  disabled={loading}
                  className="auth-custom-role"
                />
              )}
            </div>
          )}

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? (
              <span className="btn-loading">
                <span className="spinner" />
                {isLogin ? 'Logging in...' : 'Creating account...'}
              </span>
            ) : (
              isLogin ? 'Log In' : 'Create Account'
            )}
          </button>
        </form>

        {isLogin && (
          <p className="auth-footer">
            Don't have an account?{' '}
            <button className="auth-link" onClick={() => { setIsLogin(false); setError(''); }}>
              Sign up for free
            </button>
          </p>
        )}
        {!isLogin && (
          <p className="auth-footer">
            Already have an account?{' '}
            <button className="auth-link" onClick={() => { setIsLogin(true); setError(''); }}>
              Log in
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
