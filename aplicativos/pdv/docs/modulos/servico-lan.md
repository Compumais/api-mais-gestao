# Serviço do PDV em segundo plano (sem UI)

Roda a API local `:5050`, o sync com a nuvem (outbox, fiscal, catálogo) e a
reconciliação de NFC-e **sem abrir a tela do caixa e sem operador logado**.
Útil para o POS e a estação de balança funcionarem com o caixa fechado.

## Como sobe

O instalador (task **Serviço do PDV**, marcada por padrão) registra uma tarefa
agendada `PDV Mais Gestao - Servico`:

- gatilho: inicialização do Windows (atraso de 30 s para o PostgreSQL local subir);
- conta: `SYSTEM`, sem exigir login do Windows;
- comando: `"PDV Mais Gestão.exe" --lan-service --pdv-user-data="<AppData do usuário>\pdv-mais-gestao"`;
- reinício automático em falha e uma instância por vez.

Script: `installer/scripts/registrar-servico-pdv.ps1` (`-Acao Registrar|Remover`).
Log: `%ProgramData%\PDVMaisGestao\logs\registrar-servico-pdv.log`. A desinstalação remove a tarefa.

Manual (desenvolvimento ou sem instalador):

```powershell
cd pdv
npm run dev:lan-service
# ou, com o app empacotado:
"C:\...\PDV Mais Gestão.exe" --lan-service
```

`--pdv-user-data` (ou `PDV_USER_DATA`) faz o serviço usar os mesmos arquivos do app do
caixa: XML da NFC-e, certificados, imagens. Sem isso o `SYSTEM` leria o perfil dele e
a contingência não acharia os XML. O cache do Chromium fica em `service-session/`,
separado do app.

## Pré-requisitos

1. PDV instalado (PostgreSQL local + configs).
2. Em **Configurações**, colar a API key do terminal e clicar **Validar API key**
   (grava empresa + numeração). Sem API key o sync de vendas continua exigindo operador logado.
3. LAN habilitada (padrão).

## Sem operador logado

- **Logout** com API key só tira o operador (`token`, `userid`, `username`, `roles`). A empresa do
  terminal continua na `sessao`, então LAN, fiscal e sync seguem de pé. Sem API key o logout
  continua limpando a sessão inteira.
- **Autor do sync**: `escolherAutorSync` (`electron/sync/autor-sync.ts`). Com operador logado é ele.
  Sem operador e com API key, usa o operador do turno de caixa mais recente do terminal
  (`operadorUltimoTurnoCaixa`, aberto tem preferência). A API aceita o terminal como autor das
  rotas (`pdv-device:<id>` em `verificarUsuarioPertenceEmpresa`); o usuário real só vai nos campos
  do corpo (`usuarioquefechouvenda`, `idusuario`). Sem turno nenhum, o outbox espera.
- **Login do POS** (`/pos/login`, `/pos/empresa`): com API key, o PDV conta como pronto mesmo sem
  operador logado no caixa (`sessaoPdvProntaParaPos(sessao, apiKeyDevice)`).

## Convivência com o app do caixa

Só um processo escuta a porta LAN. Ao abrir, o app do caixa consulta `GET /pos/health` na porta
configurada. Se o serviço responde (`app: "pdv-mais-gestao"`), o app **não** abre a LAN
(`delegarLanAoServicoExterno`) e o status mostra a porta como atendida pelo serviço.
Banco, outbox e config são os mesmos (PostgreSQL local), e o worker do outbox reivindica itens por
`OUTBOX_WORKER_ID`, então não duplica envio. Se o app abrir antes do serviço, o serviço fica
tentando a porta a cada 5 s e assume quando o app fechar.

Salvar configuração da LAN no app reinicia a LAN local (`restartLanServer`) e pode tentar a porta
que o serviço já ocupa. Hoje isso vira retry com erro no status, sem derrubar o serviço.

## O que o serviço não faz (fica no app do caixa)

Impressão (`BrowserWindow`), SiTef, balança serial, Tecnibra, WhatsApp, backup agendado e
verificação de update. Mover isso para um core Node sem Electron é a fase seguinte.

## Limites conhecidos

- O caixa ainda é regra de negócio: sem turno aberto, o fluxo de venda do caixa não abre. O serviço
  não abre caixa sozinho.
- O serviço sincroniza fiscal e catálogo na partida, não de forma periódica.
- Se o `{userappdata}` do instalador for de outro usuário que o do caixa (UAC com outra conta
  admin), a tarefa aponta para a pasta errada. Reexecute o registro com `-UserData` correto.
