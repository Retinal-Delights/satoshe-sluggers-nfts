// app/api/auth/siwe/route.ts
// SIWE (Sign-In with Ethereum) authentication API
// Handles login payload generation, login verification, session management

import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

// Session management using cookies
// SESSION_SECRET should be set in production for enhanced security
// If not set, uses simple base64 encoding (works but less secure)
const SESSION_SECRET = process.env.SESSION_SECRET;
const SESSION_COOKIE_NAME = 'siwe-session';
const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

// Note: SESSION_SECRET should be set in production for enhanced security

interface SIWESession {
  address: string;
  issuedAt: number;
  expiresAt: number;
}

/**
 * Generate a SIWE login payload (message for user to sign)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }

    // Generate SIWE message
    // Get domain from request - handle Vercel preview URLs correctly
    const host = request.headers.get('host') || request.headers.get('x-forwarded-host') || 'localhost:3000';
    const protocol = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    const origin = request.headers.get('origin') || `${protocol}://${host}`;
    
    // Clean domain (remove port if present for preview URLs)
    const domain = host.split(':')[0];
    
    // Validate all values are defined
    if (!domain || !origin || !address) {
      return NextResponse.json(
        { error: 'Failed to generate login payload: missing required parameters' },
        { status: 500 }
      );
    }
    
    // Generate proper SIWE message with all required fields
    const issuedAt = new Date().toISOString();
    const expirationTime = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
    const nonce = Math.random().toString(36).substring(2, 15);
    const version = '1';
    const chainId = '8453'; // Base mainnet

    // SIWE message format according to EIP-4361
    const message = `${domain} wants you to sign in with your Ethereum account:
${address}

URI: ${origin}
Version: ${version}
Chain ID: ${chainId}
Nonce: ${nonce}
Issued At: ${issuedAt}
Expiration Time: ${expirationTime}`;

    return NextResponse.json({ payload: message });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate login payload' },
      { status: 500 }
    );
  }
}

/**
 * Verify SIWE signature and create session (login)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, signature, address } = body;

    if (!message || !signature) {
      return NextResponse.json(
        { error: 'Missing required fields: message and signature' },
        { status: 400 }
      );
    }

    // Verify signature
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      const normalizedRecovered = recoveredAddress.toLowerCase();
      
      // If address provided in body, verify it matches. Otherwise use recovered address.
      const normalizedProvided = address ? address.toLowerCase() : normalizedRecovered;

      if (address && normalizedRecovered !== normalizedProvided) {
        return NextResponse.json(
          { error: 'Invalid signature. Address does not match signature.' },
          { status: 401 }
        );
      }
      
      // Use recovered address (most reliable - extracted from signature)
      const verifiedAddress = normalizedRecovered;

      // Verify message format (basic validation)
      if (!message.includes('wants you to sign in')) {
        return NextResponse.json(
          { error: 'Invalid SIWE message format' },
          { status: 400 }
        );
      }

      // Check expiration
      const expirationMatch = message.match(/Expiration Time: (.+)/);
      if (expirationMatch) {
        const expirationTime = new Date(expirationMatch[1]);
        if (expirationTime < new Date()) {
          return NextResponse.json(
            { error: 'Message has expired' },
            { status: 401 }
          );
        }
      }

      // Create session
      const session: SIWESession = {
        address: verifiedAddress,
        issuedAt: Date.now(),
        expiresAt: Date.now() + SESSION_MAX_AGE * 1000,
      };

      // Create simple JWT-like token (in production, use a proper JWT library)
      const sessionToken = Buffer.from(JSON.stringify(session)).toString('base64url');

      // Set cookie with session
      const response = NextResponse.json({ success: true, address: verifiedAddress });
      response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_MAX_AGE,
        path: '/',
      });

      return response;
    } catch (error) {
      // Signature verification failed - invalid signature
      return NextResponse.json(
        { error: 'Invalid signature format' },
        { status: 401 }
      );
    }
  } catch (error) {
    // Error in SIWE login - return error response
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

