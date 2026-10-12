"use client";

import { useActionState } from "react";
import { entrar } from "./acoes";

export function FormularioLogin() {
  const [estado, acao, pendente] = useActionState(entrar, { erro: "", login: "" });
  return (
    <form action={acao} className="formulario" style={{ marginTop: 16 }}>
      {estado.erro && <div className="aviso erro">{estado.erro}</div>}
      <label>
        Usuário
        <input name="login" autoComplete="username" required autoFocus defaultValue={estado.login} />
      </label>
      <label>
        Senha
        <input name="senha" type="password" autoComplete="current-password" required />
      </label>
      <button type="submit" disabled={pendente}>
        {pendente ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
