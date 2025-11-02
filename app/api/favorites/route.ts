// app/api/favorites/route.ts
// API route for managing favorites (GET and POST)
// Uses wallet address directly (no authentication required for favorites storage)

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { ethers } from 'ethers';

/**
 * Validate Ethereum address format
 */
function isValidAddress(address: string): boolean {
  try {
    return ethers.isAddress(address);
  } catch {
    return false;
  }
}

// GET /api/favorites?walletAddress=0x... - Get all favorites for wallet
export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.nextUrl.searchParams.get('walletAddress');
    
    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Missing walletAddress parameter' },
        { status: 400 }
      );
    }

    // Validate address format
    const normalizedAddress = walletAddress.toLowerCase();
    if (!isValidAddress(normalizedAddress)) {
      return NextResponse.json(
        { success: false, error: 'Invalid wallet address format' },
        { status: 400 }
      );
    }

    // Query favorites from database
    const { data: favorites, error } = await supabaseServer
      .from('favorites')
      .select('*')
      .eq('wallet_address', normalizedAddress)
      .order('added_at', { ascending: false });

    if (error) {
      // Database error - return error response
      return NextResponse.json(
        { success: false, error: 'Failed to fetch favorites' },
        { status: 500 }
      );
    }

    // Transform database format to API format
    const formattedFavorites = (favorites || []).map((fav) => ({
      tokenId: fav.token_id,
      name: fav.name,
      image: fav.image,
      rarity: fav.rarity,
      rank: fav.rank,
      rarityPercent: fav.rarity_percent,
      addedAt: fav.added_at,
    }));

    return NextResponse.json({
      success: true,
      favorites: formattedFavorites,
    });
  } catch (error) {
    // Internal server error - return error response
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/favorites - Add a favorite
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      walletAddress,
      tokenId,
      name,
      image,
      rarity,
      rank,
      rarityPercent,
    } = body;

    // Validate wallet address
    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: walletAddress' },
        { status: 400 }
      );
    }

    const normalizedAddress = walletAddress.toLowerCase();
    if (!isValidAddress(normalizedAddress)) {
      return NextResponse.json(
        { success: false, error: 'Invalid wallet address format' },
        { status: 400 }
      );
    }

    // Validate required parameters
    if (!tokenId || !name) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: tokenId and name are required' },
        { status: 400 }
      );
    }

    // Check if favorite already exists
    const { data: existing } = await supabaseServer
      .from('favorites')
      .select('id')
      .eq('wallet_address', normalizedAddress)
      .eq('token_id', tokenId)
      .single();

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'NFT is already favorited' },
        { status: 409 }
      );
    }

    // Insert new favorite
    const { data, error } = await supabaseServer
      .from('favorites')
      .insert({
        wallet_address: normalizedAddress,
        token_id: tokenId.toString(),
        name: name || `Satoshe Slugger #${parseInt(tokenId) + 1}`,
        image: image || '/nfts/placeholder-nft.webp',
        rarity: rarity || 'Unknown',
        rank: rank?.toString() || '—',
        rarity_percent: rarityPercent?.toString() || '—',
      })
      .select()
      .single();

    if (error) {
      // Handle unique constraint violation (race condition)
      if (error.code === '23505') {
        return NextResponse.json(
          { success: false, error: 'NFT is already favorited' },
          { status: 409 }
        );
      }
      // Database error - return error response
      return NextResponse.json(
        { success: false, error: 'Failed to add favorite' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      favorite: {
        tokenId: data.token_id,
        name: data.name,
        image: data.image,
        rarity: data.rarity,
        rank: data.rank,
        rarityPercent: data.rarity_percent,
        addedAt: data.added_at,
      },
    });
  } catch (error) {
    // Internal server error - return error response
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

