# Validador fiscal

## Produto

- NCM com 8 dígitos?
- NCM vigente? (sem tabela de vigência = INDETERMINADA além do formato)
- Produto compatível com NCM? Sem fonte, não afirmar.
- CEST obrigatório se CST/CSOSN de ST ou vST > 0 (já no emissor).
- CEST × NCM: só CONFIRMADA com tabela COTEPE vigente.

## Operação

Natureza, CFOP, UF origem/destino, finalidade, destinatário, contribuinte, consumidor final.

## ICMS

Coerência CRT × CST/CSOSN × CFOP × origem × ICMS × ST × FCP × DIFAL.

CFOP 54xx/64xx com `vBCST=0` e `vST=0` → ATENÇÃO, não erro automático. ST permanece NÃO CONFIRMADA sem regra catalogada.
