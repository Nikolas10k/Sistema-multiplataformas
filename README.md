# Givance Condomínio

Plataforma SaaS de **operação de condomínios** com um **agente de IA (Claude)** que a equipe usa pelo **WhatsApp** e pela web. Cada condomínio se cadastra sozinho, testa grátis, assina um plano e opera de forma totalmente isolada dos demais.

## O que cada condomínio recebe

| Área | O que faz |
|---|---|
| **Agente** | Entende linguagem natural ("ronda no 5º andar ok, lâmpada queimada no corredor B") e registra rondas, ocorrências, visitantes e pedidos de apoio. Entende fotos e responde sobre escala e pendências. Conhece o prédio pelo **perfil** que o condomínio escreve. |
| **Rondas** | Checklist por plantão, com alerta de ronda atrasada para o encarregado. |
| **Ocorrências** | Numeração própria (#1, #2…), setor responsável e prioridade. **Alta** e **urgente** avisam o setor por WhatsApp na hora. |
| **Controle de acesso** | Espelho operacional do sistema de catracas do prédio. Do documento, guarda só os 4 últimos dígitos (LGPD). |
| **Acessibilidade** | Pedidos de apoio a PcD, idosos e gestantes, com aviso à recepção e ao encarregado. |
| **Passagem de turno** | Automática, 15 minutos antes de cada troca, enviada a quem assume. |
| **Livro do dia** | Gerado logo após a troca de turno da manhã. O encarregado confere e assina, e pode imprimir. |
| **Configuração própria** | Fuso, horários de turno, equipes 12x36, locais, usuários e o número de WhatsApp do condomínio. |

## Como a plataforma funciona

- **Cadastro self-service** (`/cadastro`): cria o condomínio em **teste grátis** (`DIAS_TESTE`). O cadastro já cria o primeiro gestor, 4 equipes 12x36, os locais (recepções, andares, subsolos, praça, lojas) e um perfil inicial para o agente.
- **Assinatura** (`/assinatura`): o gestor escolhe o plano e a forma de pagamento (boleto, Pix ou cartão) e o sistema cria a assinatura no **Asaas**.
  - O webhook do Asaas atualiza faturas e status:
    - fatura vencida → **inadimplente**;
    - passou da carência (`DIAS_CARENCIA`) → **suspenso**;
    - pagamento confirmado → **ativo**.
  - Suspenso, o condomínio só acessa a tela de assinatura, e o agente avisa a equipe no WhatsApp. Os dados são preservados.
- **Planos**: limite de usuários ativos e de mensagens do agente por mês. O consumo de tokens é registrado por condomínio.
- **Painel da plataforma** (`/plataforma`), só para você:
  - receita recorrente (MRR), condomínios por status e consumo do agente;
  - suspender, reativar ou estender o teste de um condomínio;
  - editar planos;
  - auditoria por condomínio.
- **WhatsApp**: existe um único app da Meta (o da plataforma) com um único webhook. Cada condomínio conecta o **próprio número** em Configurações, e **o número que recebe a mensagem identifica o condomínio**. Por isso a mesma pessoa pode trabalhar em dois condomínios.

### Isolamento e segurança

- Toda consulta e alteração filtra pelo condomínio de quem está agindo (`src/lib/operacao.ts`). Testes automatizados provam isso (`testes/isolamento.test.ts`).
- Fotos ficam em pastas separadas por condomínio e só são servidas a usuários do mesmo condomínio.
- Tokens de WhatsApp são guardados criptografados (AES-256-GCM, `ENCRYPTION_KEY`).
- Proteções de acesso:
  - limite de tentativas de login;
  - sessões assinadas (JWT em cookie httpOnly);
  - webhooks autenticados (assinatura da Meta e token do Asaas);
  - cabeçalhos de segurança (HSTS, X-Frame-Options e outros).
- Trilha de auditoria para login, configurações, usuários, cobrança e mudanças de status.

## Rodar localmente

```bash
cp .env.example .env               # preencha DATABASE_URL, SESSION_SECRET, ENCRYPTION_KEY, ANTHROPIC_API_KEY
npm install
npx prisma migrate dev             # cria as tabelas
SEED_DEMO=true npx prisma db seed  # planos, admin da plataforma e um condomínio de demonstração
npm run dev
```

- Condomínio de demonstração: http://localhost:3000, login `demo`, senha `demo1234`.
- Plataforma: http://localhost:3000/plataforma, com `PLATAFORMA_ADMIN_EMAIL` / `PLATAFORMA_ADMIN_SENHA`.
- Novo condomínio: http://localhost:3000/cadastro.

### Testes

```bash
createdb condominio_teste   # banco separado para os testes
npm test                    # 25 testes: turnos, escala, acesso, isolamento, cadastro e cobrança
```

O CI (`.github/workflows/ci.yml`) roda lint, tipos, testes e build a cada push.

## Implantação (Docker)

```bash
cp .env.example .env    # preencha tudo
docker compose up -d --build
```

- O serviço `migrador` aplica migrações e o seed (planos e admin) a cada deploy.
- O app publica na porta `PORTA_APP` e expõe `/api/saude` para monitoramento.
- Rode **uma única instância** com `AGENDADOR_ATIVO=true`. As tarefas são idempotentes, mas não há motivo para duplicá-las.

## Configurar integrações

### Asaas (cobrança)

1. Crie a conta em [asaas.com](https://www.asaas.com). Para testar, use o [sandbox](https://sandbox.asaas.com).
2. Gere a chave de API e preencha `ASAAS_API_KEY` e `ASAAS_AMBIENTE` (`sandbox` ou `producao`).
3. Em *Integrações → Webhooks*, aponte para `https://SEU-DOMINIO/api/asaas`, ative os eventos de **cobrança** e defina um token de autenticação. Use o mesmo valor em `ASAAS_WEBHOOK_TOKEN`.

### WhatsApp (Meta Cloud API)

1. Crie um app **Business** em [developers.facebook.com](https://developers.facebook.com) com o produto WhatsApp. Esse é o app da plataforma.
2. Em *WhatsApp → Configuração → Webhook*, use a URL `https://SEU-DOMINIO/api/whatsapp`, o token `WHATSAPP_VERIFY_TOKEN` e assine o campo **messages**.
3. Preencha `WHATSAPP_APP_SECRET` (*Configurações → Básico*) e, se quiser, um `WHATSAPP_TOKEN` padrão.
4. Para cada condomínio, registre um número na conta WhatsApp Business e conecte-o em **Configurações** do condomínio (Phone Number ID e token). O sistema testa a conexão antes de salvar.

> Para vender em escala, o caminho recomendado é se tornar **Tech Provider** da Meta e usar o *Embedded Signup*, para que cada cliente conecte o próprio número com poucos cliques. Isso ainda não está implementado: hoje o Phone Number ID e o token são informados manualmente.

### Claude

Preencha `ANTHROPIC_API_KEY`. O modelo padrão é `claude-opus-5-5` (`AGENTE_MODELO`), com esforço `medium` (`AGENTE_ESFORCO`).

## Limitações conhecidas

- Mensagens que o sistema inicia (urgências, passagem de turno) só chegam a quem falou com o número nas últimas 24h. Fora dessa janela, a Meta exige **modelos de mensagem aprovados**, que ainda não foram implementados.
- O agente não entende áudio (pede texto).
- Os **termos de uso** (`/termos`) são um modelo e precisam de revisão jurídica.
- O limite de tentativas de login fica em memória: vale por instância e zera quando o app reinicia.

## Estrutura

```
prisma/schema.prisma          modelo de dados (multi-condomínio)
src/lib/operacao.ts           regras de negócio da operação (sempre filtradas por condomínio)
src/lib/agente/               agente Claude: prompt, ferramentas, loop, relatórios, consumo
src/lib/cobranca/             Asaas: cliente da API e regras de assinatura
src/lib/onboarding.ts         cadastro de novos condomínios
src/lib/agendador.ts          tarefas automáticas por condomínio (iniciado em src/instrumentation.ts)
src/app/(painel)/             telas do condomínio
src/app/plataforma/           painel da plataforma (admin)
src/app/api/                  webhooks (WhatsApp, Asaas), fotos e health check
testes/                       testes automatizados (Vitest)
```
