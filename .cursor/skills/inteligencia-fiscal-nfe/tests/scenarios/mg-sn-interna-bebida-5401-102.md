# Cenário: NF-e homologação MG — bebida, CFOP 5401, CSOSN 102

Fonte do exemplo: XML de homologação autorizado em 19/08/2026 (`cStat=100`). Certificado e assinatura omitidos de propósito.

## Input sanitizado

- Data: 2026-08-19
- Emitente: MG, CRT=1, município 3156908
- Destinatário: MG, homologação, indIEDest=9, indFinal=1, idDest=1
- Itens NCM 22084000, CEST 0200400, CFOP 5401, CSOSN 102, orig 0
- vProd itens: 75 + 90 + 135 + 70 + 60 = 430
- vProd total = vNF = 430; vBCST = vST = 0
- PIS/COFINS CST 07
- tpAmb=2

## Esperado do motor

| Camada | Resultado |
|--------|-----------|
| Matemática | VALIDO |
| CFOP 5xxx × interna | CONFIRMADA (estrutura) |
| CRT 1 × CSOSN | CONFIRMADA (estrutura) |
| Definição CFOP 5401 (código de ST) | CONFIRMADA como *significado do código* |
| ST aplicável a este NCM/CEST em MG na data | INDETERMINADA |
| CFOP 54xx + vST=0 | ATENÇÃO |
| Classificação final | REGRA FISCAL NÃO CONFIRMADA |
| Transmissão | bloquear |

Não concluir que 5401 está certo nem errado para cachaça em MG.
