# Condomínio Operacional

Sistema de operação do condomínio comercial, com um **agente de IA (Claude)** que a equipe usa pelo **WhatsApp** e pelo **computador da recepção**.

O prédio tem 800 salas, 3 subsolos, lojas externas e praça de alimentação, e funciona 24h com portaria 12x36 e recepção 6x1. O sistema registra tudo o que acontece na operação e garante que a informação passe de um turno para o outro e chegue ao setor certo.

## O que o sistema faz

| Área | O que faz |
|---|---|
| **Agente** | Conversa em linguagem natural ("ronda no 5º andar ok, lâmpada queimada no corredor B") e registra rondas, ocorrências, visitantes e pedidos de apoio. Responde dúvidas sobre escala e pendências. Entende fotos. |
| **Rondas** | Checklist por plantão (andares, subsolos, praça, recepções, lojas). Locais com intervalo configurado geram alerta de ronda atrasada para o encarregado. |
| **Ocorrências** | Categoria, prioridade e setor responsável (Administração, Financeiro, Supervisor, Síndica, Portaria, Recepção, TI). **Alta** e **urgente** avisam o setor por WhatsApp na hora. |
| **Controle de acesso** | Espelho operacional do **Invenzi**: entrada, saída e marcação de "cadastrado no Invenzi". Do documento, guarda só os 4 últimos dígitos (LGPD). |
| **Acessibilidade** | Pedidos de apoio a PcD, idosos e gestantes. Avisa a recepção no horário e o encarregado de plantão. |
| **Passagem de turno** | Gerada automaticamente às 06h45 e às 18h45 e enviada ao encarregado que assume e ao supervisor. |
| **Livro do dia** | Substitui o livro de ocorrências escrito à mão. Gerado às 07h10 com tudo do dia operacional (07h às 07h). O encarregado ou o supervisor confere e assina, e dá para imprimir. |
| **Escala** | Calcula quem está de plantão (equipes A/B dia, C/D noite) e quando a recepção está descoberta. |

### Perfis de acesso

- **Porteiro / Recepcionista**: operação do dia a dia. Só altera as ocorrências que registrou.
- **Encarregado**: tudo da operação, além de gerir qualquer ocorrência e conferir o livro do dia.
- **Supervisor, Síndica, Administração, Financeiro**: gestão. Recebem os avisos do seu setor.
- **TI / Administração**: cadastros de usuários, escalas e locais.

## Como o agente funciona

`src/lib/agente/` contém o loop de ferramentas com a API do Claude (modelo `claude-opus-5-5`):

- `prompt.ts`: conhecimento fixo do prédio, das equipes e das regras (setores, prioridades, LGPD).
- `ferramentas.ts`: as 15 ações que o agente pode executar (`registrar_ronda`, `registrar_ocorrencia`, `registrar_acesso`, `escala_atual`, `gerar_passagem_turno`, `livro_do_dia` etc.). Elas usam as mesmas funções das telas (`src/lib/operacao.ts`).
- `executar.ts`: conversa por pessoa e por plantão. O histórico recomeça a cada troca de turno.
- `relatorios.ts`: redação da passagem de turno e do livro do dia.

O agente usa *fallback* automático da API: se o modelo principal recusar uma mensagem, a própria API tenta um modelo alternativo.

## Rodar localmente

```bash
cp .env.example .env          # preencha DATABASE_URL, SESSION_SECRET e ANTHROPIC_API_KEY
npm install
npx prisma migrate dev        # cria as tabelas
SEED_DEMO=true npx prisma db seed   # cria admin, equipes, locais e usuários de teste (senha demo123)
npm run dev
```

Abra http://localhost:3000 e entre com o usuário admin (`SEED_ADMIN_LOGIN` / `SEED_ADMIN_SENHA`).

## Implantação com Docker

```bash
cp .env.example .env   # preencha tudo, incluindo POSTGRES_PASSWORD
docker compose up -d --build
```

O serviço `migrador` aplica as migrações e o seed a cada deploy. O app fica na porta `3001`, para onde o Nginx de `portal.givanceresto.com.br` já aponta.

> **Atenção:** este repositório agora contém **apenas** o sistema do condomínio. O código do restaurante/PDV foi removido nesta branch (continua no histórico do git, no commit `6d3cba6`). Não faça deploy desta branch no lugar do site do restaurante.

## Configurar o WhatsApp (Meta Cloud API)

1. Em [developers.facebook.com](https://developers.facebook.com), crie um app do tipo **Business** e adicione o produto **WhatsApp**.
2. Cadastre um **número dedicado** para o condomínio (não pode estar em uso no WhatsApp comum) e verifique a empresa no Gerenciador de Negócios.
3. Gere um **token permanente** (usuário do sistema com permissão `whatsapp_business_messaging`) e anote o **Phone Number ID**.
4. Em *WhatsApp → Configuração → Webhook*:
   - URL: `https://portal.givanceresto.com.br/api/whatsapp`
   - Token de verificação: o mesmo valor de `WHATSAPP_VERIFY_TOKEN`
   - Assine o campo **messages**.
5. Preencha no `.env`: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN` e `WHATSAPP_APP_SECRET` (em *Configurações do app → Básico*).
6. Em **Cadastros**, informe o WhatsApp de cada pessoa. O agente só responde a números cadastrados.

Respostas a mensagens recebidas nas últimas 24h são baratas. Avisos que o sistema inicia (urgências, passagem de turno) contam como conversas iniciadas pela empresa. Fora da janela de 24h, a Meta exige **modelos de mensagem aprovados**. Isso ainda não está implementado: hoje esses avisos só chegam a quem falou com o número nas últimas 24h.

## Primeiros passos depois de instalar

1. **Cadastros → Escalas 12x36**: para cada equipe, informe um dia em que ela trabalhou.
2. **Cadastros → Usuários**: crie a equipe com função, equipe (porteiros e encarregados), horário e folga (recepção) e WhatsApp.
3. **Cadastros → Locais**: ajuste os andares (o seed cria 20 por padrão, via `SEED_ANDARES`), as recepções e o intervalo de ronda de cada local.

## Estrutura

```
prisma/schema.prisma        modelo de dados
src/lib/operacao.ts         regras de negócio (usadas pelas telas e pelo agente)
src/lib/agente/             agente Claude
src/lib/agendador.ts        tarefas automáticas (iniciado em src/instrumentation.ts)
src/app/api/whatsapp/       webhook do WhatsApp
src/app/(painel)/           telas do sistema
```
