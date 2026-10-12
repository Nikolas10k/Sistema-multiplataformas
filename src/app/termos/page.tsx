import { NOME_PRODUTO } from "@/lib/condominio";

export const metadata = { title: "Termos de uso" };

// MODELO: revise com um advogado antes de vender. Os pontos abaixo refletem como o sistema funciona hoje.
export default function PaginaTermos() {
  return (
    <main className="cadastro">
      <div className="cartao documento" style={{ fontFamily: "inherit" }}>
        <h1>Termos de uso e privacidade · {NOME_PRODUTO}</h1>
        <p>
          <strong>1. Serviço.</strong> Software para a operação de condomínios: registro de rondas, ocorrências, controle de acesso
          operacional, apoio a pessoas com deficiência e idosos, passagem de turno e livro de ocorrências, com um agente de
          inteligência artificial acessível pelo WhatsApp e pela web.
        </p>
        <p>
          <strong>2. Responsabilidades do condomínio.</strong> Cadastrar apenas pessoas autorizadas, manter os dados corretos e
          proteger as senhas. O agente auxilia o registro, mas não substitui o atendimento de emergências nem os sistemas de
          segurança do prédio.
        </p>
        <p>
          <strong>3. Dados pessoais (LGPD).</strong> O condomínio é o controlador dos dados; a plataforma atua como operadora.
          Guardamos o mínimo necessário: do documento de visitantes, só os 4 últimos dígitos. Mensagens enviadas ao agente são
          processadas por provedor de IA contratado (Anthropic) para gerar as respostas. Cada condomínio só acessa os próprios
          dados.
        </p>
        <p>
          <strong>4. Cobrança.</strong> Após o período de teste, o uso depende de assinatura mensal. Faturas vencidas há mais de
          alguns dias podem suspender o acesso até a regularização; os dados são preservados.
        </p>
        <p>
          <strong>5. Cancelamento.</strong> O condomínio pode cancelar a qualquer momento e solicitar a exportação ou a exclusão
          dos seus dados.
        </p>
        <p className="suave">Documento modelo. Revise com assessoria jurídica antes do uso comercial.</p>
      </div>
    </main>
  );
}
