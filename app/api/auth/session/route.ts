// app/api/auth/session/route.ts
// Session management for SIWE authentication

import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE_NAME = 'siwe-session';

interface SIWESession {
  address: string;
  issuedAt: number;
  expiresAt: number;
}

/**
 * Check if user is logged in (has valid session)
 */
export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionToken) {
      return NextResponse.json({ isLoggedIn: false });
    }

    try {
      // Decode session (in production, use proper JWT verification)
      const session: SIWESession = JSON.parse(
        Buffer.from(sessionToken, 'base64url').toString()
      );

      // Check expiration
      if (session.expiresAt < Date.now()) {
        // Session expired, clear cookie
        const response = NextResponse.json({ isLoggedIn: false });
        response.cookies.delete(SESSION_COOKIE_NAME);
        return response;
      }

      return NextResponse.json({
        isLoggedIn: true,
        address: session.address,
      });
    } catch {
      // Invalid session token
      const response = NextResponse.json({ isLoggedIn: false });
      response.cookies.delete(SESSION_COOKIE_NAME);
      return response;
    }
  } catch (error) {
    // Error checking session - return not logged in
    return NextResponse.json({ isLoggedIn: false });
  }
}

/**
 * Logout (clear session)
 */
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}

