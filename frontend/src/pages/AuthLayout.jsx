import { useState } from 'react'
import './auth.css'

/* Signature element: an animated trace-path — the wordmark's stroke draws
   itself in on load and pulses gently, literalizing "TRACE". */
function TraceMark() {
  return (
    <svg
      className="trace-mark"
      viewBox="0 0 220 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        className="trace-path"
        d="M8 96C28 44 50 18 78 18C106 18 110 70 138 70C160 70 168 34 190 34C202 34 208 50 212 60"
        stroke="#B3B060"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle className="trace-dot" cx="212" cy="60" r="4" fill="#B3B060" />
    </svg>
  )
}

export function AuthLayout({ eyebrow, title, subtitle, children }) {
  return (
    <div className="auth-shell">
      <aside className="auth-brand">
        <div className="auth-brand-inner">
          <div className="brand-wordmark">TRACE</div>
          <TraceMark />
          <p className="brand-tagline">
            Every step, verified. Follow your work from first commit to final proof.
          </p>
        </div>
        <div className="brand-glow" aria-hidden="true" />
      </aside>

      <main className="auth-main">
        <div className="auth-card">
          <div className="auth-card-head">
            {eyebrow && <span className="auth-eyebrow">{eyebrow}</span>}
            <h1 className="auth-title">{title}</h1>
            {subtitle && <p className="auth-subtitle">{subtitle}</p>}
          </div>
          {children}
        </div>
      </main>
    </div>
  )
}

export function Field({ label, id, ...props }) {
  return (
    <label className="field" htmlFor={id}>
      <span className="field-label">{label}</span>
      <input id={id} className="field-input" {...props} />
    </label>
  )
}

export function PasswordField({ label, id, value, onChange, autoComplete, placeholder }) {
  const [visible, setVisible] = useState(false)
  return (
    <label className="field" htmlFor={id}>
      <span className="field-label">{label}</span>
      <div className="field-password">
        <input
          id={id}
          className="field-input"
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required
        />
        <button
          type="button"
          className="field-toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M6.6 6.7C4.5 8.1 3 10 2 12c1.8 3.6 5.5 7 10 7 1.6 0 3.1-.4 4.4-1.1M12 5c4.5 0 8.2 3.4 10 7-.5 1-1.2 2-2 2.9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M2 12c1.8-3.6 5.5-7 10-7s8.2 3.4 10 7c-1.8 3.6-5.5 7-10 7s-8.2-3.4-10-7z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6"/>
            </svg>
          )}
        </button>
      </div>
    </label>
  )
}

export function Checkbox({ id, checked, onChange, children }) {
  return (
    <label className="checkbox" htmlFor={id}>
      <input id={id} type="checkbox" checked={checked} onChange={onChange} required />
      <span className="checkbox-box" aria-hidden="true">
        <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
          <path d="M1 5l3.5 3.5L11 1" stroke="#406B54" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
      <span className="checkbox-label">{children}</span>
    </label>
  )
}
