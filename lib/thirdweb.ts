// lib/thirdweb.ts
// Thirdweb v5 SDK Client Configuration

import { createThirdwebClient } from "thirdweb";

// Retrieve the client ID from environment variables.
// This must be a public clientId – never use a secret key here!
const CLIENT_ID = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;

// Export a shared client instance for use in hooks, contracts, etc.
export const client = CLIENT_ID
  ? createThirdwebClient({ clientId: CLIENT_ID })
  : undefined;

// Developer safeguard: ensures the env var is present, for both local dev and production.
// Throws a descriptive error at module load if missing (fail fast for easy debugging).
if (!CLIENT_ID) {
  throw new Error(
    "❌ Missing NEXT_PUBLIC_THIRDWEB_CLIENT_ID environment variable. " +
      "See https://portal.thirdweb.com/sdk/set-up-the-sdk for instructions.",
  );
}
