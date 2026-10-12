import type { Equipe, Local, Usuario } from "@prisma/client";
import { db } from "@/lib/db";
import { exigirContexto } from "@/lib/auth";
import { NOME_PAPEL } from "@/lib/permissoes";
import { dataDoBanco } from "@/lib/tempo";
import { Avisos, type ParamsAviso } from "@/componentes/ui";
import { acaoCriarEquipe, acaoSalvarEquipe, acaoSalvarLocal, acaoSalvarUsuario } from "../acoes";

export const dynamic = "force-dynamic";

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const TIPOS_LOCAL = {
  RECEPCAO: "Recepção",
  ANDAR: "Andar",
  SUBSOLO: "Subsolo",
  PRACA_ALIMENTACAO: "Praça de alimentação",
  LOJAS: "Lojas",
  AREA_EXTERNA: "Área externa",
  OUTRO: "Outro",
};

function FormUsuario({ u, equipes }: { u?: Usuario; equipes: Equipe[] }) {
  return (
    <form action={acaoSalvarUsuario} className="formulario">
      {u && <input type="hidden" name="id" value={u.id} />}
      <div className="campos">
        <label>
          Nome
          <input name="nome" defaultValue={u?.nome} required />
        </label>
        <label>
          Login
          <input name="login" defaultValue={u?.login} required autoComplete="off" />
        </label>
        <label>
          {u ? "Nova senha (deixe vazio para manter)" : "Senha"}
          <input name="senha" type="password" autoComplete="new-password" minLength={8} required={!u} />
        </label>
        <label>
          Função
          <select name="papel" defaultValue={u?.papel ?? "PORTEIRO"}>
            {Object.entries(NOME_PAPEL).map(([v, n]) => (
              <option key={v} value={v}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label>
          WhatsApp (com DDD)
          <input name="telefone" defaultValue={u?.telefone ?? ""} placeholder="11 99999-8888" />
        </label>
        <label>
          Equipe (portaria)
          <select name="equipeId" defaultValue={u?.equipeId ?? ""}>
            <option value="">—</option>
            {equipes.map((e) => (
              <option key={e.id} value={e.id}>
                Equipe {e.nome}
              </option>
            ))}
          </select>
        </label>
        <label>
          Entrada (recepção)
          <input name="horaInicio" type="time" defaultValue={u?.horaInicio ?? ""} />
        </label>
        <label>
          Saída (recepção)
          <input name="horaFim" type="time" defaultValue={u?.horaFim ?? ""} />
        </label>
        <label>
          Folga semanal (6x1)
          <select name="diaFolga" defaultValue={u?.diaFolga?.toString() ?? ""}>
            <option value="">—</option>
            {DIAS.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="checkbox">
        <input type="checkbox" name="ativo" defaultChecked={u?.ativo ?? true} /> Ativo
      </label>
      <div>
        <button type="submit" className="pequeno">
          {u ? "Salvar" : "Criar usuário"}
        </button>
      </div>
    </form>
  );
}

function FormLocal({ l }: { l?: Local }) {
  return (
    <form action={acaoSalvarLocal} className="linha">
      {l && <input type="hidden" name="id" value={l.id} />}
      <input name="nome" defaultValue={l?.nome} placeholder="Nome" required style={{ width: 200 }} />
      <select name="tipo" defaultValue={l?.tipo ?? "ANDAR"} style={{ width: 170 }}>
        {Object.entries(TIPOS_LOCAL).map(([v, n]) => (
          <option key={v} value={v}>
            {n}
          </option>
        ))}
      </select>
      <input name="ordem" type="number" defaultValue={l?.ordem ?? 0} title="Ordem" style={{ width: 80 }} />
      <input
        name="intervaloRondaMin"
        type="number"
        min={15}
        defaultValue={l?.intervaloRondaMin ?? ""}
        placeholder="Ronda a cada (min)"
        style={{ width: 170 }}
      />
      <label className="checkbox">
        <input type="checkbox" name="exigeRonda" defaultChecked={l?.exigeRonda ?? true} /> ronda
      </label>
      <label className="checkbox">
        <input type="checkbox" name="ativo" defaultChecked={l?.ativo ?? true} /> ativo
      </label>
      <button type="submit" className="pequeno secundario">
        {l ? "Salvar" : "Adicionar"}
      </button>
    </form>
  );
}

export default async function PaginaAdmin({ searchParams }: { searchParams: ParamsAviso }) {
  const { condominio } = await exigirContexto({ papeis: ["TI_ADMIN", "ADMINISTRACAO", "SINDICA"] });
  const params = await searchParams;
  const cid = condominio.id;
  const [usuarios, equipes, locais, plano] = await Promise.all([
    db.usuario.findMany({
      where: { condominioId: cid },
      orderBy: [{ ativo: "desc" }, { papel: "asc" }, { nome: "asc" }],
      include: { equipe: true },
    }),
    db.equipe.findMany({ where: { condominioId: cid }, orderBy: { nome: "asc" } }),
    db.local.findMany({ where: { condominioId: cid }, orderBy: { ordem: "asc" } }),
    condominio.planoId ? db.plano.findUnique({ where: { id: condominio.planoId } }) : null,
  ]);
  const ativos = usuarios.filter((u) => u.ativo).length;

  return (
    <div className="pilha">
      <div className="cabecalho">
        <div>
          <h1>Equipe e locais</h1>
          <div className="subtitulo">
            Pessoas, escalas e locais do prédio. O WhatsApp cadastrado é o que o agente reconhece.
            {plano?.maxUsuarios ? ` Usuários ativos: ${ativos} de ${plano.maxUsuarios} do plano ${plano.nome}.` : ""}
          </div>
        </div>
      </div>
      <Avisos ok={params.ok} erro={params.erro} />

      <div className="cartao">
        <h2>Escalas 12x36 da portaria</h2>
        <p className="suave">
          Informe um dia em que cada equipe trabalhou. O sistema calcula os plantões seguintes alternando os dias.
        </p>
        {equipes.map((e) => (
          <form key={e.id} action={acaoSalvarEquipe} className="linha" style={{ marginBottom: 8 }}>
            <input type="hidden" name="id" value={e.id} />
            <strong style={{ width: 90 }}>Equipe {e.nome}</strong>
            <select name="turno" defaultValue={e.turno} style={{ width: 170 }}>
              <option value="DIA">Dia (07h–19h)</option>
              <option value="NOITE">Noite (19h–07h)</option>
            </select>
            <input type="date" name="dataReferencia" defaultValue={dataDoBanco(e.dataReferencia)} style={{ width: 170 }} required />
            <button type="submit" className="pequeno secundario">
              Salvar
            </button>
          </form>
        ))}
        <form action={acaoCriarEquipe} className="linha" style={{ marginTop: 12, borderTop: "1px solid var(--borda)", paddingTop: 12 }}>
          <input name="nome" placeholder="Nova equipe (ex.: E)" style={{ width: 160 }} required maxLength={20} />
          <select name="turno" defaultValue="DIA" style={{ width: 170 }}>
            <option value="DIA">Dia</option>
            <option value="NOITE">Noite</option>
          </select>
          <input type="date" name="dataReferencia" style={{ width: 170 }} required />
          <button type="submit" className="pequeno secundario">
            Adicionar equipe
          </button>
        </form>
      </div>

      <div className="cartao">
        <h2>Usuários</h2>
        <details style={{ marginBottom: 16 }}>
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>+ Novo usuário</summary>
          <div style={{ marginTop: 12 }}>
            <FormUsuario equipes={equipes} />
          </div>
        </details>
        {usuarios.map((u) => (
          <details key={u.id} style={{ borderTop: "1px solid var(--borda)", padding: "8px 0" }}>
            <summary style={{ cursor: "pointer" }}>
              <strong>{u.nome}</strong> · {NOME_PAPEL[u.papel]}
              {u.equipe && ` · Equipe ${u.equipe.nome}`}
              {u.horaInicio && ` · ${u.horaInicio}–${u.horaFim}`}
              {u.telefone ? " · 📱" : ""}
              {!u.ativo && " · (inativo)"}
            </summary>
            <div style={{ marginTop: 12 }}>
              <FormUsuario u={u} equipes={equipes} />
            </div>
          </details>
        ))}
      </div>

      <div className="cartao">
        <h2>Locais</h2>
        <p className="suave">
          Deixe o intervalo vazio para exigir uma ronda por plantão. Com intervalo, o encarregado recebe alerta de ronda atrasada.
        </p>
        <div className="pilha" style={{ gap: 8 }}>
          {locais.map((l) => (
            <FormLocal key={l.id} l={l} />
          ))}
          <div style={{ borderTop: "1px solid var(--borda)", paddingTop: 12 }}>
            <FormLocal />
          </div>
        </div>
      </div>
    </div>
  );
}
