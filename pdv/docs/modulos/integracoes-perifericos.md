# Integrações (SiTef, balança, Tecnibra)

## Propósito no caixa

Periféricos opcionais. A venda em dinheiro/PIX manual não depende deles. Cartão integrado, peso e comanda eletrônica dependem.

## Onde vive

- **SiTef:** `electron/integracao/sitef/` (`servico.ts`, `dll.ts`, `mapeamento.ts`). Pagamento e cancelamento na CliSiTef. NSU, autorização e bandeira vão para `pagamento`.
- **Balança:** `electron/integracao/balanca/` (serial, protocolo Toledo e etiqueta). Peso entra na quantidade do item (`src/lib/produto-kg.ts`, `dialog-quantidade-peso.tsx`).
- **Tecnibra:** `electron/integracao/tecnibra/` grava XML de comandas no caminho configurado. O boot chama `iniciarTecnibra`. Falha no start só vai para o log; o caixa sobe.
- **Renderer:** blocos na tela de config. Não carregam DLL.

Nenhuma dessas pastas chama a API do ERP por conta própria. O efeito no ERP é o lançamento `pagamento` / a venda já sincronizada pela outbox.

## Contrato com a API

SiTef fala com o servidor SiTef (IP em config), não com a API Mais Gestão.

Balança é porta serial local.

Tecnibra é arquivo XML no disco (caminho default no seed, pasta de um produto de terceiros). **Não confirmado** leitura desse XML pela API.

Bandeira e tipo de documento usados no lançamento vêm do cache (`bandeira_cartao`, `meio_pagamento`), carregado no pull.

## Dados locais que não podem ser apagados no schema

`pagamento.nsu`, `autorizacao`, `bandeira`, `status`. Sem isso o comprovante de cartão e o cancelamento SiTef perdem o vínculo. O cupom em dinheiro continua.

Não há tabela SiTef separada. A transação aprovada precisa permanecer no `pagamento` da venda.

## Comportamento offline/outbox

SiTef pode autorizar o cartão com a rede da adquirente no ar e a API do ERP fora. O lançamento fica na venda local e sobe com `criar_venda`. Apagar o NSU antes do sync manda pagamento sem comprovante para o ERP.

Se o sync for simplificado e a venda não esperar o retorno SiTef, o caixa registra cartão sem autorização.

Tecnibra e balança não entram na outbox. Desligar o sync não atualiza comanda eletrônica nem peso.

## Configuração crítica

SiTef (todas locais, não copiar do principal): `sitef_habilitado`, `sitef_ip`, `sitef_loja`, `sitef_terminal`, `sitef_parametros`, `sitef_porta_pinpad`, `sitef_dll_path`. Não grave loja/terminal reais em documento de exemplo.

Balança: `balanca_habilitada`, `balanca_porta`, `balanca_baud`, `balanca_protocolo`. Etiqueta: `etiqueta_balanca_habilitada`, `etiqueta_balanca_prefixo`, `etiqueta_balanca_digitos_codigo`, `etiqueta_balanca_conteudo`, `etiqueta_balanca_centavos`, `etiqueta_balanca_indicador_uso`. Essas chaves de etiqueta estão em `CHAVES_CONFIG_NEGOCIO` (o secundário herda a regra da etiqueta, não a porta serial).

Tecnibra: `tecnibra_habilitada`, `tecnibra_xml_path`, `tecnibra_intervalo_ms`, `tecnibra_xml_root`, `tecnibra_xml_item`, `tecnibra_casas_comanda`, `tecnibra_ignorar_dv_comanda`. Exigem módulo gourmet na lista `CHAVES_CONFIG_GOURMET`.

## O que quebra na operação da loja se remover

- SiTef com a loja dependente de TEF: o cartão não autoriza no pinpad. Dinheiro e PIX digitados seguem se o meio existir.
- Mapeamento NSU: o comprovante e o cancelamento não acham a transação; a venda ainda pode gravar o valor.
- Balança / etiqueta: item de peso sai com quantidade errada e o preço do kg não fecha.
- Tecnibra: a comanda eletrônica não recebe o número. Mesa e impressão de produção do PDV seguem.
