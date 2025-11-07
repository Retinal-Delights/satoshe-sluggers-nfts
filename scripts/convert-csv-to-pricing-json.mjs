import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const csvPath = path.join(__dirname, './full-inventory-details.csv');
const outputPath = path.join(__dirname, '../public/data/pricing/token_pricing_mappings.json');

// Read and parse CSV
function parseCSV(content) {
  const lines = content.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim());
  
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const entry = {};
    headers.forEach((header, index) => {
      let value = values[index]?.trim() || '';
      // Handle quoted values and empty values
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      
      // Convert numeric fields
      if (header === 'listingId' || header === 'tokenId') {
        value = value ? parseInt(value, 10) : null;
      } else if (header === 'price') {
        value = value ? parseFloat(value) : 0;
      }
      
      entry[header] = value;
    });
    data.push(entry);
  }
  
  return data;
}

try {
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const csvData = parseCSV(csvContent);
  
  // Convert to the format expected by the application
  // Format: Array of { token_id, price_eth, listing_id }
  const pricingMappings = csvData
    .filter(row => row.tokenId !== null && row.tokenId !== undefined && row.status === 'ACTIVE')
    .map(row => ({
      token_id: parseInt(row.tokenId),
      name: row.name || `Satoshe Slugger #${parseInt(row.tokenId) + 1}`,
      rarity_tier: row.rarityTier || 'Unknown',
      price_eth: parseFloat(row.price) || 0,
      listing_id: parseInt(row.listingId) || null
    }))
    .sort((a, b) => a.token_id - b.token_id);
  
  // Also create a lookup map keyed by token_id for faster access
  const lookupMap = {};
  pricingMappings.forEach(item => {
    lookupMap[item.token_id] = {
      price_eth: item.price_eth,
      listing_id: item.listing_id,
      rarity_tier: item.rarity_tier
    };
  });
  
  // Write both formats - array for compatibility, and optimized object for fast lookup
  const output = pricingMappings;
  
  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  
} catch (error) {
  process.exit(1);
}
