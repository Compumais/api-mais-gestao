# NF-e — leiaute citável (não é tributação de produto)

Fonte: Portal Nacional da NF-e (MOC / schemas 4.00). Confirmar vigência na data da operação em https://www.nfe.fazenda.gov.br/

## Grupos ICMS no Simples (CRT 1)

`ICMSSN102` (CSOSN 102): origem + CSOSN. Não há `vBC`/`vICMS`/`vST` neste grupo. Totais da NF podem ter `vBC`/`vICMS`/`vST` zerados.

CSOSN típicos SN: 101, 102, 103, 201, 202, 203, 300, 400, 500, 900. CST (00, 10, 20…) é do regime normal (CRT 3).

## CFOP — primeiro dígito (tabela CFOP / Ajuste SINIEF)

- `5xxx` — operações internas (idDest=1)
- `6xxx` — interestaduais (idDest=2)
- `7xxx` — exterior (idDest=3)

`5401` na tabela CFOP: venda de produção do estabelecimento em operação com produto sujeito ao regime de substituição tributária. Essa é a **definição do código**, não a prova de que o produto da nota se sujeita a ST na UF/data.

## Autorização SEFAZ

`cStat=100` confirma aceite do documento eletrônico, não a correção do enquadramento no RICMS.
