# Serviço LAN do PDV (sem UI)

Roda a API local `:5050` e o sync com a nuvem **sem abrir a tela do caixa**.
Útil para o POS / estação de balança com o PDV “só de serviço”.

## Pré-requisitos

1. Instalar o PDV normalmente (PostgreSQL local + configs).
2. Em **Configurações**, colar a API key do terminal e clicar **Validar API key**
   (grava empresa + numeração).
3. LAN habilitada (padrão).

## Executar

```powershell
# A partir da pasta do app instalado, ou em desenvolvimento:
cd pdv
$env:PDV_LAN_SERVICE = "1"
# ou
npx electron . --lan-service
```

No instalador empacotado, crie um atalho / tarefa agendada:

```text
"C:\...\PDV Mais Gestao.exe" --lan-service
```

O processo fica sem janela, escuta `:5050` e sincroniza fiscal/catálogo com a API key.
