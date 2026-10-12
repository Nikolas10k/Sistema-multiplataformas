export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.AGENDADOR_ATIVO !== "false") {
    const { iniciarAgendador } = await import("./lib/agendador");
    iniciarAgendador();
  }
}
