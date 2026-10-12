import { contextoAtual } from "@/lib/auth";
import { lerImagem } from "@/lib/arquivos";

export async function GET(_request: Request, ctx: { params: Promise<{ nome: string }> }) {
  const sessao = await contextoAtual();
  if (!sessao) return new Response("Não autorizado", { status: 401 });
  const { nome } = await ctx.params;
  const arquivo = await lerImagem(sessao.condominio.id, nome);
  if (!arquivo) return new Response("Não encontrado", { status: 404 });
  return new Response(new Uint8Array(arquivo.dados), {
    headers: { "Content-Type": arquivo.mimeType, "Cache-Control": "private, max-age=86400", "X-Content-Type-Options": "nosniff" },
  });
}
