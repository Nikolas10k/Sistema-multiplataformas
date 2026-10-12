import { exigirContexto } from "@/lib/auth";
import { podeAdministrarSistema } from "@/lib/permissoes";
import { FUSOS } from "@/lib/tempo";
import { redirect } from "next/navigation";
import { Avisos } from "@/componentes/ui";
import { salvarCondominio, salvarWhatsapp } from "./acoes";

export const dynamic = "force-dynamic";

type Params = Promise<{ ok?: string; erro?: string; bemvindo?: string }>;

export default async function PaginaConfiguracoes({ searchParams }: { searchParams: Params }) {
  const { usuario, condominio: c } = await exigirContexto({ permitirBloqueado: true });
  if (!podeAdministrarSistema(usuario.papel)) redirect("/");
  const params = await searchParams;
  const urlWebhook = `${process.env.URL_PUBLICA ?? "https://SEU-DOMINIO"}/api/whatsapp`;

  return (
    <div className="pilha">
      <div className="cabecalho">
        <div>
          <h1>Configurações</h1>
          <div className="subtitulo">Dados do condomínio, perfil usado pelo agente, turnos e WhatsApp.</div>
        </div>
      </div>
      {params.bemvindo && (
        <div className="aviso info">
          <strong>Bem-vindo!</strong> Seu condomínio foi criado. Próximos passos: revise o perfil do prédio abaixo, cadastre a
          equipe em <a href="/admin">Equipe e locais</a> (com o WhatsApp de cada pessoa) e conecte o número de WhatsApp do
          condomínio.
        </div>
      )}
      <Avisos ok={params.ok} erro={params.erro} />

      <form action={salvarCondominio} className="cartao formulario">
        <h2>Condomínio</h2>
        <div className="campos">
          <label>
            Nome
            <input name="nome" defaultValue={c.nome} required />
          </label>
          <label>
            Tipo
            <select name="tipo" defaultValue={c.tipo}>
              <option value="COMERCIAL">Comercial</option>
              <option value="RESIDENCIAL">Residencial</option>
              <option value="MISTO">Misto</option>
            </select>
          </label>
          <label>
            Fuso horário
            <select name="fuso" defaultValue={c.fuso}>
              {Object.entries(FUSOS).map(([id, f]) => (
                <option key={id} value={id}>
                  {f.nome}
                </option>
              ))}
            </select>
          </label>
          <label>
            Início do turno do dia
            <input name="horaInicioDia" type="time" defaultValue={c.horaInicioDia} required />
          </label>
          <label>
            Início do turno da noite
            <input name="horaInicioNoite" type="time" defaultValue={c.horaInicioNoite} required />
          </label>
          <label>
            CPF/CNPJ para cobrança
            <input name="cpfCnpj" defaultValue={c.cpfCnpjCobranca ?? ""} inputMode="numeric" />
          </label>
        </div>
        <label>
          Perfil do prédio (o agente lê isto em toda conversa)
          <textarea
            name="perfil"
            defaultValue={c.perfil}
            rows={10}
            placeholder="Estrutura do prédio, equipes, horários de funcionamento, sistema de controle de acesso, regras da casa…"
          />
        </label>
        <p className="suave">
          Descreva estrutura, equipes, horários de funcionamento de áreas comuns, o sistema de controle de acesso usado e regras
          da casa. Quanto mais claro, melhor o agente entende as mensagens da equipe.
        </p>
        <div>
          <button type="submit">Salvar</button>
        </div>
      </form>

      <div className="cartao">
        <h2>WhatsApp do condomínio</h2>
        {c.whatsappPhoneNumberId ? (
          <p>
            <span className="selo ok">Conectado</span> {c.whatsappNumeroExibicao ?? ""}{" "}
            <span className="suave">(Phone Number ID {c.whatsappPhoneNumberId})</span>
          </p>
        ) : (
          <p>
            <span className="selo alerta">Não conectado</span> Sem número conectado, o agente funciona só pela tela e os avisos
            automáticos não são enviados.
          </p>
        )}
        <details style={{ margin: "8px 0 12px" }}>
          <summary style={{ cursor: "pointer" }}>Como conectar</summary>
          <ol className="suave">
            <li>
              Tenha um número dedicado ao condomínio, registrado na WhatsApp Business Platform (Meta) e ligado ao app da
              plataforma.
            </li>
            <li>No painel da Meta, copie o Phone Number ID do número e gere um token de acesso permanente.</li>
            <li>
              O webhook do app aponta para <code>{urlWebhook}</code>. Ele é o mesmo para todos os condomínios; o número que recebe a
              mensagem identifica o condomínio.
            </li>
          </ol>
        </details>
        <form action={salvarWhatsapp} className="formulario">
          <div className="campos">
            <label>
              Phone Number ID
              <input name="phoneNumberId" defaultValue={c.whatsappPhoneNumberId ?? ""} inputMode="numeric" required />
            </label>
            <label>
              Token de acesso {c.whatsappTokenCripto ? "(deixe vazio para manter o atual)" : ""}
              <input name="token" type="password" autoComplete="off" />
            </label>
          </div>
          <div className="linha">
            <button type="submit">Testar e salvar</button>
          </div>
        </form>
        {c.whatsappPhoneNumberId && (
          <form action={salvarWhatsapp} style={{ marginTop: 8 }}>
            <input type="hidden" name="remover" value="1" />
            <button type="submit" className="secundario pequeno">
              Desconectar
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
