# Relatório de auditoria fiscal

```json
{
  "operacao_id": "abc123",
  "classificacao_final": "REGRA FISCAL NÃO CONFIRMADA",
  "permitir_transmissao": false,
  "operacao": {
    "interna_interestadual": "interna",
    "tipo": "venda",
    "consumidor_final": true,
    "contribuinte_icms": false,
    "possibilidade_st": true,
    "possibilidade_difal": false,
    "possibilidade_fcp": false
  },
  "decisao": {
    "cfop": "5401",
    "csosn": "102",
    "cst": null,
    "st": "NAO_CONFIRMADA",
    "difal": "NAO_APLICAVEL",
    "fcp": "NAO_CONFIRMADA"
  },
  "nivel_confianca": "INDETERMINADA",
  "fontes": [
    {
      "orgao": "CONFAZ",
      "documento": "Tabela CFOP / Ajuste SINIEF",
      "url": "https://www.confaz.fazenda.gov.br/",
      "vigencia": "vigente na data da operação"
    }
  ],
  "regras_aplicadas": ["NAC-CFOP-IDDEST-001", "NAC-CRT-CSOSN-001"],
  "validacoes": [
    {
      "status": "VALIDO",
      "code": "TOTAIS_OK",
      "message": "Σ vProd = vProd = vNF"
    },
    {
      "status": "ATENCAO",
      "code": "CFOP_ST_SEM_VALOR",
      "message": "CFOP 54xx com vBCST=0 e vST=0"
    }
  ],
  "inconsistencias": [
    {
      "tipo": "REGRA FISCAL INDETERMINADA",
      "code": "ST_NAO_CONFIRMADA"
    }
  ]
}
```

Objetivo: responder “por que o sistema usou esse CFOP?” com a regra, UFs, NCM, CEST, CRT e vigência na data da emissão.
