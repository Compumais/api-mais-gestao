# Monitoramento legislativo (v1)

Sem crawler. Periodicidade sugerida: toda Nota Técnica do Portal NF-e, convênio CONFAZ relevante, e alterações SEF/MG e SEFAZ/SP usadas pelos clientes.

Para cada alteração, registrar em `changelog/` (e, se impactar regra catalogada, criar evento com `status=PENDENTE_REVISAO`):

```json
{
  "event_id": "",
  "tipo": "NOTA_TECNICA",
  "numero": "",
  "versao": "",
  "data_publicacao": "",
  "vigencia": "",
  "descricao": "",
  "impacto": "",
  "regras_afetadas": [],
  "status": "PENDENTE_REVISAO"
}
```

Não encerrar vigência de regra antiga sem gravar histórico (rollback).
