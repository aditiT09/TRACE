# TRACE — Verifiable Autonomy for AI Agents

> "When human attention fades, AI authority fades."

TRACE is a security infrastructure layer that bridges autonomous AI actions and blockchain-enforced permissions. It guarantees that AI agents only execute sensitive operations when human authorization is active, automatically decaying agent authority over time until the human checks in again (heartbeat).

---

## Technical Architecture

```
                    USER
                      │
                      ▼
                React Frontend
                      │
                      ▼
                 Backend API (Port 3001)
                      │
                 Mira AI Agent
                      │
                  Gemini LLM
                      │
                 Structured Action
                      │
                 TRACE Smart Contract
                      │
                 ALLOW / BLOCK
                  /         \
                 /           \
              ALLOW          BLOCK
                │               │
                ▼               ▼
            Execute          Reject
                │
                ▼
            Attestation
                │
                ▼
           Blockchain
```

---

## Security Protocol & Validation

1. **Smart Contract as Authority**: The smart contract remains the ultimate authority. The LLM is only an action classifier and has zero permissioning or transaction execution capability.
2. **Network Validation Safety**: Before executing write transactions (`heartbeat` or `attestAction`), the API checks the chain ID against `EXPECTED_CHAIN_ID`.
   * **Local Node**: `31337`
   * **Polygon Amoy**: `80002`
   * If a mismatch occurs, the transaction is rejected and the server returns a `WRONG_NETWORK` error.
3. **API Input Hardening**: String presence, empty check, and maximum length checks are enforced on `POST /api/mira/request` to protect from buffer/DOS exploits. Malformed JSON returns a clean error payload.
4. **Secret Sandboxing**: Private keys, mnemonics, and Gemini API keys are completely protected and never returned by the API or committed to repository branches.

---

## API Endpoints

* **`GET /api/trace/status`**: Returns owner/agent addresses, network, contract address, current permission level, last heartbeat timestamp, and inactive duration.
* **`POST /api/trace/heartbeat`**: Signs and executes the contract owner's `heartbeat()` transaction to restore permissions to `FULL`.
* **`POST /api/mira/request`**: Submits a natural-language request. Mira classifies the request, checks permissions via the contract, simulates execution if allowed, and registers an on-chain attestation.
* **`GET /api/trace/attestations`**: Queries `ActionAttested` events directly from the blockchain logs.

---

## Setup & Running Locally

### 1. Configure Environment Variables
Copy `.env.example` to `.env` and fill in the parameters:
```bash
cp .env.example .env
```

### 2. Run Local Blockchain & Deploy
Start a local Hardhat JSON-RPC network node:
```bash
npx hardhat node
```

In a new terminal window, deploy the TRACE smart contract to localhost:
```bash
$env:TRACE_AGENT_ADDRESS="0x70997970C51812dc3A010C7d01b50e0d17dc79C8" # Hardhat Account #1
npx hardhat run scripts/deployTrace.js --network localhost
```

Update your `.env` file with the deployed `Contract Address` output.

### 3. Start the API Server
Start the Express server on port 3001:
```bash
$env:EXPECTED_CHAIN_ID="31337"; npx hardhat run server.js --network localhost
```

---

## Polygon Amoy Testnet Status

* **Status**: Ready for production deployment; live deployment pending testnet credentials.
* To deploy once testnet funds and RPC configurations are ready:
  ```bash
  npx hardhat run scripts/deployTrace.js --network polygonAmoy
  ```

---

## Testing

To run the complete test suite (87 tests including Solidity, Agent unit tests, LLM mock parsing, integration security tests, network safety, and end-to-end scenarios):
```bash
npx hardhat test
```
