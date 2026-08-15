import { useEffect, useRef, useState } from 'react'
import './landing.css'

const STATES = ['HEARTBEAT', 'FULL ACCESS', 'RESTRICTED', 'READ-ONLY', 'LOCKED']

const STATE_COPY = {
  HEARTBEAT: 'Agent checks in. Trust is reaffirmed.',
  'FULL ACCESS': 'Every permission granted, fully alive.',
  RESTRICTED: 'No signal yet — scope starts narrowing.',
  'READ-ONLY': 'Write access withdrawn. Observation only.',
  LOCKED: 'Silence exceeds tolerance. Access revoked.',
}

function Logo() {
  return (
    <div className="t-logo">
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
        <circle cx="13" cy="13" r="11" stroke="#C6E385" strokeWidth="1.6" opacity="0.5" />
        <circle cx="13" cy="13" r="4.5" fill="#C6E385" />
      </svg>
      <span>TRACE</span>
    </div>
  )
}

function Navbar({ onNavigate }) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`t-nav ${scrolled ? 'is-scrolled' : ''}`}>
      <Logo />
      <nav className="t-nav-links">
        <a href="#how-it-works">How It Works</a>
        <a href="#attestation">Verification</a>
      </nav>
      <div className="t-nav-actions">
        <button className="btn-ghost" onClick={() => onNavigate('login')}>Login</button>
        <button className="btn-primary-sm" onClick={() => onNavigate('signup')}>Get Started</button>
      </div>
    </header>
  )
}

function HeroVisual() {
  const [pulse, setPulse] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setPulse((p) => p + 1), 2600)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="hero-visual" aria-hidden="true">
      <div className="hero-rings">
        <span className="ring ring-3" />
        <span className="ring ring-2" />
        <span className="ring ring-1" />
        <div className="hero-core">
          <span className="core-dot" key={pulse} />
        </div>
      </div>
      <div className="hero-node node-a">
        <span className="node-dot" /> agent-07
      </div>
      <div className="hero-node node-b">
        <span className="node-dot" /> write · db
      </div>
      <div className="hero-node node-c">
        <span className="node-dot ok" /> verified
      </div>
    </div>
  )
}

function Hero({ onNavigate }) {
  return (
    <section className="hero">
      <div className="hero-copy">
        <span className="eyebrow">Authorization that ages like trust should</span>
        <h1>
          Permissions that <span className="accent-text">decay</span> unless
          your agents prove they're still alive.
        </h1>
        <p>
          TRACE governs AI-agent access with a living heartbeat. No check-in,
          no full access — scope narrows automatically, every step attested
          and verifiable.
        </p>
        <div className="hero-ctas">
          <button className="btn-primary" onClick={() => onNavigate('signup')}>Get Started</button>
          <a className="btn-ghost-lg" href="#how-it-works">See how it works</a>
        </div>
      </div>
      <HeroVisual />
    </section>
  )
}

function Problem() {
  return (
    <section className="problem">
      <div className="section-head">
        <span className="eyebrow">The problem</span>
        <h2>Static permissions don't know an agent went quiet.</h2>
      </div>
      <div className="problem-grid">
        <div className="problem-card">
          <span className="problem-mark">01</span>
          <h3>Access outlives trust</h3>
          <p>Once granted, most AI-agent permissions never expire — even after the agent stops behaving as expected.</p>
        </div>
        <div className="problem-card">
          <span className="problem-mark">02</span>
          <h3>No proof of life</h3>
          <p>Systems assume an agent is still trustworthy simply because no one revoked it manually.</p>
        </div>
        <div className="problem-card">
          <span className="problem-mark">03</span>
          <h3>Audits come too late</h3>
          <p>Without continuous attestation, over-permissioned agents are only discovered after something breaks.</p>
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    { title: 'Heartbeat', body: 'Agents check in on a defined interval, proving they\u2019re active and behaving.' },
    { title: 'Permission Decay', body: 'Miss a beat and scope narrows automatically — no manual intervention required.' },
    { title: 'Authorization', body: 'Every action is checked against the agent\u2019s current, live authorization level.' },
    { title: 'Attestation', body: 'Each decision is signed and logged, building a verifiable record over time.' },
  ]
  return (
    <section id="how-it-works" className="how">
      <div className="section-head">
        <span className="eyebrow">How TRACE works</span>
        <h2>Four steps. One continuous loop.</h2>
      </div>
      <div className="how-steps">
        {steps.map((s, i) => (
          <div className="how-step" key={s.title}>
            <span className="how-index">{String(i + 1).padStart(2, '0')}</span>
            <h3>{s.title}</h3>
            <p>{s.body}</p>
            {i < steps.length - 1 && <span className="how-connector" aria-hidden="true" />}
          </div>
        ))}
      </div>
    </section>
  )
}

function PermissionDecay() {
  const [index, setIndex] = useState(1) // start at FULL ACCESS
  const [auto, setAuto] = useState(true)
  const timer = useRef(null)

  useEffect(() => {
    if (!auto) return
    timer.current = setInterval(() => {
      setIndex((i) => (i + 1) % STATES.length)
    }, 2200)
    return () => clearInterval(timer.current)
  }, [auto])

  const current = STATES[index]

  function sendHeartbeat() {
    setAuto(false)
    clearInterval(timer.current)
    setIndex(1) // restore FULL ACCESS
  }

  return (
    <section className="decay">
      <div className="section-head">
        <span className="eyebrow">Permission decay</span>
        <h2>Watch access fade — and recover — in real time.</h2>
      </div>

      <div className="decay-panel">
        <div className="decay-track">
          {STATES.filter((s) => s !== 'HEARTBEAT').map((s) => (
            <div
              key={s}
              className={`decay-node ${current === s ? 'is-active' : ''} state-${s.replace(/[^A-Z]/g, '')}`}
            >
              <span className="decay-dot" />
              <span className="decay-name">{s}</span>
            </div>
          ))}
        </div>

        <div className="decay-readout">
          <span className="decay-state-label">{current}</span>
          <p>{STATE_COPY[current]}</p>
          <button className="btn-primary-sm" onClick={sendHeartbeat}>
            Send Heartbeat
          </button>
        </div>
      </div>
    </section>
  )
}

function Attestation() {
  return (
    <section id="attestation" className="attest">
      <div className="section-head">
        <span className="eyebrow">Attestation</span>
        <h2>Every decision, signed and verifiable.</h2>
      </div>

      <div className="attest-card">
        <div className="attest-row">
          <span className="attest-label">Agent</span>
          <span className="attest-value">agent-07 · billing-sync</span>
        </div>
        <div className="attest-row">
          <span className="attest-label">Action</span>
          <span className="attest-value">write → invoices.write</span>
        </div>
        <div className="attest-row">
          <span className="attest-label">Permission</span>
          <span className="attest-value pill">RESTRICTED</span>
        </div>
        <div className="attest-row">
          <span className="attest-label">Timestamp</span>
          <span className="attest-value mono">2026-08-15T09:42:11Z</span>
        </div>
        <div className="attest-footer">
          <span className="verified-badge">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7l3.2 3.2L12 3.4" stroke="#1F0E06" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Verified
          </span>
          <span className="attest-hash">sig:0x4a9f…e21c</span>
        </div>
      </div>
    </section>
  )
}

function Benefits() {
  const items = [
    { title: 'Least privilege', body: 'Agents hold only what they need, and only for as long as they prove they need it.' },
    { title: 'Automatic decay', body: 'No cron jobs, no manual reviews — scope narrows itself on a missed heartbeat.' },
    { title: 'Verifiable history', body: 'Every state change is attested, so audits take minutes, not weeks.' },
    { title: 'Reduced risk', body: 'A compromised or stalled agent loses access before it can cause damage.' },
  ]
  return (
    <section className="benefits">
      <div className="section-head">
        <span className="eyebrow">Why teams choose TRACE</span>
        <h2>Built for agents you can trust — and prove you should.</h2>
      </div>
      <div className="benefits-grid">
        {items.map((b) => (
          <div className="benefit-card" key={b.title}>
            <h3>{b.title}</h3>
            <p>{b.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function FinalCTA({ onNavigate }) {
  return (
    <section className="final-cta">
      <h2>Give your agents access worth trusting.</h2>
      <p>Start attesting every permission in minutes.</p>
      <button className="btn-primary" onClick={() => onNavigate('signup')}>Get Started</button>
    </section>
  )
}

function Footer() {
  return (
    <footer className="t-footer">
      <Logo />
      <span className="footer-copy">© {new Date().getFullYear()} TRACE. Authorization that stays honest.</span>
    </footer>
  )
}

export default function Landing({ onNavigate }) {
  return (
    <div className="landing">
      <Navbar onNavigate={onNavigate} />
      <Hero onNavigate={onNavigate} />
      <Problem />
      <HowItWorks />
      <PermissionDecay />
      <Attestation />
      <Benefits />
      <FinalCTA onNavigate={onNavigate} />
      <Footer />
    </div>
  )
}
