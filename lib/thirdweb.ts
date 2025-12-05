// lib/thirdweb.ts
// Thirdweb v5 SDK Client Configuration
//
// IMPORTANT: This file exports clients for both client-side and server-side use:
// - client: For client-side components (uses clientId - safe to expose)
// - serverClient: For server-side API routes (uses secretKey - never expose!)
// - insightClient: For Insight API operations (uses Insight Client ID)

import { createThirdwebClient } from "thirdweb";

// ============================================================================
// CLIENT-SIDE CLIENT (for React components, hooks, etc.)
// ============================================================================
// Retrieve the SDK client ID from environment variables.
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

// Export a shared client instance for CLIENT-SIDE use (hooks, components, etc.)
// The throw above guarantees THIRDWEB_CLIENT_ID is defined, so client is always defined
export const client = createThirdwebClient({ clientId: THIRDWEB_CLIENT_ID });

// ============================================================================
// SERVER-SIDE CLIENT (for API routes, server components)
// ============================================================================
// Use secretKey for server-side operations (better rate limits, performance)
// SECURITY: secretKey must NEVER be exposed to client - only use in API routes!
const THIRDWEB_SECRET_KEY_RAW = process.env.THIRDWEB_SECRET_KEY;

// Create server-side client with secretKey if available, otherwise fallback to clientId
// This allows API routes to use secretKey for better performance
export const serverClient = THIRDWEB_SECRET_KEY_RAW && THIRDWEB_SECRET_KEY_RAW.trim() !== ""
  ? createThirdwebClient({ secretKey: THIRDWEB_SECRET_KEY_RAW })
  : client; // Fallback to clientId-based client if secretKey not set

// ============================================================================
// INSIGHT API CLIENT (for event queries and Insight API operations)
// ============================================================================
// Insight API Client ID (separate, dedicated client ID for Insight API operations)
// Used for event queries via getContractEvents() which uses Insight API internally
const INSIGHT_CLIENT_ID_RAW = process.env.INSIGHT_CLIENT_ID;

// Create a separate client instance for Insight API operations
// This allows getContractEvents() to use the correct Insight Client ID
export const insightClient = INSIGHT_CLIENT_ID_RAW && INSIGHT_CLIENT_ID_RAW.trim() !== ""
  ? createThirdwebClient({ clientId: INSIGHT_CLIENT_ID_RAW })
  : client; // Fallback to main client if Insight Client ID is not set
