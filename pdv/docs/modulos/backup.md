# Backup

## Propósito no caixa

Cópia local (tabelas operacionais + XML de NFC-e + certificado) antes de trocar de empresa, no fechamento de caixa (se configurado) ou no agendamento. Não substitui a outbox: backup não envia venda ao ERP.

## Onde vive

- **Main:** `electron/sync/backup-local.ts`, `electron/sync/backup-agendado.ts`, `electron/sync/backup-nome.ts`, `electron/sync/tar-gz.ts`, troca de empresa em `electron/sync/troca-empresa.ts`. Pastas em `electron/fiscal/xml-local.ts`.
- **Renderer:** ações `statusBackup`, `gerarBackup`, `escolherPastaBackup` na local-api, tela de config.
- **SQL:** lê as tabelas listadas em `TABELAS_BACKUP_OPERACIONAL`. Não cria tabela de backup.

Arquivo: `{carimbo}_{slug}.tar.gz`. Pastas internas `tabelas/` e `xml-nfce`. Certificado entra na cópia (ver `criarBackupLocal`). Não commitar esses arquivos.

Pasta padrão: `userData/backups-empresa`. Troca de empresa grava lá com motivo `troca-empresa`.

## Contrato com a API

Nenhum. Backup não chama HTTP.

Na troca de empresa o fluxo é: gerar o tar.gz; se falhar, **não** limpa; se o arquivo saiu e o `TRUNCATE` falhar, o erro cita o caminho do arquivo. Depois zera `numeracao_nfce` (série 1, próximo 1, CSC nulo, `ambiente = id`), restaura chaves de `CHAVES_CONFIG_EMPRESA`, esvazia `xml-nfce` e `certificados`, recria mesas (`garantirMesas(20)`).

`TABELAS_BACKUP_OPERACIONAL` (também as que o `TRUNCATE` apaga): `item_conta`, `pedido_fila`, `conta_pagamento`, `item_venda`, `pagamento`, `nfce_local`, `venda`, `conta_mesa`, `caixa_turno`, `atalho`, `produto_cache`, `impressora_grupo_gourmet`, `grupo_gourmet`, `grupo`, `mesa`, `outbox`, `sync_meta`.

O tar.gz ainda grava, fora dessa lista, `numeracao_nfce.json`, `config.json` (todas as chaves, inclusive segredos) e a pasta `certificados`. Não commite o arquivo. Não documente o conteúdo.

Não entram no `TRUNCATE`: `config` (só algumas chaves são reescritas), `sessao`, `cliente`, `cliente_pdv`, `bandeira_cartao`, `meio_pagamento`. **Não confirmado** se `cliente` antigo de outra empresa permanece de propósito; não apague essas tabelas no schema por causa disso.

## Dados locais que não podem ser apagados no schema

O backup é um `SELECT` dessas tabelas. Renomear coluna sem atualizar o restore (**não há restore automático no código lido** — **não confirmado** função de restaurar o tar.gz para o Postgres) não recupera a loja sozinho. O arquivo deixa de bater com o schema.

Não remova `outbox` nem `nfce_local` da lista: o arquivo da empresa anterior ficaria sem fila e sem XML.

## Comportamento offline/outbox

Backup inclui a outbox pendente. Restaurar por cima de um caixa que já sincronizou pode reenviar venda se alguém recolocar a fila como `pendente`. Não há código de restore fazendo isso hoje.

Troca de empresa com vendas `pendente` arquiva a fila e limpa. A empresa nova começa sem esses cupons. A empresa antiga só volta se alguém recuperar o tar.gz por fora. Não dispare `arquivarSeTrocaEmpresa` no boot.

Agendamento (`iniciarBackupAgendado`, tick 60 s): frequência `diario` ou `hora`. `caixa` não é tick; o fechamento chama `executarBackupPdv({ motivo: "caixa" })` e só gera se `backup_habilitado = 1` e `backup_frequencia = caixa`. `manual` é o botão (`forcar` / motivo manual).

Retenção: `backup_manter` (default de código 14, teto 365) apaga tar.gz antigos pelo padrão de nome. Não apaga `pdv_local`.

## Configuração crítica

`backup_habilitado`, `backup_pasta`, `backup_frequencia` (`manual`, `caixa`, `diario`, `hora`), `backup_hora` (default de código `22:00`), `backup_manter`, `backup_ultimo`, `backup_ultimo_arquivo`, `backup_ultimo_erro`.

Troca de empresa: `ultima_idempresa`, `ultima_nomeempresa`, `ultimo_backup_aviso`.

## O que quebra na operação da loja se remover

- Backup antes do `TRUNCATE`: trocar o login de empresa apaga venda, NFC-e e fila da empresa anterior sem cópia.
- Incluir `numeracao_nfce` no `TRUNCATE` sem o `UPDATE` controlado: a constraint `ambiente = id` ou a ausência das linhas 1 e 2 impede nova emissão.
- Retenção agressiva no mesmo diretório do XML vivo: o código só remove arquivos que batem `NOME_BACKUP` dentro da pasta de backup. Não aponte `backup_pasta` para `xml-nfce`.
- Achar que backup desliga a necessidade de outbox: o ERP não lê o tar.gz.
