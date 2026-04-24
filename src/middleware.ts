import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Rotas públicas
  if (path === '/' || path.startsWith('/_next') || path.startsWith('/favicon')) {
    return NextResponse.next();
  }

  // Verificar Cookies
  const role = request.cookies.get('user_role')?.value;

  // Se não tem role, manda pro login
  if (!role) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Regras de Permissão (Role Based Access Control)
  if (path.startsWith('/admin')) {
    const allowedRoles = ['ADMIN', 'PLATFORM_ADMIN', 'PHYSIOTHERAPIST', 'MANAGER'];
    if (!allowedRoles.includes(role)) {
      if (role === 'WAITER') return NextResponse.redirect(new URL('/comanda', request.url));
      if (role === 'CASHIER') return NextResponse.redirect(new URL('/pdv', request.url));
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  if (path.startsWith('/pdv')) {
    const allowedRoles = ['ADMIN', 'CASHIER', 'MANAGER'];
    if (!allowedRoles.includes(role)) {
      if (role === 'WAITER') return NextResponse.redirect(new URL('/comanda', request.url));
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  if (path.startsWith('/comanda')) {
    const allowedRoles = ['ADMIN', 'WAITER', 'MANAGER'];
    if (!allowedRoles.includes(role)) {
      if (role === 'CASHIER') return NextResponse.redirect(new URL('/pdv', request.url));
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
