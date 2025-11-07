#!/usr/bin/env node
/**
 * Split large metadata JSON files into smaller chunks
 * Splits combined_metadata.json and combined_metadata_optimized.json into chunks of 1000 NFTs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHUNK_SIZE = 250; // NFTs per chunk (optimized to match max page size)
const TOTAL_NFTS = 7777;

// Paths
const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'public', 'data');
const METADATA_DIR = path.join(DATA_DIR, 'metadata');
const OPTIMIZED_METADATA_DIR = path.join(DATA_DIR, 'metadata-optimized');

// Input files
const COMBINED_METADATA = path.join(DATA_DIR, 'combined_metadata.json');
const COMBINED_METADATA_OPTIMIZED = path.join(DATA_DIR, 'combined_metadata_optimized.json');

/**
 * Split a metadata file into chunks
 */
function splitMetadataFile(inputPath, outputDir, isOptimized = false) {
  if (!fs.existsSync(inputPath)) {
    return;
  }

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Read the input file
  const fileContent = fs.readFileSync(inputPath, 'utf-8');
  const data = JSON.parse(fileContent);

  // Extract tokens array
  let tokens;
  let meta = null;
  let rules = null;
  let manifest = null;

  if (isOptimized) {
    // Optimized format: { meta, rules, manifest, tokens: [...] }
    meta = data.meta;
    rules = data.rules;
    manifest = data.manifest;
    tokens = data.tokens || [];
  } else {
    // Regular format: array of NFT objects
    tokens = Array.isArray(data) ? data : (data.tokens || []);
  }

  // Split into chunks
  const chunks = [];
  for (let i = 0; i < tokens.length; i += CHUNK_SIZE) {
    const chunkStart = i;
    const chunkEnd = Math.min(i + CHUNK_SIZE - 1, tokens.length - 1);
    const chunkTokens = tokens.slice(chunkStart, chunkEnd + 1);
    
    chunks.push({
      start: chunkStart,
      end: chunkEnd,
      tokens: chunkTokens,
    });
  }

  // Write each chunk
  let totalSize = 0;
  chunks.forEach((chunk, index) => {
    const chunkData = isOptimized
      ? {
          meta,
          rules,
          manifest,
          tokens: chunk.tokens,
        }
      : chunk.tokens;

    const filename = `chunk-${chunk.start}-${chunk.end}.json`;
    const outputPath = path.join(outputDir, filename);
    
    const jsonContent = JSON.stringify(chunkData, null, 0); // No formatting for smaller size
    fs.writeFileSync(outputPath, jsonContent, 'utf-8');
    
    const sizeKB = (Buffer.byteLength(jsonContent, 'utf-8') / 1024).toFixed(1);
    totalSize += parseFloat(sizeKB);
  });
}

/**
 * Create an index file mapping token IDs to chunks
 */
function createIndexFile(outputDir) {
  const index = {};
  
  for (let i = 0; i < TOTAL_NFTS; i += CHUNK_SIZE) {
    const chunkStart = i;
    const chunkEnd = Math.min(i + CHUNK_SIZE - 1, TOTAL_NFTS - 1);
    const filename = `chunk-${chunkStart}-${chunkEnd}.json`;
    
    // Add all token IDs in this chunk to the index
    for (let tokenId = chunkStart; tokenId <= chunkEnd; tokenId++) {
      index[tokenId] = filename;
    }
  }

  const indexPath = path.join(outputDir, 'index.json');
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 0), 'utf-8');
}

/**
 * Main function
 */
function main() {
  // Split regular metadata
  if (fs.existsSync(COMBINED_METADATA)) {
    splitMetadataFile(COMBINED_METADATA, METADATA_DIR, false);
  }

  // Split optimized metadata
  if (fs.existsSync(COMBINED_METADATA_OPTIMIZED)) {
    splitMetadataFile(COMBINED_METADATA_OPTIMIZED, OPTIMIZED_METADATA_DIR, true);
    createIndexFile(OPTIMIZED_METADATA_DIR);
  }
}

main();

