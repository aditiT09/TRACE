import { createPublicClient, http } from "viem";

const client = createPublicClient({
  transport: http("http://127.0.0.1:8545"),
});

const abi = [
  {
    name: "getCurrentPermission",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
];

try {
  const result = await client.readContract({
    address: "0x5fbdb2315678afecb367f032d93f642f64180aa3",
    abi,
    functionName: "getCurrentPermission",
  });

  console.log("PERMISSION =", result);
} catch (error) {
  console.error(error);
}
