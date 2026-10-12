"use client";

import Link from "next/link";
import { useActionState } from "react";
import { cadastrar, type EstadoCadastro } from "./acoes";

const FUSOS: [string, string][] = [
  ["America/Sao_Paulo", "Brasília (SP, RJ, MG, Sul, GO, DF…)"],
  ["America/Bahia", "Bahia"],
  ["America/Fortaleza", "Nordeste (CE, RN, PB, PI, MA)"],
  ["America/Recife", "Pernambuco"],
  ["America/Belem", "Pará e Amapá"],
  ["America/Manaus", "Amazonas"],
  ["America/Cuiaba", "Mato Grosso e MS"],
  ["America/Porto_Velho", "Rondônia e Roraima"],
  ["America/Rio_Branco", "Acre"],
  ["America/Noronha", "Fernando de Noronha"],
];

const inicial: EstadoCadastro = { erro: "", valores: {} };

export function FormularioCadastro() {
  const [estado, acao, pendente] = useActionState(cadastrar, inicial);
  const v = (k: string, padrao = "") => estado.valores[k] ?? padrao;
  const marcado = (k: string, padrao: boolean) => (k in estado.valores ? estado.valores[k] === "on" : padrao);
  return (
    <form action={acao} className="pilha" key={JSON.stringify(estado.valores)}>
      {estado.erro && <div className="aviso erro" style={{ whiteSpace: "pre-wrap" }}>{estado.erro}</div>}

      <section className="cartao formulario">
        <h2>O condomínio</h2>
        <div className="campos">
          <label>
            Nome do condomínio
            <input name="nome" required defaultValue={v("nome")} placeholder="Ex.: Edifício Centro Empresarial" />
          </label>
          <label>
            Tipo
            <select name="tipo" defaultValue={v("tipo", "COMERCIAL")}>
              <option value="COMERCIAL">Comercial</option>
              <option value="RESIDENCIAL">Residencial</option>
              <option value="MISTO">Misto</option>
            </select>
          </label>
          <label>
            Unidades (salas ou apartamentos)
            <input name="unidades" type="number" min={1} required defaultValue={v("unidades")} />
          </label>
          <label>
            Andares
            <input name="andares" type="number" min={0} required defaultValue={v("andares")} />
          </label>
          <label>
            Subsolos de garagem
            <input name="subsolos" type="number" min={0} required defaultValue={v("subsolos", "0")} />
          </label>
          <label>
            Recepções / portarias
            <input name="recepcoes" type="number" min={0} required defaultValue={v("recepcoes", "1")} />
          </label>
        </div>
        <div className="linha">
          <label className="checkbox">
            <input type="checkbox" name="lojas" defaultChecked={marcado("lojas", false)} /> Tem lojas
          </label>
          <label className="checkbox">
            <input type="checkbox" name="pracaAlimentacao" defaultChecked={marcado("pracaAlimentacao", false)} /> Tem praça de
            alimentação
          </label>
        </div>
        <div className="campos">
          <label>
            Fuso horário
            <select name="fuso" defaultValue={v("fuso", "America/Sao_Paulo")}>
              {FUSOS.map(([id, nome]) => (
                <option key={id} value={id}>
                  {nome}
                </option>
              ))}
            </select>
          </label>
          <label>
            Início do turno do dia
            <input name="horaInicioDia" type="time" required defaultValue={v("horaInicioDia", "07:00")} />
          </label>
          <label>
            Início do turno da noite
            <input name="horaInicioNoite" type="time" required defaultValue={v("horaInicioNoite", "19:00")} />
          </label>
        </div>
        <label>
          Algo que o agente deve saber sobre o prédio? (opcional)
          <textarea
            name="observacoes"
            defaultValue={v("observacoes")}
            placeholder="Ex.: a praça de alimentação fecha aos domingos; o controle de acesso é feito no sistema X; fim de semana tem pouco movimento."
          />
        </label>
      </section>

      <section className="cartao formulario">
        <h2>Você (primeiro gestor)</h2>
        <div className="campos">
          <label>
            Seu nome
            <input name="responsavelNome" required defaultValue={v("responsavelNome")} />
          </label>
          <label>
            Sua função
            <select name="responsavelPapel" defaultValue={v("responsavelPapel", "ADMINISTRACAO")}>
              <option value="SINDICA">Síndico(a)</option>
              <option value="ADMINISTRACAO">Administração</option>
              <option value="SUPERVISOR">Supervisor(a)</option>
              <option value="TI_ADMIN">TI</option>
            </select>
          </label>
          <label>
            E-mail
            <input name="responsavelEmail" type="email" required defaultValue={v("responsavelEmail")} />
          </label>
          <label>
            Celular
            <input name="responsavelTelefone" defaultValue={v("responsavelTelefone")} placeholder="11 99999-8888" />
          </label>
          <label>
            CPF ou CNPJ para a cobrança (opcional agora)
            <input name="cpfCnpj" defaultValue={v("cpfCnpj")} inputMode="numeric" />
          </label>
        </div>
        <div className="campos">
          <label>
            Login
            <input name="login" required defaultValue={v("login")} autoComplete="username" pattern="[a-zA-Z0-9._\-]{3,40}" />
          </label>
          <label>
            Senha (mínimo 8 caracteres)
            <input name="senha" type="password" required minLength={8} autoComplete="new-password" />
          </label>
        </div>
        <label className="checkbox">
          <input type="checkbox" name="aceite" required /> Li e aceito os{" "}
          <Link href="/termos" target="_blank">
            termos de uso e a política de privacidade
          </Link>
        </label>
      </section>

      <div>
        <button type="submit" disabled={pendente}>
          {pendente ? "Criando…" : "Criar condomínio e começar o teste"}
        </button>
      </div>
    </form>
  );
}
