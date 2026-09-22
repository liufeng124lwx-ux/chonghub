import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const allowed = pathname === '/' || pathname === '/login' || pathname.startsWith('/admin') || pathname === '/healthz' || pathname === '/readyz' || pathname.startsWith('/api/admin');
  if (!allowed) return new NextResponse(null, { status: 404 });
  return NextResponse.next();
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
