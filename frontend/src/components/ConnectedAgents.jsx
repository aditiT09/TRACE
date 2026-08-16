import React, { useState } from 'react'

export default function ConnectedAgents({ currentPermission, realAttestations }) {
  const [selectedAgentId, setSelectedAgentId] = useState('mira')
  const [customAgents, setCustomAgents] = useState([])
  const [showModal, setShowModal] = useState(false)
  
  // Modal form states
  const [newAgentName, setNewAgentName] = useState('')
  const [newAgentType, setNewAgentType] = useState('AI Agent')
  const [newAgentIntegration, setNewAgentIntegration] = useState('Demo Agent')
  const [newAgentPerms, setNewAgentPerms] = useState({
    read: true,
    message: true,
    finance: false,
    deploy: false
  })
  const [modalNotice, setModalNotice] = useState('')

  // Base predefined agents
  const initialAgents = [
    {
      id: 'mira',
      name: 'Mira AI',
      roleLabel: 'Reference Agent',
      isReal: true,
      status: 'ONLINE',
      lastAction: 'SCHEDULE_MEETING',
      allowedActions: ['Read Data', 'Send Messages', 'Schedule Meetings'],
      restrictedActions: ['Approve Invoices', 'Transfer Money', 'Deploy Production'],
      activity: [] // populated dynamically by realAttestations
    },
    {
      id: 'finance-ai',
      name: 'Finance AI',
      roleLabel: 'Demo Agent',
      isReal: false,
      status: 'DEMO AGENT',
      authorityLabel: 'RESTRICTED — 2/3',
      lastAction: 'APPROVE_INVOICE',
      allowedActions: ['Read invoices', 'Send reminders'],
      restrictedActions: ['Approve invoices', 'Transfer money'],
      activity: [
        { action: 'APPROVE_INVOICE', status: 'BLOCKED', timestamp: '15 Aug · 20:38' },
        { action: 'SEND_REMINDER', status: 'ALLOWED', timestamp: '15 Aug · 20:32' }
      ]
    },
    {
      id: 'coding-ai',
      name: 'Coding AI',
      roleLabel: 'Demo Agent',
      isReal: false,
      status: 'DEMO AGENT',
      authorityLabel: 'READ ONLY — 1/3',
      lastAction: 'DEPLOY_PRODUCTION',
      allowedActions: ['Read codebase', 'Create pull requests'],
      restrictedActions: ['Merge pull requests', 'Deploy production'],
      activity: [
        { action: 'CREATE_PULL_REQUEST', status: 'ALLOWED', timestamp: '15 Aug · 18:12' },
        { action: 'DEPLOY_PRODUCTION', status: 'BLOCKED', timestamp: '15 Aug · 18:10' }
      ]
    }
  ]

  const allAgents = [...initialAgents, ...customAgents]
  const activeAgent = allAgents.find(a => a.id === selectedAgentId) || allAgents[0]

  // Form submit handler
  const handleConnectAgent = (e) => {
    e.preventDefault()
    setModalNotice('')
    
    if (!newAgentName.trim()) {
      setModalNotice('Please provide an agent name.')
      return
    }

    if (newAgentIntegration !== 'Demo Agent') {
      setModalNotice('API/SDK integration coming soon. Use "Demo Agent" to create a local profile.')
      return
    }

    // Determine authority label based on checked boxes
    let authLabel = 'READ ONLY — 1/3'
    let allowedList = ['Read Data']
    let restrictedList = ['Schedule Meetings', 'Approve Invoices', 'Deploy Production']
    
    if (newAgentPerms.finance || newAgentPerms.deploy) {
      authLabel = 'RESTRICTED — 2/3'
      allowedList.push('Send Messages')
    } else if (newAgentPerms.message) {
      authLabel = 'RESTRICTED — 2/3'
      allowedList.push('Send Messages')
    }

    const createdAgent = {
      id: `custom-${Date.now()}`,
      name: newAgentName.trim(),
      roleLabel: 'Demo Agent (Local)',
      isReal: false,
      status: 'DEMO AGENT',
      authorityLabel: authLabel,
      lastAction: 'None',
      allowedActions: allowedList,
      restrictedActions: restrictedList,
      activity: []
    }

    setCustomAgents(prev => [...prev, createdAgent])
    setSelectedAgentId(createdAgent.id)
    setShowModal(false)
    
    // Clear form
    setNewAgentName('')
    setNewAgentPerms({
      read: true,
      message: true,
      finance: false,
      deploy: false
    })
  }

  // Helper to format Mira's dynamically governed smart-contract policy
  const getMiraPolicy = (rank) => {
    return [
      { action: 'Read Data', status: rank !== 'LOCKED' ? '✓' : '✕' },
      { action: 'Send Message', status: (rank === 'FULL' || rank === 'RESTRICTED') ? '✓' : '✕' },
      { action: 'Schedule Meeting', status: (rank === 'FULL' || rank === 'RESTRICTED') ? '✓' : '✕' },
      { action: 'Approve Invoice', status: rank === 'FULL' ? '✓' : '✕' },
      { action: 'Transfer Money', status: rank === 'FULL' ? '✓' : '✕' },
      { action: 'Deploy Production', status: '✕' }
    ]
  }

  // Predefined policy lists for static agents
  const getStaticPolicy = (agentId) => {
    if (agentId === 'finance-ai') {
      return [
        { action: 'Read Data', status: '✓' },
        { action: 'Send Message', status: '✓' },
        { action: 'Schedule Meeting', status: '✕' },
        { action: 'Approve Invoice', status: '✕' },
        { action: 'Transfer Money', status: '✕' },
        { action: 'Deploy Production', status: '✕' }
      ]
    }
    // Coding AI
    return [
      { action: 'Read Data', status: '✓' },
      { action: 'Send Message', status: '✕' },
      { action: 'Schedule Meeting', status: '✕' },
      { action: 'Approve Invoice', status: '✕' },
      { action: 'Transfer Money', status: '✕' },
      { action: 'Deploy Production', status: '✕' }
    ]
  }

  return (
    <section className="dash-panel connected-agents-section">
      <div className="section-header-row">
        <div>
          <h2 className="dash-panel-title">Connected AI Agents</h2>
          <p className="dash-flavor" style={{ marginTop: '-10px', marginBottom: '0' }}>
            Agents governed by TRACE authorization.
          </p>
        </div>
        <button 
          type="button" 
          className="btn-secondary add-agent-btn" 
          onClick={() => {
            setModalNotice('')
            setShowModal(true)
          }}
        >
          + Connect Agent
        </button>
      </div>

      {/* Grid of Agent Cards */}
      <div className="agents-cards-grid">
        {allAgents.map((agent) => {
          const isSelected = agent.id === selectedAgentId
          const activeRank = agent.isReal ? (currentPermission || 'LOCKED') : agent.authorityLabel
          const displayRank = agent.isReal 
            ? (activeRank === 'FULL' ? 'FULL COMMAND — 3/3' : activeRank === 'RESTRICTED' ? 'RESTRICTED — 2/3' : activeRank === 'READ_ONLY' ? 'READ ONLY — 1/3' : 'LOCKED — 0/3')
            : agent.authorityLabel

          return (
            <div 
              key={agent.id}
              className={`agent-profile-card ${isSelected ? 'is-selected' : ''} ${agent.isReal ? 'is-real' : 'is-demo'}`}
              onClick={() => setSelectedAgentId(agent.id)}
            >
              <div className="profile-card-header">
                <span className={`status-dot ${agent.status.toLowerCase().replace(' ', '-')}`} />
                <span className="profile-status-text">{agent.status}</span>
              </div>
              <h3 className="profile-card-name">{agent.name}</h3>
              <p className="profile-card-type">{agent.roleLabel}</p>

              <div className="profile-card-meta">
                <div className="meta-row-item">
                  <span className="meta-label">Authority</span>
                  <span className="meta-val highlight-authority">{displayRank}</span>
                </div>
                <div className="meta-row-item">
                  <span className="meta-label">Last Action</span>
                  <span className="meta-val font-mono">{agent.lastAction}</span>
                </div>
              </div>
              <div className="profile-card-footer">
                <button type="button" className="btn-secondary card-view-btn">
                  View Activity
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Selected Agent Details Row */}
      <div className="agent-details-container">
        <div className="agent-details-main">
          <div className="agent-details-column">
            <h3 className="details-header-title">Selected Agent: {activeAgent.name}</h3>
            
            <div className="details-card-status">
              <span className="badge-tag">{activeAgent.roleLabel}</span>
              <span className="badge-tag font-mono">{activeAgent.isReal ? 'REAL TRACE DATA' : 'DEMO PROFILE'}</span>
            </div>

            <div className="details-specs">
              <div className="spec-row">
                <span className="spec-label">Authority Tier</span>
                <span className="spec-value highlight-authority">
                  {activeAgent.isReal 
                    ? (currentPermission === 'FULL' ? 'FULL COMMAND — 3/3' : currentPermission === 'RESTRICTED' ? 'RESTRICTED — 2/3' : currentPermission === 'READ_ONLY' ? 'READ ONLY — 1/3' : 'LOCKED — 0/3')
                    : activeAgent.authorityLabel
                  }
                </span>
              </div>

              <div className="spec-row">
                <span className="spec-label">Allowed Scope</span>
                <div className="spec-tags-list">
                  {activeAgent.allowedActions.map(action => (
                    <span key={action} className="scope-tag allowed">✓ {action}</span>
                  ))}
                </div>
              </div>

              <div className="spec-row">
                <span className="spec-label">Restricted Scope</span>
                <div className="spec-tags-list">
                  {activeAgent.restrictedActions.map(action => (
                    <span key={action} className="scope-tag restricted">✕ {action}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Selected Agent Activity Column */}
          <div className="agent-details-column">
            <h4 className="details-section-title">Recent Activity</h4>
            <div className="activity-history-box">
              {activeAgent.isReal ? (
                // Real on-chain log data for Mira
                realAttestations.length === 0 ? (
                  <p className="no-activity-text">No verified actions attested on-chain yet.</p>
                ) : (
                  <ul className="details-activity-list">
                    {realAttestations.slice(0, 3).map((log, idx) => (
                      <li key={idx} className="details-activity-item">
                        <div className="act-row-main">
                          <span className="act-action">{log.action}</span>
                          <span className="act-status allowed">✓ ALLOWED</span>
                        </div>
                        <span className="act-meta">Tx: {log.transactionHash.slice(0, 16)}&hellip;</span>
                      </li>
                    ))}
                  </ul>
                )
              ) : (
                // Predefined mock activity for demo AIs
                activeAgent.activity.length === 0 ? (
                  <p className="no-activity-text">No demo activity recorded yet.</p>
                ) : (
                  <ul className="details-activity-list">
                    {activeAgent.activity.map((act, idx) => (
                      <li key={idx} className="details-activity-item">
                        <div className="act-row-main">
                          <span className="act-action">{act.action}</span>
                          <span className={`act-status ${act.status === 'ALLOWED' ? 'allowed' : 'blocked'}`}>
                            {act.status === 'ALLOWED' ? '✓ ALLOWED' : '🔴 BLOCKED'}
                          </span>
                        </div>
                        <div className="act-row-footer">
                          <span className="act-meta-demo">DEMO ACTIVITY</span>
                          <span className="act-time">{act.timestamp}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )
              )}
            </div>
          </div>
        </div>

        {/* Selected Agent Policy Matrix */}
        <div className="agent-policy-box">
          <h4 className="details-section-title">Active Policy Map</h4>
          <p className="policy-desc">
            {activeAgent.isReal 
              ? 'On-chain dynamic permissions. Rules switch automatically on heartbeats.'
              : 'Preconfigured demo policy map (simulation only).'
            }
          </p>
          <table className="policy-table">
            <thead>
              <tr>
                <th>System Action</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(activeAgent.isReal ? getMiraPolicy(currentPermission || 'LOCKED') : getStaticPolicy(activeAgent.id)).map(rule => (
                <tr key={rule.action}>
                  <td>{rule.action}</td>
                  <td className={rule.status === '✓' ? 'text-accent' : 'text-danger'}>{rule.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* How TRACE Connects Section */}
      <div className="integration-explainer-card">
        <h3 className="explainer-title">How TRACE Connects to AIs</h3>
        <p className="explainer-p">
          TRACE enforces authorization on <strong>actions</strong>, not conversations. You do not need to share prompts, model weights, or logs. 
          When an agent attempts a sensitive function, it hits the TRACE API / SDK requesting an authorization check.
        </p>
        
        <div className="flow-diagram">
          <div className="flow-node">External AI</div>
          <div className="flow-arrow">&rarr;</div>
          <div className="flow-node highlight">TRACE SDK Query</div>
          <div className="flow-arrow">&rarr;</div>
          <div className="flow-node highlight-green">Smart Contract Policy</div>
          <div className="flow-arrow">&rarr;</div>
          <div className="flow-node">Verified Execution / Attestation</div>
        </div>

        <div className="code-example-row">
          <div className="code-box">
            <span className="code-box-title">1. Structured Request Payload</span>
            <pre>
{`{
  "agentId": "${activeAgent.id}",
  "action": "${activeAgent.lastAction || 'APPROVE_INVOICE'}",
  "resourceId": "invoice_8829"
}`}
            </pre>
          </div>
          <div className="code-box">
            <span className="code-box-title">2. TRACE Gateway Response</span>
            <pre>
{`{
  "allowed": ${activeAgent.id === 'mira' && currentPermission === 'FULL' ? 'true' : 'false'},
  "permission": "${activeAgent.isReal ? (currentPermission || 'LOCKED') : (activeAgent.id === 'finance-ai' ? 'RESTRICTED' : 'READ_ONLY')}",
  "reason": "${activeAgent.id === 'mira' && currentPermission === 'FULL' ? 'Action permitted' : 'Action blocked: insufficient command authority'}"
}`}
            </pre>
          </div>
        </div>

        <p className="explainer-footer-msg">
          <strong>Connect any AI agent. Give it only the authority it needs. TRACE enforces the boundary.</strong>
        </p>
      </div>

      {/* Connect Agent Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">Connect New AI Agent</h3>
            <form onSubmit={handleConnectAgent}>
              <div className="form-group">
                <label className="form-label">Agent Name</label>
                <input 
                  type="text" 
                  className="field-input form-input" 
                  placeholder="e.g. Support Executor, Dev Agent"
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Agent Type</label>
                <select 
                  className="field-input form-input"
                  value={newAgentType}
                  onChange={(e) => setNewAgentType(e.target.value)}
                >
                  <option value="AI Agent">AI Agent</option>
                  <option value="Autonomous Executor">Autonomous Executor</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Integration Method</label>
                <select 
                  className="field-input form-input"
                  value={newAgentIntegration}
                  onChange={(e) => setNewAgentIntegration(e.target.value)}
                >
                  <option value="Demo Agent">Demo Agent Profile (Local simulation)</option>
                  <option value="TRACE API">TRACE API (External)</option>
                  <option value="TRACE SDK">TRACE SDK (External)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Permissions Scope</label>
                <div className="checkboxes-list">
                  <label className="checkbox-row">
                    <input 
                      type="checkbox" 
                      checked={newAgentPerms.read} 
                      onChange={(e) => setNewAgentPerms(prev => ({ ...prev, read: e.target.checked }))}
                    />
                    <span>Read System Data</span>
                  </label>
                  <label className="checkbox-row">
                    <input 
                      type="checkbox" 
                      checked={newAgentPerms.message}
                      onChange={(e) => setNewAgentPerms(prev => ({ ...prev, message: e.target.checked }))}
                    />
                    <span>Send Messages / Notifications</span>
                  </label>
                  <label className="checkbox-row">
                    <input 
                      type="checkbox" 
                      checked={newAgentPerms.finance}
                      onChange={(e) => setNewAgentPerms(prev => ({ ...prev, finance: e.target.checked }))}
                    />
                    <span>Approve Financial Actions</span>
                  </label>
                  <label className="checkbox-row">
                    <input 
                      type="checkbox" 
                      checked={newAgentPerms.deploy}
                      onChange={(e) => setNewAgentPerms(prev => ({ ...prev, deploy: e.target.checked }))}
                    />
                    <span>Production Deployment</span>
                  </label>
                </div>
              </div>

              {modalNotice && (
                <div className="modal-notice-box">
                  {modalNotice}
                </div>
              )}

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Connect Agent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
