const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001'

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || data.message || `HTTP ${response.status}`)
  }

  return data
}

// GET /api/trace/status
// -> { permission, permissionValue, owner, agent, network, lastHeartbeat, inactiveTime }
export function getTraceStatus() {
  return request('/api/trace/status')
}

// POST /api/trace/heartbeat
export function sendHeartbeat() {
  return request('/api/trace/heartbeat', { method: 'POST' })
}

// POST /api/mira/request  body: { request: string }
// -> { status: 'VERIFIED' | 'BLOCKED', message? }
export function askMira(userRequest) {
  return request('/api/mira/request', {
    method: 'POST',
    body: JSON.stringify({ request: userRequest }),
  })
}

// GET /api/trace/attestations
// -> [{ agent, action, permission, timestamp, transactionHash, blockNumber }]
// Each entry is an ActionAttested event — its presence in the list IS the
// verdict (the action was successfully attested). There is no separate
// verdict field, and blocked requests never appear here.
export function getAttestations() {
  return request('/api/trace/attestations')
}

// POST /api/trace/decay-config
export function sendDecayConfig(multiplier) {
  return request('/api/trace/decay-config', {
    method: 'POST',
    body: JSON.stringify({ multiplier })
  })
}

// POST /api/trace/decay-tick
export function sendDecayTick() {
  return request('/api/trace/decay-tick', { method: 'POST' })
}