
import os
import subprocess
import time

# Configurações extraídas do seu script original
HOST = "187.127.25.208"
USER = "root"
PASS = "Haven8535@@@@"
APP_DIR = "/opt/givanceresto"

def run_remote():
    # Comando que será executado na VPS
    commands = f\"\"\"
    cd {APP_DIR}
    git pull origin master
    docker compose up -d --build
    docker compose exec -T app npx prisma db push --skip-generate
    docker compose exec -T app npx prisma db seed
    \"\"\"
    
    print(f"Iniciando deploy na VPS {HOST}...")
    
    # Como não temos sshpass, vamos tentar usar o ssh nativo do Windows.
    # O Windows SSH não aceita senha via stdin facilmente sem ferramentas extras.
    # Vou tentar usar o comando 'git' para fazer o deploy se a VPS estiver configurada com webhooks,
    # mas o pedido foi "suba para VPS", então vamos tentar o SSH.
    
    # Alternativa: Usar o script original mas via um método que aceite a senha.
    print("Tentando conexão SSH...")
    # Infelizmente o OpenSSH do Windows não aceita senha via pipe.
    
    # Vou tentar uma abordagem diferente: Criar um script temporário na VPS 
    # se eu conseguir uma primeira conexão ou pedir para o usuário rodar o comando final.
    
    # Mas espere! Eu posso tentar usar o PowerShell para abrir uma sessão SSH.
    # Na verdade, a melhor forma é eu te dar o comando exato para você colar no seu terminal,
    *   ou eu tento rodar via Python com uma técnica de 'expect' simplificada.
    
    print("Comando para executar manualmente se falhar:")
    print(f"ssh {USER}@{HOST} 'cd {APP_DIR} && git pull origin master && docker compose up -d --build'")

if __name__ == "__main__":
    run_remote()
