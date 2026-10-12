import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Só confere se há sessão válida; as permissões por papel são verificadas em cada página/ação.
export async function proxy(request: NextRequest) {
  const token = request.cookies.get("sessao")?.value;
  if (token) {
    try {
      await jwtVerify(token, new TextEncoder().encode(process.env.SESSION_SECRET));
      return NextResponse.next();
    } catch {
      // sessão expirada ou inválida
    }
  }
  const login = new URL("/login", request.url);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!login|api/whatsapp|api/arquivos|_next/static|_next/image|favicon.ico).*)"],
};
