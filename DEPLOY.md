# Guia de Implantação Profissional - Givance Resto

Este documento descreve os passos para colocar o sistema **Givance Resto** em produção no domínio `givanceresto.com.br` usando uma VPS Linux (Ubuntu recomendada) e Docker.

## 1. Configuração de DNS (Hostinger)

Acesse o painel da Hostinger e configure os seguintes registros na Zona DNS:

| Tipo | Nome | Valor | TTL |
|------|------|-------|-----|
| A | @ | [IP_DA_SUA_VPS] | 3600 |
| A | www | [IP_DA_SUA_VPS] | 3600 |

*Nota: A propagação pode levar de 1h a 24h.*

## 2. Preparação do Servidor (VPS)

No terminal da sua VPS, instale o Docker e Docker Compose:

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Instalar Docker Compose
sudo apt install docker-compose-plugin -y
```

## 3. Clonagem e Configuração

1. Envie os arquivos do projeto para a VPS (via Git ou SCP).
2. Na raiz do projeto, crie o arquivo `.env`:
   ```bash
   cp .env.example .env
   ```
3. Edite o `.env` com suas credenciais reais (especialmente `POSTGRES_PASSWORD` e `NEXTAUTH_SECRET`).

## 4. Primeira Inicialização e SSL

Para gerar o certificado SSL com Let's Encrypt (Certbot) pela primeira vez:

1. Inicie o Nginx temporariamente para validar o domínio:
   ```bash
   docker compose up -d proxy
   ```
2. Execute o Certbot (fora do container ou via container temporário):
   ```bash
   docker run -it --rm --name certbot \
     -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
     -v "$(pwd)/certbot/www:/var/www/certbot" \
     certbot/certbot certonly --webroot -w /var/www/certbot \
     -d givanceresto.com.br -d www.givanceresto.com.br
   ```
3. Reinicie o proxy para carregar os certificados:
   ```bash
   docker compose restart proxy
   ```

## 5. Subindo a Aplicação Completa

```bash
# Build e inicialização
docker compose up -d --build

# Executar migrações do banco e carregar dados iniciais (Seed)
docker compose exec app npx prisma migrate deploy
docker compose exec app npx prisma db seed
```

## 6. Fluxo de Onboarding de Clientes

O sistema já sai configurado com um inquilino modelo. Para novos clientes:
1. Acesse `givanceresto.com.br/admin` com as credenciais geradas no seed.
2. Utilize o fluxo administrativo para criar novos `Tenants` e associar `Users`.
3. (Opcional) Use o script de seed como base para automação de novos cadastros via API interna.

## 7. Manutenção e Backups

- **Logs**: `docker compose logs -f app`
- **Backup do Banco**: 
  ```bash
  docker exec givance-db pg_dump -U postgres restogestao > backup.sql
  ```
- **Imagens**: As imagens dos produtos ficam salvas no volume `uploads_data`.

---
Sistema preparado por Antigravity AI.
