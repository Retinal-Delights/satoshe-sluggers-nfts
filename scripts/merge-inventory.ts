import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

interface VerifiedListing {
  listingId: string;
  tokenId: string;
  status: string;
  priceETH: string;
  rarityTier: string;
}

interface InventoryRow {
  listingId: string;
  tokenId: string;
  name: string;
  owner: string;
  rarityTier: string;
  price: string;
  status: string;
}

// Helper to convert wei to ETH with proper formatting
function formatPrice(weiStr: string): string {
  if (!weiStr || weiStr === "") return "";
  try {
    const wei = BigInt(weiStr);
    const eth = Number(wei) / 1e18;
    // Format to avoid scientific notation
    if (eth < 0.000001) return "0";
    return eth.toFixed(9).replace(/\.?0+$/, "");
  } catch {
    return weiStr;
  }
}

// Helper to convert ETH string to wei for comparison
function ethToWei(ethStr: string): string {
  try {
    const eth = parseFloat(ethStr);
    return (BigInt(Math.floor(eth * 1e18))).toString();
  } catch {
    return "0";
  }
}

async function main(): Promise<void> {
  // Read verified listings
  const verifiedContent = readFileSync(
    join(process.cwd(), "scripts", "verified-listings-state.csv"),
    "utf-8"
  );
  const verifiedLines = verifiedContent.split("\n").filter((l) => l.trim());
  const verifiedHeaders = verifiedLines[0].split(",");
  
  // Parse verified listings - group by tokenId, prefer ACTIVE listings
  const verifiedByToken = new Map<string, VerifiedListing[]>();
  for (let i = 1; i < verifiedLines.length; i++) {
    const values = verifiedLines[i].split(",");
    const row: any = {};
    verifiedHeaders.forEach((h, idx) => {
      row[h.trim()] = values[idx]?.trim() || "";
    });
    
    const tokenId = row["Token ID"]?.toString().trim();
    if (!tokenId) continue;
    
    const listing: VerifiedListing = {
      listingId: row["Listing ID"]?.toString().trim() || "",
      tokenId: tokenId,
      status: row["Status"]?.toString().trim() || "",
      priceETH: row["Price (ETH)"]?.toString().trim() || "",
      rarityTier: row["Rarity Tier"]?.toString().trim() || "",
    };
    
    if (!verifiedByToken.has(tokenId)) {
      verifiedByToken.set(tokenId, []);
    }
    verifiedByToken.get(tokenId)!.push(listing);
  }
  
  // Read full inventory
  const inventoryContent = readFileSync(
    join(process.cwd(), "scripts", "full-inventory.csv"),
    "utf-8"
  );
  const inventoryLines = inventoryContent.split("\n").filter((l) => l.trim());
  const inventoryHeaders = inventoryLines[0].split(",");
  
  // Process inventory and merge with verified listings
  const updatedRows: InventoryRow[] = [];
  let updatedCount = 0;
  let activeListingsCount = 0;
  
  // Track active listings by token ID for verification
  const activeListingsByToken = new Map<string, string[]>();
  
  for (let i = 1; i < inventoryLines.length; i++) {
    const values = inventoryLines[i].split(",");
    const row: any = {};
    inventoryHeaders.forEach((h, idx) => {
      row[h.trim()] = values[idx]?.trim().replace(/^"|"$/g, "") || "";
    });
    
    const tokenId = row.tokenId?.toString().trim();
    if (!tokenId) continue;
    
    const inventoryRow: InventoryRow = {
      listingId: row.listingId || "",
      tokenId: tokenId,
      name: row.name || "",
      owner: row.owner || "",
      rarityTier: row.rarityTier || "unknown",
      price: row.price || "",
      status: row.status || "",
    };
    
    // Find verified listing for this token
    const verifiedListings = verifiedByToken.get(tokenId) || [];
    
    // Prefer ACTIVE listings, then any other listing
    const activeListings = verifiedListings.filter((l) => l.status === "ACTIVE");
    const listingToUse = activeListings.length > 0 ? activeListings[0] : verifiedListings[0];
    
    if (listingToUse) {
      // Update with verified data
      inventoryRow.listingId = listingToUse.listingId;
      inventoryRow.rarityTier = listingToUse.rarityTier || inventoryRow.rarityTier;
      
      // Format price - use ETH price from verified listings
      if (listingToUse.priceETH) {
        const priceEth = parseFloat(listingToUse.priceETH);
        // Check if it's a test token (0.00001 ETH)
        if (priceEth === 0.00001) {
          inventoryRow.price = "0.00001 (Burned Test Token)";
          inventoryRow.status = "TEST_TOKEN";
        } else {
          inventoryRow.price = listingToUse.priceETH;
        }
      } else {
        // Fallback to formatting existing price
        inventoryRow.price = formatPrice(row.price);
      }
      
      inventoryRow.status = listingToUse.status || inventoryRow.status;
      updatedCount++;
      
      // Track active listings for verification
      if (listingToUse.status === "ACTIVE") {
        activeListingsCount++;
        if (!activeListingsByToken.has(tokenId)) {
          activeListingsByToken.set(tokenId, []);
        }
        activeListingsByToken.get(tokenId)!.push(listingToUse.listingId);
      }
    } else {
      // No verified listing, format existing price
      inventoryRow.price = formatPrice(row.price);
    }
    
    updatedRows.push(inventoryRow);
  }
  
  // Verify active listings mapping
  let verificationErrors = 0;
  for (const [tokenId, listingIds] of activeListingsByToken.entries()) {
    if (listingIds.length > 1) {
      // Multiple active listings detected
    }
    // Verify the listing ID in inventory matches
    const inventoryRow = updatedRows.find((r) => r.tokenId === tokenId && r.status === "ACTIVE");
    if (inventoryRow && !listingIds.includes(inventoryRow.listingId)) {
      verificationErrors++;
    }
  }
  
  // Generate CSV output
  const csvContent = [
    "listingId,tokenId,name,owner,rarityTier,price,status",
    ...updatedRows.map((r) =>
      [
        r.listingId,
        r.tokenId,
        r.name,
        r.owner,
        r.rarityTier,
        r.price,
        r.status,
      ]
        .map((v) => {
          const str = String(v || "");
          // Escape quotes and wrap in quotes if contains comma or quote
          if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(",")
    ),
  ].join("\n");
  
  const outputFile = join(process.cwd(), "scripts", `full-inventory-merged-${Date.now()}.csv`);
  writeFileSync(outputFile, csvContent, "utf-8");
  
}

main().catch(() => process.exit(1));

