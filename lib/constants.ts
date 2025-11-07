// lib/constants.ts

export const COLLECTION_NAME = "SATOSHE SLUGGERS";

// Always check for environment variables at runtime, never at import/module load.
// This prevents Next.js from failing to compile or deploy.
export function getContractAddress() {
  const addr = process.env.NEXT_PUBLIC_NFT_COLLECTION_ADDRESS;
  if (!addr) {
    throw new Error(
      "SECURITY ERROR: Missing NEXT_PUBLIC_NFT_COLLECTION_ADDRESS environment variable. No fallbacks allowed.",
    );
  }
  return addr;
}
// Usage: const address = getContractAddress(); // Throws only if actually used/missing

export const FINAL_PROOF_HASH =
  "a0a4dd729d67df70a8c53ed1ded33b327e326d6f52d95f6c19f8897199b5eb04";
export const MERKLE_ROOT =
  "bc84cdbe96390266f1b288a92da05b0237449c20669a8dab45b98c4ae35f7526";
