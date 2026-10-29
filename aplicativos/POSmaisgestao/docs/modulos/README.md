# Módulos do POS Android

Documentação para agentes. Confirmada no código de `POSmaisgestao/` (Java, Activities, OkHttp). Este app não compartilha código com `web/` nem `pdv/`.

| Documento | O que cobre |
|---|---|
| [app-shell.md](app-shell.md) | Application, launcher, navegação, Activities |
| [autenticacao.md](autenticacao.md) | Login, empresa, token |
| [configuracao-build.md](configuracao-build.md) | URL, modo cloud/local, Gradle |
| [pagamento.md](pagamento.md) | Meios, PIX QR, ausência de TEF |
| [venda-fiscal.md](venda-fiscal.md) | Venda rápida, NFC-e, DAV, caixa |
| [mesas-comandas.md](mesas-comandas.md) | Mesas, comanda, fila de pedidos |
| [integracao-api.md](integracao-api.md) | `ApiClient` e `LocalPdvApi` |
| [persistencia-offline.md](persistencia-offline.md) | Prefs, catálogo SQLite, outbox |
| [perifericos.md](perifericos.md) | Impressora, balança, câmera |

Leitura obrigatória antes de alterar venda ou HTTP: [pagamento.md](pagamento.md), [venda-fiscal.md](venda-fiscal.md), [integracao-api.md](integracao-api.md), [configuracao-build.md](configuracao-build.md).

Índice do pacote para agentes: [../../AGENTS.md](../../AGENTS.md).
