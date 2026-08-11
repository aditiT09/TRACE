# TRACE — Verifiable Autonomy for AI Agents

> "When human attention fades, AI authority fades."

TRACE is a security infrastructure layer that bridges autonomous AI actions and blockchain-enforced permissions. It guarantees that AI agents only execute sensitive operations when human authorization is active, automatically decaying agent authority over time until the human checks in again (heartbeat).

---

## Architecture Flow

```
                    USER
                      │
                      ▼
                ┌───────────┐
                │   MIRA    │
                │ AI Agent  │
                └─────┬─────┘
                      │
                 Natural Language
                      │
                      ▼
                ┌───────────┐
                │    LLM    │
                │ Classifier│
                └─────┬─────┘
                      │
                 Structured Action
                      │
                      ▼
             ┌──────────────────┐
             │ TRACE Contract   │
             │                  │
             │ Permission       │
             │ Action Check     │
             └────────┬─────────┘
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

## API Endpoints

The TRACE API is exposed via a local Node.js Express server running on port `3001` (by default):

* **`GET /api/trace/status`**: Returns owner/agent addresses, network, contract address, current permission level, last heartbeat timestamp, and inactive duration.
* **`POST /api/trace/heartbeat`**: Signs and executes the contract owner's `heartbeat()` transaction to restore permissions to `FULL`.
* **`POST /api/mira/request`**: Submits a natural-language request to the Mira agent. Mira classifies the request, checks permissions via the contract, simulates execution if allowed, and registers an on-chain attestation.
* **`GET /api/trace/attestations`**: Queries `ActionAttested` events directly from the blockchain logs.

---

## Setup & Running Locally

### 1. Configure Environment Variables
Copy `.env.example` to `.env` and fill in the parameters:
```bash
cp .env.example .env
```

Environment variables:
* `PRIVATE_KEY`: Deployment private key (for Polygon Amoy deployment).
* `POLYGON_AMOY_RPC_URL`: RPC provider URL for Polygon Amoy.
* `TRACE_AGENT_ADDRESS`: The wallet address of the AI Agent (MetaMask or Account #1).
* `TRACE_CONTRACT_ADDRESS`: The address of the deployed contract.
* `LLM_API_KEY`: Google Gemini API Key (Optional. Falls back to `MockLlmParser` if not set).
* `LLM_MODEL`: LLM model name (default: `gemini-1.5-flash`).

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
npx hardhat run server.js --network localhost
```

---

## Polygon Amoy Testnet Deployment

To deploy to the Polygon Amoy testnet:
1. Configure your `PRIVATE_KEY` and `POLYGON_AMOY_RPC_URL` using Hardhat variables:
   ```bash
   npx hardhat vars set PRIVATE_KEY
   npx hardhat vars set POLYGON_AMOY_RPC_URL
   ```
2. Run the deployment script:
   ```bash
   npx hardhat run scripts/deployTrace.js --network polygonAmoy
   ```

---

## Testing

To run the complete test suite (70 tests including Solidity, Agent unit tests, LLM mock parsing, and integration security tests):
```bash
npx hardhat test
```
