// lib/thirdweb.ts
// Thirdweb v5 SDK Client Configuration

import { createThirdwebClient } from "thirdweb";

// Retrieve the client ID from environment variables.
// This must be a public clientId – never use a secret key here!
const THIRDWEB_CLIENT_ID_RAW = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;

// Developer safeguard: ensures the env var is present and non-empty, for both local dev and production.
// Throws a descriptive error at module load if missing or empty (fail fast for easy debugging).
if (!THIRDWEB_CLIENT_ID_RAW || THIRDWEB_CLIENT_ID_RAW.trim() === "") {
  throw new Error(
    "❌ Missing NEXT_PUBLIC_THIRDWEB_CLIENT_ID environment variable. " +
      "See https://portal.thirdweb.com/sdk/set-up-the-sdk for instructions.",
  );
}

// Export with explicit string type - TypeScript now knows this is always defined
export const THIRDWEB_CLIENT_ID: string = THIRDWEB_CLIENT_ID_RAW;

// Export a shared client instance for use in hooks, contracts, etc.
// The throw above guarantees THIRDWEB_CLIENT_ID is defined, so client is always defined
export const client = createThirdwebClient({ clientId: THIRDWEB_CLIENT_ID });

// Export an Insight-optimized client for routes that use getContractEvents
// This uses the Insight client ID if available, which may help with SDK's internal Insight API usage
export function getInsightClient() {
  // Prefer Insight client ID for SDK operations that may use Insight API internally
  const insightClientId = process.env.INSIGHT_CLIENT_ID || process.env.NEXT_PUBLIC_INSIGHT_CLIENT_ID;
  if (insightClientId) {
    return createThirdwebClient({ clientId: insightClientId });
  }
  // Fallback to main client
  return client;
}