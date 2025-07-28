
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// This middleware is commented out because the AuthProvider now handles redirection.
// You can uncomment and adapt this if you prefer middleware-based protection.

/*
export function middleware(request: NextRequest) {
  // Simple check for a hypothetical session token (replace with your actual auth logic)
  const sessionToken = request.cookies.get('session_token')?.value; // Example cookie name

  const { pathname } = request.nextUrl;

  // If trying to access protected routes without a token, redirect to login
  if (!sessionToken && pathname !== '/login') {
    console.log(`Middleware: No session token, redirecting from ${pathname} to /login`);
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If logged in and trying to access login page, redirect to dashboard
  if (sessionToken && pathname === '/login') {
     console.log(`Middleware: Has session token, redirecting from /login to /`);
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Allow the request to continue
  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    // Apply middleware to all routes except static files and API routes
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
*/

// If using AuthProvider for client-side checks, this middleware might not be necessary.
// You can keep it empty or remove the file if relying solely on the client-side provider.
export function middleware(request: NextRequest) {
  // No operation, relying on AuthProvider for now.
  return NextResponse.next();
}

export const config = {
    matcher: '/:path*', // Minimal matcher if no middleware logic is active
};
