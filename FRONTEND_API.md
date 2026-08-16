# TRACE - Frontend API Integration Specification

This documentation defines the API endpoints, error structures, and network safety behaviors exposed by the TRACE backend for the React frontend developer.

---

## Configuration Required by Frontend

The frontend React application requires the following environment variables:

```env
# URL of the running Node.js TRACE API backend
VITE_API_URL=http://localhost:3001

# Address of the TracePermissions smart contract deployed on local/testnet node
VITE_TRACE_CONTRACT_ADDRESS=0xe7f1725e7734ce288f8367e1bb143e90bb3f0512

# RPC endpoint URL (e.g. Local Hardhat node or Polygon Amoy provider URL)
VITE_RPC_URL=http://127.0.0.1:8545
```

---

## Network Validation Protocol

The TRACE backend strictly validates that it is connected to the expected network configuration before executing any write transactions (`heartbeat` or `attestAction`).
* **Local EDR Node Chain ID**: `31337`
* **Polygon Amoy Testnet Chain ID**: `80002`

If the backend detects a network mismatch (e.g. the server expects Polygon Amoy but is connected to localhost), write endpoints will reject the request with a **`400 Bad Request`** status and a `WRONG_NETWORK` error code.

### UI Error Handling Guidelines
* **Do NOT attempt to bypass or override this validation** from the frontend client.
* **UI Behavior**: If the frontend receives a `WRONG_NETWORK` status code, it must display a prominent error banner or modal informing the user of the network mismatch (e.g. "Network Mismatch: Please switch your wallet/provider to Polygon Amoy (Chain ID 80002)").

---

## API Endpoints

All API endpoints are hosted relative to the `VITE_API_URL` prefix (default: `http://localhost:3001`).

### 1. Get TRACE Authority Status
Retrieves current blockchain authority states, active levels, and timers.

* **Method**: `GET`
* **URL**: `/api/trace/status`
* **Request Body**: None
* **Success Response (200 OK)**:
  ```json
  {
    "owner": "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
    "agent": "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
    "permission": "FULL",
    "permissionValue": 3,
    "lastHeartbeat": "2026-08-11T17:54:18.000Z",
    "inactiveTime": "12",
    "contractAddress": "0xe7f1725e7734ce288f8367e1bb143e90bb3f0512",
    "network": "Hardhat"
  }
  ```
* **Error Response (500 Internal Server Error)**:
  ```json
  {
    "success": false,
    "error": "FAILED_TO_GET_STATUS"
  }
  ```

---

### 2. Trigger Owner Heartbeat (Check In)
Executes the `heartbeat()` transaction on the smart contract from the owner's account. This method waits for the transaction to be confirmed on the blockchain before returning.

* **Method**: `POST`
* **URL**: `/api/trace/heartbeat`
* **Request Body**: None
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "transactionHash": "0xbb1fc48f5e0c9fd944e3c74ea8f11fbe02d43932c14962d374cc2fb0256fe963",
    "blockNumber": 3
  }
  ```
* **Error Response - Network Mismatch (400 Bad Request)**:
  ```json
  {
    "success": false,
    "status": "WRONG_NETWORK",
    "expectedChainId": 80002,
    "actualChainId": 31337
  }
  ```
* **Error Response - Transaction Failure (500 Internal Server Error)**:
  ```json
  {
    "success": false,
    "status": "TRANSACTION_FAILED"
  }
  ```

---

### 3. Ask Mira (Natural-Language Request)
Processes a natural-language query via the Mira client-operations agent. Mira classifies the request into a TRACE action using Gemini LLM and queries the contract to verify permissions. If permitted, the action is simulated and attested on-chain.

* **Method**: `POST`
* **URL**: `/api/mira/request`
* **Request Body**:
  ```json
  {
    "request": "Send a reminder to the client"
  }
  ```
* **Success Response - Allowed/Verified (200 OK)**:
  ```json
  {
    "success": true,
    "agent": "Mira",
    "action": "SEND_MESSAGE",
    "permission": "FULL",
    "status": "VERIFIED",
    "transactionHash": "0xdbb0a759d3fd9dd73c50fb5f7b2ec71b8ae45fbcdc6f56d496b9da6b30e96010"
  }
  ```
* **Success Response - Action Blocked by TRACE (200 OK)**:
  ```json
  {
    "success": false,
    "agent": "Mira",
    "action": "APPROVE_INVOICE",
    "permission": "RESTRICTED",
    "status": "BLOCKED"
  }
  ```

---

### 4. Fetch Attestation Logs
Reads historical `ActionAttested` logs directly from the blockchain contract events.

* **Method**: `GET`
* **URL**: `/api/trace/attestations`
* **Request Body**: None
* **Success Response (200 OK)**:
  ```json
  [
    {
      "agent": "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
      "action": "SEND_MESSAGE",
      "permission": "FULL",
      "timestamp": 1786470851,
      "transactionHash": "0xdbb0a759d3fd9dd73c50fb5f7b2ec71b8ae45fbcdc6f56d496b9da6b30e96010",
      "blockNumber": 3
    }
  ]
  ```
* **Error Response (500 Internal Server Error)**:
  ```json
  {
    "success": false,
    "error": "FAILED_TO_GET_ATTESTATIONS"
  }
  ```

---

## API Error States

### 1. `INVALID_REQUEST` (400 Bad Request)
Returned when payload parameters are missing or violate length/type validations.
* **Missing Property**: `{"success":false,"error":"Missing 'request' in body."}`
* **Wrong Type**: `{"success":false,"error":"Parameter 'request' must be a string."}`
* **Empty string**: `{"success":false,"error":"Parameter 'request' cannot be empty."}`
* **Length Exceeded** (>2000 chars): `{"success":false,"error":"Parameter 'request' exceeds maximum allowed length."}`
* **Malformed JSON Syntax**: `{"success":false,"error":"Malformed JSON payload."}`

### 2. `UNKNOWN_ACTION` (200 OK)
Returned when Mira classifies the user request as unsupported or un-mappable.
```json
{
  "success": false,
  "action": "UNKNOWN_ACTION",
  "status": "UNKNOWN_ACTION"
}
```

### 3. `LLM_UNAVAILABLE` (200 OK)
Returned when Gemini API calls fail or return unexpected formats.
```json
{
  "success": false,
  "status": "LLM_UNAVAILABLE"
}
```

### 4. `TRACE_UNAVAILABLE` (200 OK)
Returned when connection to the smart contract or local RPC node goes offline.
```json
{
  "success": false,
  "status": "TRACE_UNAVAILABLE"
}
```

### 5. `WRONG_NETWORK` (400 Bad Request)
Returned when the backend node's chain ID does not match the active `EXPECTED_CHAIN_ID` configuration.
```json
{
  "success": false,
  "status": "WRONG_NETWORK",
  "expectedChainId": 80002,
  "actualChainId": 31337
}
```

---

## Security Integration Rules

> [!IMPORTANT]
> To preserve the security guarantees of the TRACE permission engine, the React frontend must follow these constraints:
>
> 1. **No Client Authorization Decision**: The frontend must never supply or override parameters like `permission`, `owner`, `agent`, or `authorization status`. These must come strictly from backend contract queries.
> 2. **Private Key & API Key Sandbox**: The frontend must never handle raw wallet private keys, seeds, mnemonics, or Gemini API keys.
> 3. **Verification Integrity**: A transaction or operation state must only be shown as verified if a successful `transactionHash` is returned from the API, confirming the action was attested on the blockchain.
