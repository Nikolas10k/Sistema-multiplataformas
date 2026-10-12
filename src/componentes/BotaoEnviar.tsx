"use client";

import { useFormStatus } from "react-dom";

export function BotaoEnviar({ texto, pendente, secundario }: { texto: string; pendente: string; secundario?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={secundario ? "secundario" : undefined}>
      {pending ? pendente : texto}
    </button>
  );
}
