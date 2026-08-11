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
    "request": "Send a reminder to the client",
    "action": "SEND_MESSAGE",
    "permission": "FULL",
    "status": "VERIFIED",
    "message": "Action executed and attested on-chain",
    "executionLog": "Mira sent the client message.",
    "transactionHash": "0xdbb0a759d3fd9dd73c50fb5f7b2ec71b8ae45fbcdc6f56d496b9da6b30e96010"
  }
  ```
* **Success Response - Action Blocked by TRACE (200 OK)**:
  ```json
  {
    "success": false,
    "agent": "Mira",
    "request": "Approve the invoice",
    "action": "APPROVE_INVOICE",
    "permission": "RESTRICTED",
    "status": "BLOCKED",
    "message": "Action blocked by TRACE",
    "requiredPermission": "FULL"
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
* **Error/Fail-safe Response - LLM API Failure (200 OK)**:
  *If the Gemini LLM API is unavailable, the backend fails safely and rejects automatically.*
  ```json
  {
    "success": false,
    "agent": "Mira",
    "request": "Send a reminder to the client",
    "status": "LLM_UNAVAILABLE",
    "message": "LLM API is currently unavailable."
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

## Security Protocol

1. **Smart Contract as Authority**: Do not cache permission values or rely on front-end validations. All states (like `permission` and `canPerformAction`) are fetched directly from the deployed contract.
2. **Private Keys & API Secrets**: Do not expose any backend environment secrets (like private keys or Gemini API keys) to the client web browser.
3. **Verification Order**: Only trigger UI confirmation states once a transaction receipt `status` returns successfully.
