import { usuarioAtual } from "@/lib/auth";
import { lerImagem } from "@/lib/arquivos";

export async function GET(_request: Request, ctx: { params: Promise<{ nome: string }> }) {
  if (!(await usuarioAtual())) return new Response("Não autorizado", { status: 401 });
  const { nome } = await ctx.params;
  const arquivo = await lerImagem(nome);
  if (!arquivo) return new Response("Não encontrado", { status: 404 });
  return new Response(new Uint8Array(arquivo.dados), {
    headers: { "Content-Type": arquivo.mimeType, "Cache-Control": "private, max-age=86400" },
  });
}
