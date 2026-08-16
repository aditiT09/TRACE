import React, { useEffect, useState } from 'react'

const RANK_LABELS = {
  FULL: 'FULL COMMAND',
  RESTRICTED: 'RESTRICTED',
  READ_ONLY: 'READ ONLY',
  LOCKED: 'LOCKED',
}

function getRankIndex(r) {
  if (!r) return -1
  const norm = r.toUpperCase().replace(/\s+/g, '_')
  if (norm === 'FULL_COMMAND' || norm === 'FULL') return 3
  if (norm === 'RESTRICTED') return 2
  if (norm === 'READ_ONLY' || norm === 'READ_ONLY_') return 1
  if (norm === 'LOCKED') return 0
  return -1
}

const getRequiredPermissionLabel = (action) => {
  if (action === 'APPROVE_INVOICE') return 'FULL — 3/3'
  if (action === 'SCHEDULE_MEETING') return 'RESTRICTED — 2/3'
  if (action === 'SEND_MESSAGE') return 'RESTRICTED — 2/3'
  return 'FULL — 3/3'
}

export default function DecisionTrace({ traceData, currentPermission, onRevoke, revokePending }) {
  const [revealedSteps, setRevealedSteps] = useState(0)
  const [showTechnical, setShowTechnical] = useState(false)

  useEffect(() => {
    if (!traceData) {
      setRevealedSteps(0)
      return
    }

    setRevealedSteps(0)
    let current = 0
    const interval = setInterval(() => {
      current += 1
      setRevealedSteps(current)
      if (current >= 6) {
        clearInterval(interval)
      }
    }, 220)

    return () => clearInterval(interval)
  }, [traceData])

  // EMPTY STATE: No request evaluated yet
  if (!traceData || !traceData.request) {
    return (
      <div className="trace-panel-body is-empty" style={{ textAlign: 'center', padding: '30px 20px' }}>
        <p style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--color-cream)', marginBottom: '8px' }}>
          No action is being evaluated.
        </p>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-cream-dim)', maxWidth: '280px', margin: '0 auto', lineHeight: '1.4' }}>
          Ask your AI to do something above to see how TRACE makes its decision.
        </p>
      </div>
    )
  }

  // ERROR STATE
  if (traceData.error || traceData.status === 'TRACE_UNAVAILABLE' || traceData.status === 'LLM_UNAVAILABLE') {
    return (
      <div className="trace-panel-body is-error" style={{ padding: '20px' }}>
        <span className="trace-error-badge" style={{ color: 'var(--color-danger)', fontWeight: 'bold' }}>⚠ DECISION TRACE UNAVAILABLE</span>
        <p className="trace-error-desc" style={{ fontSize: '0.82rem', color: 'var(--color-cream-dim)', marginTop: '8px' }}>
          {traceData.reason || 'TRACE could not complete the authorization check.'}
        </p>
      </div>
    )
  }

  const currentPermissionIndex = getRankIndex(currentPermission || traceData.permission)
  const currentPermissionLabel = RANK_LABELS[currentPermission || traceData.permission] || 'LOCKED'
  const requiredPermissionLabel = getRequiredPermissionLabel(traceData.action)
  const isAllowed = traceData.decision === 'ALLOWED'
  const attestationHash = traceData.attestationHash || traceData.attestation?.transactionHash

  const isUnknown = traceData.action === 'UNKNOWN_ACTION' || traceData.status === 'UNKNOWN_ACTION'

  if (isUnknown) {
    return (
      <div className="trace-panel-body" style={{ padding: '20px' }}>
        <div className="user-friendly-decision" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          <div>
            <span style={{ fontSize: '0.65rem', letterSpacing: '0.08em', color: 'rgba(245,241,232,0.4)', textTransform: 'uppercase', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>MIRA COULDN'T IDENTIFY THIS ACTION</span>
            <p style={{ fontSize: '0.95rem', color: 'var(--color-cream)', fontStyle: 'italic', margin: 0 }}>
              &ldquo;{traceData.request}&rdquo;
            </p>
          </div>

          <div>
            <span style={{ fontSize: '0.65rem', letterSpacing: '0.08em', color: 'rgba(245,241,232,0.4)', textTransform: 'uppercase', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>TRACE SAFETY RULE</span>
            <strong style={{ color: 'var(--color-cream)', fontSize: '0.85rem' }}>Unrecognized actions are blocked by default.</strong>
          </div>

          <div>
            <span style={{ fontSize: '0.65rem', letterSpacing: '0.08em', color: 'rgba(245,241,232,0.4)', textTransform: 'uppercase', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>TRACE DECISION</span>
            <span style={{ color: 'var(--color-danger)', fontSize: '1rem', fontWeight: 'bold' }}>🔴 BLOCKED</span>
          </div>

          <div style={{ borderBottom: '1px solid rgba(245,241,232,0.06)', paddingBottom: '16px' }}>
            <span style={{ fontSize: '0.65rem', letterSpacing: '0.08em', color: 'rgba(245,241,232,0.4)', textTransform: 'uppercase', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>BLOCKCHAIN PROOF</span>
            <span style={{ fontSize: '0.82rem', color: 'var(--color-cream-dim)' }}>
              No blockchain attestation created.
            </span>
          </div>

          <div>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-accent)', fontWeight: 'bold', margin: 0 }}>
              Why? TRACE never grants authority to an action it cannot verify.
            </p>
          </div>

          <div>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowTechnical(!showTechnical)}
              style={{ width: '100%', fontSize: '0.72rem', padding: '6px', border: '1px solid rgba(245,241,232,0.1)', background: 'rgba(0,0,0,0.1)', color: 'var(--color-cream)', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold' }}
            >
              {showTechnical ? '▲ HIDE TECHNICAL DETAILS' : '▼ VIEW TECHNICAL DETAILS'}
            </button>
          </div>

        </div>

        {showTechnical && (
          <div className="decision-timeline anim-fade-in" style={{ marginTop: '20px', borderTop: '1px solid rgba(245,241,232,0.06)', paddingTop: '20px' }}>
            {/* Step 1: User Request */}
            <div className={`timeline-step step-1 ${revealedSteps >= 1 ? 'is-revealed' : ''}`}>
              <div className="step-node" />
              <div className="step-content">
                <span className="step-label">User Request</span>
                <p className="step-val quote-text">&ldquo;{traceData.request}&rdquo;</p>
              </div>
            </div>

            {/* Step 2: Mira Interpretation */}
            <div className={`timeline-step step-2 ${revealedSteps >= 2 ? 'is-revealed' : ''}`}>
              <div className="step-line" />
              <div className="step-node" />
              <div className="step-content">
                <span className="step-label">Mira Interpretation (Intent Classifier)</span>
                <div className="step-val-row">
                  <span className="action-tag">UNKNOWN_ACTION</span>
                </div>
                <span className="step-subtext">Mira could not map this to a recognized action template.</span>
              </div>
            </div>

            {/* Step 3: Current Authority */}
            <div className={`timeline-step step-3 ${revealedSteps >= 3 ? 'is-revealed' : ''}`}>
              <div className="step-line" />
              <div className="step-node" />
              <div className="step-content">
                <span className="step-label">Current Authority</span>
                <p className="step-val highlight-authority">{currentPermissionLabel} — {currentPermissionIndex}/3</p>
                <span className="step-subtext">Dynamic permission rank checked on-chain via smart contract.</span>
              </div>
            </div>

            {/* Step 4: TRACE Policy */}
            <div className={`timeline-step step-4 ${revealedSteps >= 4 ? 'is-revealed' : ''}`}>
              <div className="step-line" />
              <div className="step-node" />
              <div className="step-content">
                <span className="step-label">TRACE Smart Contract Policy Check</span>
                <p className="step-val policy-rule">UNKNOWN_ACTION &rarr; BLOCKED</p>
                <span className="step-subtext">Safety policy requires explicit action identification to allow.</span>
              </div>
            </div>

            {/* Step 5: Decision */}
            <div className={`timeline-step step-5 ${revealedSteps >= 5 ? 'is-revealed' : ''}`}>
              <div className="step-line" />
              <div className="step-node" />
              <div className="step-content">
                <span className="step-label">Authorization Decision</span>
                <div className="step-val decision-banner is-blocked">
                  <span className="decision-indicator" />
                  BLOCKED
                </div>
              </div>
            </div>

            {/* Step 6: Blockchain Attestation */}
            <div className={`timeline-step step-6 ${revealedSteps >= 6 ? 'is-revealed' : ''}`}>
              <div className="step-line" />
              <div className="step-node is-none" />
              <div className="step-content">
                <span className="step-label">Blockchain Attestation</span>
                <span className="badge-no-attestation">✕ NO ATTESTATION CREATED</span>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="trace-panel-body" style={{ padding: '20px' }}>
      <div className="user-friendly-decision" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        
        <div>
          <span style={{ fontSize: '0.65rem', letterSpacing: '0.08em', color: 'rgba(245,241,232,0.4)', textTransform: 'uppercase', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>YOUR REQUEST</span>
          <p style={{ fontSize: '0.95rem', color: 'var(--color-cream)', fontStyle: 'italic', margin: 0 }}>
            &ldquo;{traceData.request}&rdquo;
          </p>
        </div>

        <div>
          <span style={{ fontSize: '0.65rem', letterSpacing: '0.08em', color: 'rgba(245,241,232,0.4)', textTransform: 'uppercase', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>MIRA UNDERSTANDS</span>
          <span style={{ display: 'inline-block', fontSize: '0.78rem', background: 'rgba(245,241,232,0.06)', padding: '4px 8px', borderRadius: '3px', fontFamily: 'monospace', color: 'var(--color-accent)', fontWeight: 'bold' }}>
            {traceData.action || 'UNKNOWN_ACTION'}
          </span>
        </div>

        <div>
          <span style={{ fontSize: '0.65rem', letterSpacing: '0.08em', color: 'rgba(245,241,232,0.4)', textTransform: 'uppercase', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>TRACE CHECKS AUTHORITY</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.82rem' }}>
            <div>
              <span style={{ color: 'var(--color-cream-dim)' }}>Current:</span>{' '}
              <strong style={{ color: 'var(--color-cream)' }}>{currentPermissionLabel} — {currentPermissionIndex}/3</strong>
            </div>
            <div>
              <span style={{ color: 'var(--color-cream-dim)' }}>Required:</span>{' '}
              <strong style={{ color: 'var(--color-cream)' }}>{requiredPermissionLabel}</strong>
            </div>
          </div>
        </div>

        <div>
          <span style={{ fontSize: '0.65rem', letterSpacing: '0.08em', color: 'rgba(245,241,232,0.4)', textTransform: 'uppercase', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>TRACE DECISION</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', fontWeight: 'bold' }}>
            {isAllowed ? (
              <span style={{ color: 'var(--color-accent)' }}>🟢 ALLOWED</span>
            ) : (
              <span style={{ color: 'var(--color-danger)' }}>🔴 NOT ALLOWED</span>
            )}
          </div>
          {!isAllowed && (
            <p style={{ fontSize: '0.82rem', color: 'var(--color-cream-dim)', margin: '4px 0 0 0', lineHeight: '1.3' }}>
              {traceData.reason || `${traceData.action || 'This action'} requires ${requiredPermissionLabel.split(' — ')[0]} authority.`}
            </p>
          )}
        </div>

        <div style={{ borderBottom: '1px solid rgba(245,241,232,0.06)', paddingBottom: '16px' }}>
          <span style={{ fontSize: '0.65rem', letterSpacing: '0.08em', color: 'rgba(245,241,232,0.4)', textTransform: 'uppercase', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>BLOCKCHAIN PROOF</span>
          {isAllowed && attestationHash ? (
            <div style={{ fontSize: '0.82rem' }}>
              <span style={{ color: 'var(--color-accent)', fontWeight: 'bold' }}>✓ ATTESTATION CREATED</span>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: 'var(--color-cream-dim)' }}>
                Tx: <code style={{ fontFamily: 'monospace', color: 'var(--color-cream)' }}>{attestationHash.slice(0, 20)}...</code>
              </p>
            </div>
          ) : (
            <span style={{ fontSize: '0.82rem', color: 'var(--color-cream-dim)' }}>
              No attestation created because the action was blocked.
            </span>
          )}
        </div>

        <div>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowTechnical(!showTechnical)}
            style={{ width: '100%', fontSize: '0.72rem', padding: '6px', border: '1px solid rgba(245,241,232,0.1)', background: 'rgba(0,0,0,0.1)', color: 'var(--color-cream)', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold' }}
          >
            {showTechnical ? '▲ HIDE TECHNICAL DETAILS' : '▼ VIEW TECHNICAL DETAILS'}
          </button>
        </div>

      </div>

      {showTechnical && (
        <div className="decision-timeline anim-fade-in" style={{ marginTop: '20px', borderTop: '1px solid rgba(245,241,232,0.06)', paddingTop: '20px' }}>
          {/* Step 1: User Request */}
          <div className={`timeline-step step-1 ${revealedSteps >= 1 ? 'is-revealed' : ''}`}>
            <div className="step-node" />
            <div className="step-content">
              <span className="step-label">User Request</span>
              <p className="step-val quote-text">&ldquo;{traceData.request}&rdquo;</p>
            </div>
          </div>

          {/* Step 2: Mira Interpretation */}
          <div className={`timeline-step step-2 ${revealedSteps >= 2 ? 'is-revealed' : ''}`}>
            <div className="step-line" />
            <div className="step-node" />
            <div className="step-content">
              <span className="step-label">Mira Interpretation (Intent Classifier)</span>
              <div className="step-val-row">
                <span className="action-tag">{traceData.action || 'UNKNOWN_ACTION'}</span>
              </div>
              <span className="step-subtext">Mira interprets intent. Holds zero execution authority.</span>
            </div>
          </div>

          {/* Step 3: Current Authority */}
          <div className={`timeline-step step-3 ${revealedSteps >= 3 ? 'is-revealed' : ''}`}>
            <div className="step-line" />
            <div className="step-node" />
            <div className="step-content">
              <span className="step-label">Current Authority</span>
              <p className="step-val highlight-authority">{currentPermissionLabel} — {currentPermissionIndex}/3</p>
              <span className="step-subtext">Dynamic permission rank checked on-chain via smart contract.</span>
            </div>
          </div>

          {/* Step 4: TRACE Policy */}
          <div className={`timeline-step step-4 ${revealedSteps >= 4 ? 'is-revealed' : ''}`}>
            <div className="step-line" />
            <div className="step-node" />
            <div className="step-content">
              <span className="step-label">TRACE Smart Contract Policy Check</span>
              <p className="step-val policy-rule">
                {traceData.action || 'UNKNOWN_ACTION'} &rarr; {isAllowed ? 'ALLOWED' : 'BLOCKED'}
              </p>
              <span className="step-subtext">{traceData.reason || 'TRACE independently checks policy.'}</span>
            </div>
          </div>

          {/* Step 5: Decision */}
          <div className={`timeline-step step-5 ${revealedSteps >= 5 ? 'is-revealed' : ''}`}>
            <div className="step-line" />
            <div className="step-node" />
            <div className="step-content">
              <span className="step-label">Authorization Decision</span>
              <div className={`step-val decision-banner ${isAllowed ? 'is-allowed' : 'is-blocked'}`}>
                <span className="decision-indicator" />
                {isAllowed ? 'ALLOWED' : 'BLOCKED'}
              </div>
            </div>
          </div>

          {/* Step 6: Blockchain Attestation */}
          <div className={`timeline-step step-6 ${revealedSteps >= 6 ? 'is-revealed' : ''}`}>
            <div className="step-line" />
            <div className={`step-node ${isAllowed ? 'is-verified' : 'is-none'}`} />
            <div className="step-content">
              <span className="step-label">Blockchain Attestation</span>
              {isAllowed && attestationHash ? (
                <div className="attestation-success">
                  <span className="badge-verified">✓ VERIFIED ON-CHAIN</span>
                  <p className="tx-hash-link">
                    Tx: <code className="tx-code" title={attestationHash}>
                      {attestationHash.slice(0, 16)}&hellip;
                    </code>
                  </p>
                </div>
              ) : (
                <span className="badge-no-attestation">✕ NO ATTESTATION CREATED</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
