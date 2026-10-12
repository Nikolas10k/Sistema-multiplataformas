import { db } from "@/lib/db";
import { exigirUsuario } from "@/lib/auth";
import { NOME_SETOR, podeGerirOcorrencias } from "@/lib/permissoes";
import { formatarDataHora } from "@/lib/tempo";
import { urlArquivo } from "@/lib/arquivos";
import { Avisos, CATEGORIAS, SeloPrioridade, SeloStatus } from "@/componentes/ui";
import { acaoAtualizarOcorrencia, acaoRegistrarOcorrencia } from "../acoes";
import type { Setor } from "@prisma/client";

export const dynamic = "force-dynamic";

type Params = Promise<{ ok?: string; erro?: string; status?: string; setor?: string }>;

export default async function PaginaOcorrencias({ searchParams }: { searchParams: Params }) {
  const usuario = await exigirUsuario();
  const params = await searchParams;
  const filtroStatus = params.status ?? "abertas";
  const filtroSetor = params.setor && params.setor in NOME_SETOR ? (params.setor as Setor) : undefined;

  const [ocorrencias, locais] = await Promise.all([
    db.ocorrencia.findMany({
      where: {
        status: filtroStatus === "abertas" ? { in: ["ABERTA", "EM_ANDAMENTO"] } : filtroStatus === "resolvidas" ? "RESOLVIDA" : undefined,
        setor: filtroSetor,
      },
      include: { local: true, registradoPor: { select: { nome: true } }, resolvidaPor: { select: { nome: true } } },
      orderBy: filtroStatus === "abertas" ? [{ prioridade: "desc" }, { criadaEm: "asc" }] : [{ criadaEm: "desc" }],
      take: 100,
    }),
    db.local.findMany({ where: { ativo: true }, orderBy: { ordem: "asc" } }),
  ]);
  const gestor = podeGerirOcorrencias(usuario.papel);

  return (
    <div className="pilha">
      <div className="cabecalho">
        <div>
          <h1>Ocorrências</h1>
          <div className="subtitulo">Prioridade alta e urgente avisam o setor responsável pelo WhatsApp.</div>
        </div>
      </div>
      <Avisos ok={params.ok} erro={params.erro} />

      <details className="cartao">
        <summary style={{ cursor: "pointer", fontWeight: 600 }}>+ Registrar ocorrência</summary>
        <form action={acaoRegistrarOcorrencia} className="formulario" style={{ marginTop: 12 }}>
          <label>
            Título
            <input name="titulo" required maxLength={120} placeholder="Ex.: Lâmpada queimada no corredor" />
          </label>
          <label>
            Descrição
            <textarea name="descricao" required />
          </label>
          <div className="campos">
            <label>
              Categoria
              <select name="categoria" defaultValue="MANUTENCAO">
                {CATEGORIAS.map(([v, n]) => (
                  <option key={v} value={v}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Prioridade
              <select name="prioridade" defaultValue="MEDIA">
                <option value="BAIXA">Baixa</option>
                <option value="MEDIA">Média</option>
                <option value="ALTA">Alta (avisa o setor)</option>
                <option value="URGENTE">Urgente (avisa setor, supervisor e encarregado)</option>
              </select>
            </label>
            <label>
              Setor responsável
              <select name="setor" defaultValue="ADMINISTRACAO">
                {Object.entries(NOME_SETOR).map(([v, n]) => (
                  <option key={v} value={v}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Local
              <select name="local" defaultValue="">
                <option value="">—</option>
                {locais.map((l) => (
                  <option key={l.id} value={l.nome}>
                    {l.nome}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Sala / loja
              <input name="sala" />
            </label>
          </div>
          <div>
            <button type="submit">Registrar</button>
          </div>
        </form>
      </details>

      <form className="linha" method="get">
        <select name="status" defaultValue={filtroStatus} style={{ width: "auto" }}>
          <option value="abertas">Abertas e em andamento</option>
          <option value="resolvidas">Resolvidas</option>
          <option value="todas">Todas</option>
        </select>
        <select name="setor" defaultValue={filtroSetor ?? ""} style={{ width: "auto" }}>
          <option value="">Todos os setores</option>
          {Object.entries(NOME_SETOR).map(([v, n]) => (
            <option key={v} value={v}>
              {n}
            </option>
          ))}
        </select>
        <button type="submit" className="secundario">
          Filtrar
        </button>
      </form>

      {ocorrencias.length === 0 && <p className="suave">Nenhuma ocorrência neste filtro.</p>}
      {ocorrencias.map((o) => {
        const podeAlterar = gestor || o.registradoPorId === usuario.id;
        return (
          <div key={o.id} className="cartao">
            <div className="linha" style={{ justifyContent: "space-between" }}>
              <div className="linha">
                <strong>
                  #{o.id} · {o.titulo}
                </strong>
                <SeloPrioridade p={o.prioridade} />
                <SeloStatus s={o.status} />
              </div>
              <span className="suave">{formatarDataHora(o.criadaEm)}</span>
            </div>
            <p className="suave" style={{ marginTop: 4 }}>
              {NOME_SETOR[o.setor]}
              {o.local && ` · ${o.local.nome}`}
              {o.sala && ` · sala ${o.sala}`} · registrada por {o.registradoPor.nome} ({o.canal === "WHATSAPP" ? "WhatsApp" : "sistema"})
              {o.setorNotificadoEm && ` · setor avisado às ${formatarDataHora(o.setorNotificadoEm)}`}
            </p>
            <p style={{ whiteSpace: "pre-wrap" }}>{o.descricao}</p>
            {o.fotos.length > 0 && (
              <div className="linha">
                {o.fotos.map((f) => (
                  <a key={f} href={urlArquivo(f)} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={urlArquivo(f)} alt="Foto da ocorrência" style={{ height: 90, borderRadius: 6 }} />
                  </a>
                ))}
              </div>
            )}
            {o.resolucao && (
              <p>
                <strong>Resolução:</strong> {o.resolucao}
                {o.resolvidaPor && <span className="suave"> · {o.resolvidaPor.nome}</span>}
              </p>
            )}
            {podeAlterar && o.status !== "RESOLVIDA" && (
              <form action={acaoAtualizarOcorrencia} className="linha" style={{ marginTop: 8 }}>
                <input type="hidden" name="id" value={o.id} />
                <select name="status" defaultValue="RESOLVIDA" style={{ width: "auto" }}>
                  <option value="EM_ANDAMENTO">Em andamento</option>
                  <option value="RESOLVIDA">Resolvida</option>
                </select>
                <input name="resolucao" placeholder="O que foi feito (obrigatório para resolver)" style={{ flex: 1, minWidth: 220 }} />
                <button type="submit" className="pequeno">
                  Atualizar
                </button>
              </form>
            )}
            {podeAlterar && o.status === "RESOLVIDA" && (
              <form action={acaoAtualizarOcorrencia} style={{ marginTop: 8 }}>
                <input type="hidden" name="id" value={o.id} />
                <input type="hidden" name="status" value="ABERTA" />
                <button type="submit" className="secundario pequeno">
                  Reabrir
                </button>
              </form>
            )}
          </div>
        );
      })}
    </div>
  );
}
