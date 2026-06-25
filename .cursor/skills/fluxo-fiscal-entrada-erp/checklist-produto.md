# Checklist — estrutura do produto na entrada fiscal

Referência para a skill `fluxo-fiscal-entrada-erp`. Marcar cada grupo: **OK** | **Parcial** | **Faltando** | **N/A**.

## Identificação

| Campo | Origem típica | Persistir? | Notas |
|-------|---------------|------------|-------|
| Código interno | ERP | Sim | Chave do cadastro |
| Código fornecedor | XML (`cProd`) | Histórico + vínculo | Pode mudar entre NFs |
| GTIN/EAN | XML (`cEAN`) | Sim no produto | Validar duplicidade |
| Descrição | XML + usuário | Sim | Descrição fiscal vs comercial |
| NCM | XML | Sim | Validar tabela |
| CEST | XML | Sim quando aplicável | ST / substituição |

## Unidade e quantidade

| Campo | Origem típica | Persistir? | Notas |
|-------|---------------|------------|-------|
| Unidade comercial | XML (`uCom`) | Histórico no item | |
| Unidade tributável | XML (`uTrib`) | Histórico no item | |
| Fator conversão | Usuário/cálculo | Sim no item | Estoque ≠ XML |
| Quantidade XML | XML | Histórico | |
| Quantidade estoque | Cálculo | Sim no movimento | |

## Tributação (entrada)

| Campo | Origem típica | Persistir? | Notas |
|-------|---------------|------------|-------|
| Origem | XML | Sim | Emissão futura |
| CST ICMS / CSOSN | XML | Sim no item | Regime da empresa importa |
| CST IPI | XML | Sim | |
| CST PIS / COFINS | XML | Sim | |
| CFOP entrada | XML + regra | Sim | Pode exigir de/para saída |
| Alíquotas | XML | Histórico | |
| Bases de cálculo | XML | Histórico | |
| Valores ICMS, IPI, PIS, COFINS | XML | Histórico | |

## Valores e custo

| Campo | Origem típica | Persistir? | Notas |
|-------|---------------|------------|-------|
| Valor unitário XML | XML | Histórico | |
| Valor bruto / total | XML | Histórico | |
| Desconto | XML | Histórico | Rateio se por NF |
| Frete | XML cabeçalho/item | Rateio | Impacta custo |
| Seguro | XML | Rateio | |
| Outras despesas | XML | Rateio | |
| Valor líquido | Cálculo | Pode recalcular | |
| Custo contábil | Cálculo + política | Sim no custo | |
| Custo gerencial | Cálculo + política | Sim | |
| Preço de venda | Usuário | Cadastro produto | Não confundir com custo |

## Controle (quando aplicável)

| Campo | Origem típica | Persistir? | Notas |
|-------|---------------|------------|-------|
| Lote | XML/rastreio | Movimento | |
| Validade | XML/rastreio | Movimento | |
| Série | XML | Movimento | |
| Controle de estoque | Cadastro | Produto | |
| Rastreabilidade | XML | Movimento | |

## Perguntas por regime (se não informado)

Antes de cravar regra de ICMS/PIS/COFINS/crédito:

1. Regime tributário da empresa?
2. UF origem/destino?
3. Operação: revenda, industrialização, uso/consumo?
4. Substituto tributário / ST na entrada?
