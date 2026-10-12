import { after, type NextRequest } from "next/server";
import { Prisma, type Condominio } from "@prisma/client";
import { db } from "@/lib/db";
import { contextoDe } from "@/lib/auth";
import { conversar, type ImagemRecebida } from "@/lib/agente/executar";
import { salvarImagem, TIPOS_IMAGEM_ACEITOS } from "@/lib/arquivos";
import { situacaoAcesso } from "@/lib/condominio";
import {
  assinaturaValida,
  baixarMidia,
  contaDoCondominio,
  enviarTexto,
  marcarComoLida,
  variantesTelefone,
  type ContaWhatsapp,
} from "@/lib/whatsapp";

export const maxDuration = 300;

type MensagemWhatsapp = {
  id: string;
  from: string;
  type: string;
  text?: { body: string };
  image?: { id: string; caption?: string };
};

type CorpoWebhook = {
  entry?: { changes?: { value?: { metadata?: { phone_number_id?: string }; messages?: MensagemWhatsapp[] } }[] }[];
};

// Verificação do webhook feita pela Meta ao configurar o app.
export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const token = process.env.WHATSAPP_VERIFY_TOKEN;
  if (token && p.get("hub.mode") === "subscribe" && p.get("hub.verify_token") === token) {
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

  for (const entrada of corpo.entry ?? []) {
    for (const mudanca of entrada.changes ?? []) {
      const valor = mudanca.value;
      const numeroId = valor?.metadata?.phone_number_id;
      if (!numeroId || !valor?.messages?.length) continue;
      // O número que recebeu a mensagem identifica o condomínio.
      const condominio = await db.condominio.findUnique({ where: { whatsappPhoneNumberId: numeroId } });
      if (!condominio) {
        console.warn("[whatsapp] mensagem para número sem condomínio:", numeroId);
        continue;
      }
      for (const m of valor.messages) {
        // A Meta reenvia o webhook se demorarmos; processa cada mensagem uma vez só.
        try {
          await db.whatsappMensagemProcessada.create({ data: { id: m.id } });
        } catch (e) {
          if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue;
          throw e;
        }
        // Responde 200 na hora e processa depois (o agente pode levar alguns segundos).
        after(() => processar(condominio, m).catch((e) => console.error("[whatsapp] erro ao processar", m.id, e)));
      }
    }
  }
  return new Response("ok", { status: 200 });
}

async function processar(condominio: Condominio, m: MensagemWhatsapp) {
  let conta: ContaWhatsapp | null;
  try {
    conta = contaDoCondominio(condominio);
  } catch (e) {
    console.error("[whatsapp] token do condomínio ilegível", condominio.id, e);
    return;
  }
  const usuario = await db.usuario.findFirst({
    where: { condominioId: condominio.id, telefone: { in: variantesTelefone(m.from) }, ativo: true },
    include: { condominio: true },
  });
  if (!usuario) {
    await enviarTexto(conta, m.from, "Este número não está cadastrado no sistema do condomínio. Peça à administração para cadastrar seu WhatsApp.");
    return;
  }
  if (!situacaoAcesso(condominio).liberado) {
    await enviarTexto(conta, m.from, "O sistema do condomínio está temporariamente indisponível. Registre as ocorrências no livro e avise a administração.");
    return;
  }
  await marcarComoLida(conta, m.id);

  let texto = "";
  const imagens: ImagemRecebida[] = [];
  if (m.type === "text" && m.text) {
    texto = m.text.body.slice(0, 4000);
  } else if (m.type === "image" && m.image && conta) {
    const midia = await baixarMidia(conta, m.image.id);
    if (!TIPOS_IMAGEM_ACEITOS.includes(midia.mimeType)) {
      await enviarTexto(conta, m.from, "Não consegui abrir essa imagem. Envie como foto (JPG ou PNG).");
      return;
    }
    const arquivo = await salvarImagem(condominio.id, midia.dados, midia.mimeType);
    imagens.push({ arquivo, mimeType: midia.mimeType as ImagemRecebida["mimeType"], base64: midia.dados.toString("base64") });
    texto = m.image.caption ?? "";
  } else if (m.type === "audio") {
    await enviarTexto(conta, m.from, "Ainda não consigo ouvir áudios. Pode mandar por escrito?");
    return;
  } else {
    await enviarTexto(conta, m.from, "Por enquanto entendo texto e fotos.");
    return;
  }

  try {
    const resposta = await conversar(contextoDe(usuario), "WHATSAPP", { texto, imagens });
    await enviarTexto(conta, m.from, resposta);
  } catch (e) {
    console.error("[whatsapp] agente falhou", e);
    await enviarTexto(conta, m.from, "Tive um problema para processar agora. Tente de novo em instantes ou registre pela recepção.");
  }
}
