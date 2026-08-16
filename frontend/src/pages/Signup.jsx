import { useMemo, useState } from 'react'
import { AuthLayout, Field, PasswordField, Checkbox } from './AuthLayout.jsx'

const STRENGTH_LABELS = ['Too weak', 'Weak', 'Okay', 'Strong', 'Excellent']

function scorePassword(pw) {
  if (!pw) return 0
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/\d/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  return Math.min(score, 4)
}

export default function Signup({ onSwitch }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [agreed, setAgreed] = useState(false)

  const strength = useMemo(() => scorePassword(password), [password])
  const mismatch = confirm.length > 0 && confirm !== password

  function handleSubmit(e) {
    e.preventDefault()
    if (mismatch || !agreed) return
    // TODO: wire up to auth API
    console.log('signup', { name, email, password })
    // Temporary: skip straight to the dashboard so the flow is testable
    // before the real auth check exists. Replace with onSwitch('dashboard')
    // only after a successful API response.
    onSwitch('dashboard')
  }

  return (
    <AuthLayout
      eyebrow="Get started"
      title="Create your account"
      subtitle="Join TRACE and start tracking in minutes."
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <Field
          label="Full name"
          id="signup-name"
          type="text"
          placeholder="Ada Lovelace"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <Field
          label="Email"
          id="signup-email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <PasswordField
          label="Password"
          id="signup-password"
          placeholder="Create a password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {password.length > 0 && (
          <div className="strength" aria-live="polite">
            <div className="strength-bars">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={`strength-bar ${i < strength ? `is-filled level-${strength}` : ''}`}
                />
              ))}
            </div>
            <span className="strength-label">{STRENGTH_LABELS[strength]}</span>
          </div>
        )}

        <PasswordField
          label="Confirm password"
          id="signup-confirm"
          placeholder="Re-enter your password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        {mismatch && <span className="field-error">Passwords don't match</span>}

        <Checkbox id="signup-terms" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}>
          I agree to the <a href="#terms">Terms of Service</a> and <a href="#privacy">Privacy Policy</a>
        </Checkbox>

        <button type="submit" className="btn-primary" disabled={!agreed || mismatch}>
          Create Account
        </button>
      </form>

      <p className="auth-switch">
        Already have an account?{' '}
        <button type="button" className="link-accent" onClick={() => onSwitch('login')}>
          Log in
        </button>
      </p>
    </AuthLayout>
  )
}