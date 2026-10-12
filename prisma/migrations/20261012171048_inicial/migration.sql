-- CreateEnum
CREATE TYPE "Papel" AS ENUM ('TI_ADMIN', 'SINDICA', 'ADMINISTRACAO', 'FINANCEIRO', 'SUPERVISOR', 'ENCARREGADO', 'PORTEIRO', 'RECEPCIONISTA');

-- CreateEnum
CREATE TYPE "Turno" AS ENUM ('DIA', 'NOITE');

-- CreateEnum
CREATE TYPE "TipoLocal" AS ENUM ('RECEPCAO', 'ANDAR', 'SUBSOLO', 'PRACA_ALIMENTACAO', 'LOJAS', 'AREA_EXTERNA', 'OUTRO');

-- CreateEnum
CREATE TYPE "Canal" AS ENUM ('WEB', 'WHATSAPP', 'SISTEMA');

-- CreateEnum
CREATE TYPE "CategoriaOcorrencia" AS ENUM ('SEGURANCA', 'MANUTENCAO', 'LIMPEZA', 'ACESSO', 'ACESSIBILIDADE', 'CONVIVENCIA', 'GARAGEM', 'EMERGENCIA', 'OUTRO');

-- CreateEnum
CREATE TYPE "Prioridade" AS ENUM ('BAIXA', 'MEDIA', 'ALTA', 'URGENTE');

-- CreateEnum
CREATE TYPE "Setor" AS ENUM ('ADMINISTRACAO', 'FINANCEIRO', 'SUPERVISOR', 'SINDICA', 'PORTARIA', 'RECEPCAO', 'TI');

-- CreateEnum
CREATE TYPE "StatusOcorrencia" AS ENUM ('ABERTA', 'EM_ANDAMENTO', 'RESOLVIDA');

-- CreateEnum
CREATE TYPE "TipoAcesso" AS ENUM ('VISITANTE', 'PRESTADOR', 'ENTREGA', 'CANDIDATO', 'OUTRO');

-- CreateEnum
CREATE TYPE "TipoNecessidade" AS ENUM ('CADEIRANTE', 'MOBILIDADE_REDUZIDA', 'IDOSO', 'DEFICIENCIA_VISUAL', 'DEFICIENCIA_AUDITIVA', 'GESTANTE', 'OUTRO');

-- CreateEnum
CREATE TYPE "StatusApoio" AS ENUM ('SOLICITADO', 'EM_ATENDIMENTO', 'CONCLUIDO', 'CANCELADO');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "papel" "Papel" NOT NULL,
    "telefone" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "equipeId" TEXT,
    "horaInicio" TEXT,
    "horaFim" TEXT,
    "diaFolga" INTEGER,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipe" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "turno" "Turno" NOT NULL,
    "dataReferencia" DATE NOT NULL,

    CONSTRAINT "Equipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Local" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoLocal" NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "exigeRonda" BOOLEAN NOT NULL DEFAULT true,
    "intervaloRondaMin" INTEGER,
    "diasFechado" INTEGER[] DEFAULT ARRAY[]::INTEGER[],

    CONSTRAINT "Local_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ronda" (
    "id" TEXT NOT NULL,
    "localId" TEXT NOT NULL,
    "porteiroId" TEXT NOT NULL,
    "realizadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "comAlteracao" BOOLEAN NOT NULL DEFAULT false,
    "observacao" TEXT,
    "canal" "Canal" NOT NULL DEFAULT 'WEB',

    CONSTRAINT "Ronda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ocorrencia" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "categoria" "CategoriaOcorrencia" NOT NULL,
    "prioridade" "Prioridade" NOT NULL DEFAULT 'MEDIA',
    "setor" "Setor" NOT NULL,
    "status" "StatusOcorrencia" NOT NULL DEFAULT 'ABERTA',
    "localId" TEXT,
    "sala" TEXT,
    "fotos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rondaId" TEXT,
    "registradoPorId" TEXT NOT NULL,
    "canal" "Canal" NOT NULL DEFAULT 'WEB',
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadaEm" TIMESTAMP(3) NOT NULL,
    "resolvidaEm" TIMESTAMP(3),
    "resolvidaPorId" TEXT,
    "resolucao" TEXT,
    "setorNotificadoEm" TIMESTAMP(3),

    CONSTRAINT "Ocorrencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistroAcesso" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "documentoFinal" TEXT,
    "tipo" "TipoAcesso" NOT NULL DEFAULT 'VISITANTE',
    "sala" TEXT,
    "empresa" TEXT,
    "localId" TEXT,
    "cadastradoInvenzi" BOOLEAN NOT NULL DEFAULT false,
    "invenziId" TEXT,
    "entradaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "saidaEm" TIMESTAMP(3),
    "observacao" TEXT,
    "registradoPorId" TEXT NOT NULL,
    "canal" "Canal" NOT NULL DEFAULT 'WEB',

    CONSTRAINT "RegistroAcesso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AtendimentoAcessibilidade" (
    "id" TEXT NOT NULL,
    "pessoa" TEXT NOT NULL,
    "necessidade" "TipoNecessidade" NOT NULL,
    "destino" TEXT,
    "observacao" TEXT,
    "status" "StatusApoio" NOT NULL DEFAULT 'SOLICITADO',
    "solicitadoPorId" TEXT NOT NULL,
    "atendidoPorId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "iniciadoEm" TIMESTAMP(3),
    "concluidoEm" TIMESTAMP(3),

    CONSTRAINT "AtendimentoAcessibilidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PassagemTurno" (
    "id" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "turno" "Turno" NOT NULL,
    "resumo" TEXT NOT NULL,
    "geradoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "autorId" TEXT,

    CONSTRAINT "PassagemTurno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LivroDiario" (
    "id" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "conteudo" TEXT NOT NULL,
    "geradoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "conferidoPor" TEXT,
    "conferidoEm" TIMESTAMP(3),

    CONSTRAINT "LivroDiario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversaAgente" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "canal" "Canal" NOT NULL,
    "chavePlantao" TEXT NOT NULL,
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversaAgente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MensagemAgente" (
    "id" TEXT NOT NULL,
    "conversaId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "conteudo" JSONB NOT NULL,
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MensagemAgente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsappMensagemProcessada" (
    "id" TEXT NOT NULL,
    "recebidaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsappMensagemProcessada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TarefaAgendadaExecucao" (
    "chave" TEXT NOT NULL,
    "executadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TarefaAgendadaExecucao_pkey" PRIMARY KEY ("chave")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_login_key" ON "Usuario"("login");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_telefone_key" ON "Usuario"("telefone");

-- CreateIndex
CREATE UNIQUE INDEX "Equipe_nome_key" ON "Equipe"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Local_nome_key" ON "Local"("nome");

-- CreateIndex
CREATE INDEX "Ronda_realizadaEm_idx" ON "Ronda"("realizadaEm");

-- CreateIndex
CREATE INDEX "Ocorrencia_status_setor_idx" ON "Ocorrencia"("status", "setor");

-- CreateIndex
CREATE INDEX "Ocorrencia_criadaEm_idx" ON "Ocorrencia"("criadaEm");

-- CreateIndex
CREATE INDEX "RegistroAcesso_entradaEm_idx" ON "RegistroAcesso"("entradaEm");

-- CreateIndex
CREATE INDEX "RegistroAcesso_nome_idx" ON "RegistroAcesso"("nome");

-- CreateIndex
CREATE INDEX "AtendimentoAcessibilidade_status_idx" ON "AtendimentoAcessibilidade"("status");

-- CreateIndex
CREATE INDEX "PassagemTurno_data_turno_idx" ON "PassagemTurno"("data", "turno");

-- CreateIndex
CREATE UNIQUE INDEX "LivroDiario_data_key" ON "LivroDiario"("data");

-- CreateIndex
CREATE UNIQUE INDEX "ConversaAgente_usuarioId_canal_chavePlantao_key" ON "ConversaAgente"("usuarioId", "canal", "chavePlantao");

-- CreateIndex
CREATE INDEX "MensagemAgente_conversaId_criadaEm_idx" ON "MensagemAgente"("conversaId", "criadaEm");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_equipeId_fkey" FOREIGN KEY ("equipeId") REFERENCES "Equipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ronda" ADD CONSTRAINT "Ronda_localId_fkey" FOREIGN KEY ("localId") REFERENCES "Local"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ronda" ADD CONSTRAINT "Ronda_porteiroId_fkey" FOREIGN KEY ("porteiroId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ocorrencia" ADD CONSTRAINT "Ocorrencia_localId_fkey" FOREIGN KEY ("localId") REFERENCES "Local"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ocorrencia" ADD CONSTRAINT "Ocorrencia_rondaId_fkey" FOREIGN KEY ("rondaId") REFERENCES "Ronda"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ocorrencia" ADD CONSTRAINT "Ocorrencia_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ocorrencia" ADD CONSTRAINT "Ocorrencia_resolvidaPorId_fkey" FOREIGN KEY ("resolvidaPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroAcesso" ADD CONSTRAINT "RegistroAcesso_localId_fkey" FOREIGN KEY ("localId") REFERENCES "Local"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroAcesso" ADD CONSTRAINT "RegistroAcesso_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtendimentoAcessibilidade" ADD CONSTRAINT "AtendimentoAcessibilidade_solicitadoPorId_fkey" FOREIGN KEY ("solicitadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtendimentoAcessibilidade" ADD CONSTRAINT "AtendimentoAcessibilidade_atendidoPorId_fkey" FOREIGN KEY ("atendidoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PassagemTurno" ADD CONSTRAINT "PassagemTurno_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversaAgente" ADD CONSTRAINT "ConversaAgente_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MensagemAgente" ADD CONSTRAINT "MensagemAgente_conversaId_fkey" FOREIGN KEY ("conversaId") REFERENCES "ConversaAgente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
