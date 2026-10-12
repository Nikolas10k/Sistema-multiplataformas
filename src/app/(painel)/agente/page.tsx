import { exigirUsuario } from "@/lib/auth";
import { historicoVisivel } from "@/lib/agente/executar";
import { nomeTurno, plantaoEm } from "@/lib/tempo";
import { Chat } from "./Chat";

export const dynamic = "force-dynamic";

export default async function PaginaAgente() {
  const usuario = await exigirUsuario();
  const historico = await historicoVisivel(usuario, "WEB");
  return (
    <div>
      <div className="cabecalho">
        <div>
          <h1>Agente operacional</h1>
          <div className="subtitulo">
            Converse em linguagem natural: registre rondas, ocorrências, visitantes e pedidos de apoio, ou peça a passagem de
            turno. A conversa recomeça a cada plantão ({nomeTurno(plantaoEm().turno)}).
          </div>
        </div>
      </div>
      <Chat inicial={historico.map((m) => ({ role: m.role, texto: m.texto }))} />
    </div>
  );
}
