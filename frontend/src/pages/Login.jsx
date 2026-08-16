import { useState } from 'react'
import { AuthLayout, Field, PasswordField } from './AuthLayout.jsx'

export default function Login({ onSwitch }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    // TODO: wire up to auth API
    console.log('login', { email, password })
    // Temporary: skip straight to the dashboard so the flow is testable
    // before the real auth check exists. Replace with onSwitch('dashboard')
    // only after a successful API response.
    onSwitch('dashboard')
  }

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Log in to TRACE"
      subtitle="Pick up right where you left off."
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <Field
          label="Email"
          id="login-email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <PasswordField
          label="Password"
          id="login-password"
          placeholder="Enter your password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="auth-row">
          <button type="button" className="link-muted">
            Forgot password?
          </button>
        </div>

        <button type="submit" className="btn-primary">
          Log In
        </button>
      </form>

      <p className="auth-switch">
        New to TRACE?{' '}
        <button type="button" className="link-accent" onClick={() => onSwitch('signup')}>
          Create an account
        </button>
      </p>
    </AuthLayout>
  )
}