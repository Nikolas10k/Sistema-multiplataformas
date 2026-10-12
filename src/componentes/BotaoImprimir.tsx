"use client";

export function BotaoImprimir() {
  return (
    <button type="button" className="secundario" onClick={() => window.print()}>
      Imprimir
    </button>
  );
}
