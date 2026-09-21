import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return new NextResponse(null, { status: 404 });
  if (pathname === '/api/admin' || pathname.startsWith('/api/admin/')) return new NextResponse(null, { status: 404 });
  return NextResponse.next();
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
