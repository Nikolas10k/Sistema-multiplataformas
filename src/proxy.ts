import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Só confere se há sessão válida do tipo certo; permissões e status do condomínio
// são verificados em cada página e ação.
export async function proxy(request: NextRequest) {
  const area = request.nextUrl.pathname.startsWith("/plataforma") ? "admin" : "usuario";
  const token = request.cookies.get("sessao")?.value;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.SESSION_SECRET));
      if (payload.tipo === area) return NextResponse.next();
    } catch {
      // sessão expirada ou inválida
    }
  }
  return NextResponse.redirect(new URL(area === "admin" ? "/plataforma/login" : "/login", request.url));
}

export const config = {
  matcher: [
    "/((?!login|cadastro|termos|plataforma/login|api/whatsapp|api/asaas|api/saude|api/arquivos|_next/static|_next/image|favicon.ico|icon.svg).*)",
  ],
};
