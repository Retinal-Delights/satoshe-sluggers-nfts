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
      // Only log unexpected database errors
      if (!error.message?.includes('connection') && !error.code?.includes('ECONN')) {
        console.error('[Favorites API] Database error deleting:', error.message || error);
      }
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
    // Only log actual unexpected errors (not connection issues)
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (!errorMsg.includes('connection') && !errorMsg.includes('ECONN')) {
      console.error('[Favorites API] DELETE error:', errorMsg);
    }
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

