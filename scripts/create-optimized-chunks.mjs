#!/usr/bin/env node
/**
 * Create optimized chunks from regular chunks
 * Reads regular chunks and adds meta/rules/manifest structure
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHUNK_SIZE = 250;
const TOTAL_NFTS = 7777;

const ROOT_DIR = path.resolve(__dirname, '..');
const METADATA_DIR = path.join(ROOT_DIR, 'public', 'data', 'metadata');
const OPTIMIZED_METADATA_DIR = path.join(ROOT_DIR, 'public', 'data', 'metadata-optimized');

// Meta, rules, and manifest from the original optimized file structure
const META = {
  "artist": "Kristen Woerdeman",
  "platform": "Retinal Delights",
  "compiler": "HashLips Art Engine",
  "copyright": "2025 © Retinal Delights, Inc.",
  "description": "Women's Baseball Card",
  "collection_number": 11,
  "edition": 1,
  "series": "Round the Bases Series"
};

const RULES = {
  "token_id_start": 0,
  "token_id_end": 7776,
  "card_number_start": 1,
  "card_number_end": 7777,
  "naming_pattern": "Satoshe Slugger #<card_number>",
  "image_pattern": "<media_base><token_id>.webp"
};

const MANIFEST = {
  "media_base": {
    "0-1499": "ipfs://QmVgSHzcYzUGSZHNTRTQYjSRG3rbMkGBnzpxfxkpRokiTW/",
    "1500-2999": "ipfs://QmWQg93rPMxCb1PsXtKwbNyXwLuzFBvVzjVcZa7yyS1tX5/",
    "3000-4499": "ipfs://QmU3iXQYtstd4qZaa84C6GZbaJ349Nzia1bw4h9Aq7HYoS/",
    "4500-5999": "ipfs://QmR5KNgVSTAzpz762fdo6sJVjBMSfTJpQhTM3ofWbSAMxR/",
    "6000-7776": "ipfs://QmYNkR9Ysi5k5QaKfCvEhLqTkspNDXasYTXYumbaAoQEQc/"
  }
};

function createOptimizedChunks() {
  if (!fs.existsSync(METADATA_DIR)) {
    process.exit(1);
  }

  if (!fs.existsSync(OPTIMIZED_METADATA_DIR)) {
    fs.mkdirSync(OPTIMIZED_METADATA_DIR, { recursive: true });
  }

  // Get all regular chunk files (250-size)
  const chunkFiles = fs.readdirSync(METADATA_DIR)
    .filter(f => f.startsWith('chunk-') && f.endsWith('.json'))
    .sort((a, b) => {
      const aStart = parseInt(a.match(/chunk-(\d+)-/)?.[1] || '0');
      const bStart = parseInt(b.match(/chunk-(\d+)-/)?.[1] || '0');
      return aStart - bStart;
    });

  let totalSize = 0;
  chunkFiles.forEach((filename) => {
    const inputPath = path.join(METADATA_DIR, filename);
    const outputPath = path.join(OPTIMIZED_METADATA_DIR, filename);
    
    try {
      const regularData = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
      
      // Regular chunks are arrays, convert to optimized format
      const tokens = Array.isArray(regularData) ? regularData : (regularData.tokens || []);
      
      const optimizedData = {
        meta: META,
        rules: RULES,
        manifest: MANIFEST,
        tokens: tokens
      };
      
      const jsonContent = JSON.stringify(optimizedData, null, 0);
      fs.writeFileSync(outputPath, jsonContent, 'utf-8');
      
      const sizeKB = (Buffer.byteLength(jsonContent, 'utf-8') / 1024).toFixed(1);
      totalSize += parseFloat(sizeKB);
    } catch (error) {
      process.exit(1);
    }
  });

  // Create index file
  const index = {};
  for (let i = 0; i < TOTAL_NFTS; i += CHUNK_SIZE) {
    const chunkStart = i;
    const chunkEnd = Math.min(i + CHUNK_SIZE - 1, TOTAL_NFTS - 1);
    const filename = `chunk-${chunkStart}-${chunkEnd}.json`;
    
    for (let tokenId = chunkStart; tokenId <= chunkEnd; tokenId++) {
      index[tokenId] = filename;
    }
  }

  const indexPath = path.join(OPTIMIZED_METADATA_DIR, 'index.json');
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 0), 'utf-8');
}

createOptimizedChunks();

