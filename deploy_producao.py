"""
Script de Deploy de Produção — RestoGestão
==========================================
Envia os arquivos atualizados para o VPS e reinicia os containers.

COMO USAR:
  1. Edite as variáveis VPS_HOST, VPS_USER, VPS_PASSWORD e DB_PASSWORD abaixo.
  2. Execute: python deploy_producao.py
"""

import subprocess
import sys

# ============================
# CONFIGURAÇÃO — EDITE AQUI
# ============================
VPS_HOST     = "187.127.25.208"
VPS_USER     = "root"
VPS_PASSWORD = "Haven8535@@@@"   # <-- coloque a senha do VPS aqui
APP_DIR      = "/opt/givanceresto"

DB_USER     = "postgres"
DB_PASSWORD = "Haven8535@@@@"     # <-- coloque a senha do banco aqui
DB_NAME     = "restogestao"

# ============================
# CONTEÚDO DO .env DE PRODUÇÃO
# ============================
ENV_CONTENT = f"""# .env de PRODUÇÃO — gerado automaticamente pelo script de deploy
NODE_ENV=production

# Banco de Dados
DATABASE_URL="postgresql://{DB_USER}:{DB_PASSWORD}@db:5432/{DB_NAME}?schema=public"
POSTGRES_USER={DB_USER}
POSTGRES_PASSWORD={DB_PASSWORD}
POSTGRES_DB={DB_NAME}

# URLs do Sistema
NEXT_PUBLIC_APP_URL=https://givanceresto.com.br
NEXT_PUBLIC_API_URL=https://givanceresto.com.br/api
NEXTAUTH_URL=https://givanceresto.com.br
NEXTAUTH_SECRET=gere_um_secret_forte_aqui_32chars

# Upload
UPLOAD_DIR=/app/public/uploads
MAX_FILE_SIZE=5242880
"""

# ============================
# COMANDOS SSH NO VPS
# ============================
REMOTE_COMMANDS = f"""
set -e

echo "==> [1/6] Acessando diretório da aplicação..."
cd {APP_DIR}

echo "==> [2/6] Escrevendo .env de produção..."
cat > .env << 'ENVEOF'
{ENV_CONTENT}
ENVEOF

echo "==> [3/6] Atualizando código via git..."
git pull origin main || echo "Sem git remoto, pulando pull..."

echo "==> [4/6] Parando containers..."
docker compose down

echo "==> [5/6] Build da nova imagem..."
docker compose build --no-cache app

echo "==> [6/6] Subindo todos os containers..."
docker compose up -d

echo ""
echo "==> Aguardando app inicializar (30s)..."
sleep 30

echo "==> Aplicando schema do banco de dados..."
docker compose exec app npx prisma db push --skip-generate

echo "==> Populando banco com dados iniciais..."
docker compose exec app npx prisma db seed

echo ""
echo "✅ Deploy concluído! Acesse: https://givanceresto.com.br"
docker compose ps
"""

def run_ssh(host, user, password, commands):
    """Executa comandos SSH usando plink (PuTTY) ou ssh nativo."""
    try:
        # Tenta com plink (PuTTY) no Windows
        result = subprocess.run(
            ["plink", "-ssh", f"{user}@{host}", "-pw", password, commands],
            capture_output=True, text=True, timeout=300
        )
    except FileNotFoundError:
        # Fallback: exibe comandos para executar manualmente
        print("\n⚠️  plink não encontrado. Execute os comandos abaixo manualmente no VPS:\n")
        print(f"ssh {user}@{host}")
        print(commands)
        return

    print(result.stdout)
    if result.returncode != 0:
        print("STDERR:", result.stderr)
        sys.exit(1)

if __name__ == "__main__":
    print("=" * 60)
    print("  RestoGestão — Deploy de Produção")
    print("=" * 60)
    print(f"  VPS: {VPS_HOST}")
    print(f"  Dir: {APP_DIR}")
    print(f"  DB:  {DB_NAME}")
    print("=" * 60)
    # confirm = input("\nDeseja continuar? (s/N): ").strip().lower()
    confirm = "s"
    if confirm != "s":
        print("Deploy cancelado.")
        sys.exit(0)
    
    run_ssh(VPS_HOST, VPS_USER, VPS_PASSWORD, REMOTE_COMMANDS)
