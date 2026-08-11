# TRACE - Frontend API Integration Specification

This documentation defines the API endpoints and configurations exposed by the TRACE backend for the React frontend developer.

---

## Configuration Required by Frontend

The frontend React application requires the following environment variables:

```env
# URL of the running Node.js TRACE API backend
VITE_API_URL=http://localhost:3001

# Address of the TracePermissions smart contract deployed on local/testnet node
VITE_TRACE_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3

# RPC endpoint URL (e.g. Local Hardhat node or Polygon Amoy provider URL)
VITE_RPC_URL=http://127.0.0.1:8545
```

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
      "owner": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      "agent": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      "permission": "FULL",
      "permissionValue": 3,
      "lastHeartbeat": "2026-08-11T14:35:27.000Z",
      "inactiveTime": "12",
      "contractAddress": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      "network": "Local EDR Node"
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
    "transactionHash": "0x40a324317f223789b59d940742914c85c0903e949bbd4efb464c579352862a9b",
    "blockNumber": 142
  }
  ```
* **Error Response (500 Internal Server Error)**:
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
    "transactionHash": "0x060bc561ba82dc55fe7679967dd1b9d31fd45376b2ed8ea92fcc0f0693a6831f"
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
* **Success Response - Unknown Action (200 OK)**:
  ```json
  {
    "success": false,
    "agent": "Mira",
    "request": "sing a song",
    "action": "UNKNOWN_ACTION",
    "status": "UNKNOWN",
    "message": "Mira could not map the request to a supported action."
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
      "agent": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      "action": "SEND_MESSAGE",
      "permission": "FULL",
      "timestamp": 1783849200,
      "transactionHash": "0x060bc561ba82dc55fe7679967dd1b9d31fd45376b2ed8ea92fcc0f0693a6831f",
      "blockNumber": 140
    },
    {
      "agent": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      "action": "SCHEDULE_MEETING",
      "permission": "RESTRICTED",
      "timestamp": 1783849321,
      "transactionHash": "0x080dcdbb12be581ae29ec5523221ca82801e50cea1510c53f109f21f375cc746",
      "blockNumber": 141
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
