"use client";

import { useActionState } from "react";
import { entrarAdmin } from "../acoes";

export function FormularioLoginAdmin() {
  const [estado, acao, pendente] = useActionState(entrarAdmin, { erro: "", email: "" });
  return (
    <form action={acao} className="formulario" style={{ marginTop: 16 }}>
      {estado.erro && <div className="aviso erro">{estado.erro}</div>}
      <label>
        E-mail
        <input name="email" type="email" autoComplete="username" required autoFocus defaultValue={estado.email} />
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
