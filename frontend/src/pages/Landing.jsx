import { useEffect, useRef, useState } from 'react'
import handshake from '../assets/hero-handshake.jpg'
import './landing.css'

const DECAY_STATES = ['FULL ACCESS', 'RESTRICTED', 'READ-ONLY', 'LOCKED']

const DECAY_COPY = {
  'FULL ACCESS': 'Every permission granted. The agent is trusted and present.',
  RESTRICTED: 'No signal yet — write access starts narrowing automatically.',
  'READ-ONLY': 'Write access withdrawn. The agent may only observe.',
  LOCKED: 'Silence exceeds tolerance. Access is fully revoked.',
}

/* Lightweight scroll-reveal — no animation library, just IntersectionObserver. */
function Reveal({ children, className = '', as: Tag = 'div', delay = 0 }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          obs.disconnect()
        }
      },
      { threshold: 0.2 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <Tag
      ref={ref}
      className={`reveal ${visible ? 'is-visible' : ''} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  )
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
  return (
    <div className="hero-visual">
      <div className="hero-frame">
        <img
          src={handshake}
          alt="A human hand and a wireframe AI hand reaching toward each other"
          className="hero-img"
        />
        <svg className="hero-overlay" viewBox="0 0 400 480" fill="none" aria-hidden="true">
          <circle className="hv-orbit hv-orbit-1" cx="200" cy="240" r="150" />
          <circle className="hv-orbit hv-orbit-2" cx="200" cy="240" r="196" />
          <line className="hv-line" x1="200" y1="10" x2="200" y2="80" />
          <line className="hv-line hv-line-b" x1="390" y1="150" x2="330" y2="180" />
          <circle className="hv-node" cx="200" cy="8" r="4" />
          <circle className="hv-node hv-node-b" cx="394" cy="146" r="4" />
        </svg>
        <span className="hero-tag tag-a">trust · 001</span>
        <span className="hero-tag tag-b">access verified</span>
        <span className="hero-corner corner-tl" aria-hidden="true" />
        <span className="hero-corner corner-tr" aria-hidden="true" />
        <span className="hero-corner corner-bl" aria-hidden="true" />
        <span className="hero-corner corner-br" aria-hidden="true" />
      </div>
    </div>
  )
}

function Hero({ onNavigate }) {
  return (
    <section className="hero">
      <Reveal as="div" className="hero-copy">
        <span className="eyebrow">Authorization that expires by design</span>
        <h1>AI shouldn't hold the keys forever.</h1>
        <p>TRACE gives AI agents permissions that evolve with time, presence and trust.</p>
        <div className="hero-ctas">
          <button className="btn-primary" onClick={() => onNavigate('signup')}>Trace the Flow</button>
          <a className="btn-ghost-lg" href="#how-it-works">Peek Inside</a>
        </div>
      </Reveal>
      <Reveal as="div" className="hero-visual-wrap" delay={150}>
        <HeroVisual />
      </Reveal>
    </section>
  )
}

function UnderTheHood() {
  const steps = [
    { title: 'Heartbeat', body: 'The agent checks in on a set interval, proving it\u2019s still active.' },
    { title: 'Decay', body: 'Miss a beat and scope narrows on its own — no one has to notice.' },
    { title: 'Authorization', body: 'Every action is checked against whatever access is live right now.' },
    { title: 'Attestation', body: 'Each decision is signed, timestamped, and added to the record.' },
  ]
  return (
    <section id="how-it-works" className="how">
      <Reveal as="div" className="section-head">
        <span className="eyebrow">Under the Hood</span>
        <h2>TRACE's permission lifecycle, briefly.</h2>
      </Reveal>
      <div className="how-steps">
        {steps.map((s, i) => (
          <Reveal as="div" className="how-step" key={s.title} delay={i * 90}>
            <span className="how-index">{String(i + 1).padStart(2, '0')}</span>
            <h3>{s.title}</h3>
            <p>{s.body}</p>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

function PermissionDecay() {
  const [hovered, setHovered] = useState(null)
  return (
    <section className="decay">
      <Reveal as="div" className="section-head">
        <span className="eyebrow">Permission decay</span>
        <h2>Access doesn't just get revoked. It fades.</h2>
      </Reveal>

      <Reveal as="div" className="decay-timeline">
        {DECAY_STATES.map((s, i) => (
          <div
            key={s}
            className={`decay-stage stage-${i} ${hovered === s ? 'is-hovered' : ''}`}
            onMouseEnter={() => setHovered(s)}
            onMouseLeave={() => setHovered(null)}
          >
            <span className="decay-stage-dot" />
            <span className="decay-stage-name">{s}</span>
            <p className="decay-stage-copy">{DECAY_COPY[s]}</p>
            {i < DECAY_STATES.length - 1 && <span className="decay-arrow" aria-hidden="true">→</span>}
          </div>
        ))}
      </Reveal>
    </section>
  )
}

function Heartbeat() {
  const [index, setIndex] = useState(0) // 0 = FULL ACCESS
  const [pulsing, setPulsing] = useState(false)
  const timer = useRef(null)

  useEffect(() => {
    timer.current = setInterval(() => {
      setIndex((i) => Math.min(i + 1, DECAY_STATES.length - 1))
    }, 2600)
    return () => clearInterval(timer.current)
  }, [])

  function sendHeartbeat() {
    setPulsing(true)
    setIndex(0)
    clearInterval(timer.current)
    timer.current = setInterval(() => {
      setIndex((i) => Math.min(i + 1, DECAY_STATES.length - 1))
    }, 2600)
    setTimeout(() => setPulsing(false), 700)
  }

  const current = DECAY_STATES[index]

  return (
    <section className="heartbeat">
      <Reveal as="div" className="section-head">
        <span className="eyebrow">See the Magic</span>
        <h2>Presence restores authorization, instantly.</h2>
      </Reveal>

      <Reveal as="div" className="heartbeat-panel">
        <div className={`heartbeat-pulse ${pulsing ? 'is-pulsing' : ''}`}>
          <span className="pulse-ring" />
          <span className="pulse-core" />
        </div>

        <div className="heartbeat-readout">
          <span className="heartbeat-state">{current}</span>
          <p>{DECAY_COPY[current]}</p>
          <button className="btn-primary-sm" onClick={sendHeartbeat}>
            Send Heartbeat
          </button>
        </div>
      </Reveal>
    </section>
  )
}

function ActionCheck() {
  return (
    <section className="action-check">
      <Reveal as="div" className="section-head">
        <span className="eyebrow">Find Your Match</span>
        <h2>Every action is checked against live authorization.</h2>
      </Reveal>

      <div className="action-grid">
        <Reveal as="div" className="action-card is-allowed">
          <span className="action-badge ok">Allowed</span>
          <h3>Read transaction history</h3>
          <p>Matches current scope — the agent has standing read access.</p>
        </Reveal>
        <Reveal as="div" className="action-card is-denied" delay={120}>
          <span className="action-badge no">Denied</span>
          <h3>Withdraw funds</h3>
          <p>Requires Full Access. Current authorization is Restricted.</p>
        </Reveal>
      </div>
    </section>
  )
}

function Attestation() {
  return (
    <section id="attestation" className="attest">
      <Reveal as="div" className="section-head">
        <span className="eyebrow">Attestation</span>
        <h2>Every decision, signed and verifiable.</h2>
      </Reveal>

      <Reveal as="div" className="attest-card">
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
      </Reveal>
    </section>
  )
}

function FinalCTA({ onNavigate }) {
  return (
    <section className="final-cta">
      <Reveal as="div">
        <h2>Don't give AI permanent power.<br />Give it permission to expire.</h2>
        <button className="btn-primary" onClick={() => onNavigate('signup')}>Follow the Trail</button>
      </Reveal>
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
      <UnderTheHood />
      <PermissionDecay />
      <Heartbeat />
      <ActionCheck />
      <Attestation />
      <FinalCTA onNavigate={onNavigate} />
      <Footer />
    </div>
  )
}
