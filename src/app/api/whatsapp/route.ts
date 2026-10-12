import { after, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { conversar, type ImagemRecebida } from "@/lib/agente/executar";
import { salvarImagem, TIPOS_IMAGEM_ACEITOS } from "@/lib/arquivos";
import { assinaturaValida, baixarMidia, enviarTexto, marcarComoLida, variantesTelefone } from "@/lib/whatsapp";

export const maxDuration = 300;

type MensagemWhatsapp = {
  id: string;
  from: string;
  type: string;
  text?: { body: string };
  image?: { id: string; caption?: string };
};

type CorpoWebhook = {
  entry?: { changes?: { value?: { messages?: MensagemWhatsapp[] } }[] }[];
};

// Verificação do webhook feita pela Meta ao configurar o app.
export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  if (p.get("hub.mode") === "subscribe" && p.get("hub.verify_token") === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(p.get("hub.challenge") ?? "", { status: 200 });
  }
  return new Response("Token de verificação inválido", { status: 403 });
}

export async function POST(request: NextRequest) {
  const corpoBruto = await request.text();
  if (!assinaturaValida(corpoBruto, request.headers.get("x-hub-signature-256"))) {
    return new Response("Assinatura inválida", { status: 401 });
  }

  let corpo: CorpoWebhook;
  try {
    corpo = JSON.parse(corpoBruto);
  } catch {
    return new Response("JSON inválido", { status: 400 });
  }

  const mensagens = corpo.entry?.flatMap((e) => e.changes?.flatMap((c) => c.value?.messages ?? []) ?? []) ?? [];
  for (const m of mensagens) {
    // A Meta reenvia o webhook se demorarmos; processa cada mensagem uma vez só.
    try {
      await db.whatsappMensagemProcessada.create({ data: { id: m.id } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue;
      throw e;
    }
    // Responde 200 na hora e processa depois (o agente pode levar alguns segundos).
    after(() => processar(m).catch((e) => console.error("[whatsapp] erro ao processar", m.id, e)));
  }
  return new Response("ok", { status: 200 });
}

async function processar(m: MensagemWhatsapp) {
  const usuario = await db.usuario.findFirst({
    where: { telefone: { in: variantesTelefone(m.from) }, ativo: true },
  });
  if (!usuario) {
    await enviarTexto(m.from, "Este número não está cadastrado no sistema do condomínio. Peça à TI para cadastrar seu WhatsApp.");
    return;
  }
  await marcarComoLida(m.id);

  let texto = "";
  const imagens: ImagemRecebida[] = [];
  if (m.type === "text" && m.text) {
    texto = m.text.body;
  } else if (m.type === "image" && m.image) {
    const midia = await baixarMidia(m.image.id);
    if (!TIPOS_IMAGEM_ACEITOS.includes(midia.mimeType)) {
      await enviarTexto(m.from, "Não consegui abrir essa imagem. Envie como foto (JPG ou PNG).");
      return;
    }
    const arquivo = await salvarImagem(midia.dados, midia.mimeType);
    imagens.push({ arquivo, mimeType: midia.mimeType as ImagemRecebida["mimeType"], base64: midia.dados.toString("base64") });
    texto = m.image.caption ?? "";
  } else if (m.type === "audio") {
    await enviarTexto(m.from, "Ainda não consigo ouvir áudios. Pode mandar por escrito?");
    return;
  } else {
    await enviarTexto(m.from, "Por enquanto entendo texto e fotos.");
    return;
  }

  try {
    const resposta = await conversar(usuario, "WHATSAPP", { texto, imagens });
    await enviarTexto(m.from, resposta);
  } catch (e) {
    console.error("[whatsapp] agente falhou", e);
    await enviarTexto(m.from, "Tive um problema para processar agora. Tente de novo em instantes ou registre pela recepção.");
  }
}
