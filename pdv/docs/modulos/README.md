# Módulos do PDV

Leia [`../../AGENTS.md`](../../AGENTS.md) antes destes arquivos. Cada módulo descreve o que o código faz hoje e o que a loja perde se o fluxo for removido ou “simplificado”.

| Módulo | Arquivo | Papel na loja |
| --- | --- | --- |
| Banco local | [banco-local.md](banco-local.md) | Postgres do caixa, migração e config |
| Sessão e configuração | [sessao-configuracao.md](sessao-configuracao.md) | Login, empresa, chaves de `config` |
| Catálogo | [catalogo.md](catalogo.md) | Produtos, preços e atalhos em cache |
| Venda e pagamento | [venda-pagamento.md](venda-pagamento.md) | Cupom, meios e fechamento |
| Caixa | [caixa.md](caixa.md) | Turno, suprimento e conferência |
| Fiscal NFC-e | [fiscal-nfce.md](fiscal-nfce.md) | Emissão, contingência, número e XML |
| Sync e outbox | [sync-outbox.md](sync-outbox.md) | Fila até a API |
| Mesas, gourmet e delivery | [mesas-gourmet-delivery.md](mesas-gourmet-delivery.md) | Conta, comanda, entrega e fila de produção |
| Impressão | [impressao.md](impressao.md) | DANFC-e, cupom e pedido de cozinha |
| LAN e POS | [lan-pos.md](lan-pos.md) | Maquininha Android no desktop |
| PDV secundário | [pdv-secundario.md](pdv-secundario.md) | Terminal extra sem banco fiscal próprio |
| Integrações | [integracoes-perifericos.md](integracoes-perifericos.md) | SiTef, balança e Tecnibra |
| Backup | [backup.md](backup.md) | Cópia local e troca de empresa |
| Atualização e instalador | [atualizacao-installer.md](atualizacao-installer.md) | Versão, setup e preservação do banco |

## Mapa rápido

```
src/                         renderer React (sem Postgres)
electron/main.ts             boot, IPC, timers
electron/preload.ts          window.pdv
electron/local-api/          contrato da UI e da LAN
electron/db/                 pool, schema, repos
electron/api/client.ts       HTTP da API
electron/sync/               outbox, catálogo, NFC-e, backup, cardápio delivery
electron/fiscal/             XML, número, contingência
electron/lan-api/            HTTP :lan_porta para POS e secundário
electron/pdv-secundario/     modo principal/secundário
installer/                   Inno Setup + manifesto de update
```

`planos/` descreve etapas de produto. Não é contrato de execução.
