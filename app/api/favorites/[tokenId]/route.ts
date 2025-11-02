// app/api/favorites/[tokenId]/route.ts
// API route for deleting a specific favorite
// Uses wallet address directly (no authentication required)

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

// DELETE /api/favorites/[tokenId]?walletAddress=0x... - Remove a favorite
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  try {
    const walletAddress = request.nextUrl.searchParams.get('walletAddress');
    const { tokenId } = await params;

    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Missing walletAddress parameter' },
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

    if (!tokenId) {
      return NextResponse.json(
        { success: false, error: 'Missing tokenId parameter' },
        { status: 400 }
      );
    }

    // Delete the favorite
    const { error } = await supabaseServer
      .from('favorites')
      .delete()
      .eq('wallet_address', normalizedAddress)
      .eq('token_id', tokenId);

    if (error) {
      // Database error - return error response
      return NextResponse.json(
        { success: false, error: 'Failed to remove favorite' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Favorite removed successfully',
    });
  } catch (error) {
    // Internal server error - return error response
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

