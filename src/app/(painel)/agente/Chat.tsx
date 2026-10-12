"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { acaoEnviarAoAgente } from "../acoes";

type Mensagem = { role: "user" | "assistant"; texto: string };

const SUGESTOES = [
  "Como está a escala agora?",
  "Quais rondas faltam neste plantão?",
  "Visitante João Silva para a sala 1204, já cadastrado no Invenzi",
  "Gere a passagem de turno",
];

export function Chat({ inicial }: { inicial: Mensagem[] }) {
  const [mensagens, setMensagens] = useState<Mensagem[]>(inicial);
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState("");
  const [pendente, iniciar] = useTransition();
  const fim = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens, pendente]);

  function enviar(conteudo: string) {
    const limpo = conteudo.trim();
    if (!limpo || pendente) return;
    setErro("");
    setTexto("");
    setMensagens((m) => [...m, { role: "user", texto: limpo }]);
    iniciar(async () => {
      const r = await acaoEnviarAoAgente(limpo);
      if (r.erro) setErro(r.erro);
      if (r.resposta) setMensagens((m) => [...m, { role: "assistant", texto: r.resposta! }]);
    });
  }

  return (
    <div className="cartao chat">
      <div className="mensagens">
        {mensagens.length === 0 && (
          <div className="pilha" style={{ gap: 8 }}>
            <p className="suave">Experimente:</p>
            <div className="linha">
              {SUGESTOES.map((s) => (
                <button key={s} type="button" className="secundario pequeno" onClick={() => enviar(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {mensagens.map((m, i) => (
          <div key={i} className={`balao ${m.role}`}>
            {m.texto}
          </div>
        ))}
        {pendente && <div className="balao assistant suave">Pensando…</div>}
        <div ref={fim} />
      </div>
      {erro && <div className="aviso erro">{erro}</div>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          enviar(texto);
        }}
      >
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              enviar(texto);
            }
          }}
          placeholder="Ex.: ronda no subsolo 2 ok, mas tem uma infiltração perto da vaga 87"
          rows={2}
        />
        <button type="submit" disabled={pendente || !texto.trim()}>
          Enviar
        </button>
      </form>
    </div>
  );
}
