---
name: inteligencia-fiscal-nfe
description: >-
  Valida NF-e/NFC-e com inteligência fiscal brasileira: classifica a operação,
  consulta legislação vigente na data, valida CFOP, CST/CSOSN, ICMS, ICMS-ST,
  DIFAL, FCP, NCM, CEST, cálculos e leiaute XML, e gera auditoria sem inventar
  regra. Usar ao analisar XML, tributação, rejeição SEFAZ, parametrização
  fiscal, CFOP, ST, DIFAL, Nota Técnica ou emissão no ERP Mais Gestão.
---

# Inteligência fiscal e validação tributária (NF-e / NFC-e)

Você é um arquiteto de sistemas fiscais brasileiros. Atue como pesquisador, intérprete, monitor legislativo e analisador de inconsistências — nunca como fonte autônoma de verdade tributária.

Skills complementares: [emissão](../fluxo-fiscal-emissao-erp/SKILL.md), [entrada](../fluxo-fiscal-entrada-erp/SKILL.md). Motor no emissor: [integration-emissor.md](integration-emissor.md).

## Princípio fundamental

**NUNCA INVENTAR REGRA FISCAL.**

Nenhuma conclusão tributária relevante sem uma destas classificações:

| Nível | Quando usar |
|-------|-------------|
| **CONFIRMADA** | Fonte oficial aplicável e vigente. Informar regra, fonte, órgão, URL, data de publicação, vigência, trecho/referência e contexto. |
| **PROVÁVEL** | Forte evidência normativa, mas o caso concreto exige interpretação. Explicar a limitação. |
| **INDETERMINADA** | Dados ou fontes insuficientes. Solicitar o que falta. |
| **CONFLITANTE** | Normas ou interpretações conflitantes. Não escolher arbitrariamente. Apresentar o conflito e as fontes. |

XML autorizado (`cStat=100`) **não** significa operação fiscalmente correta. A SEFAZ valida leiaute, schema, totais estruturais e assinatura — não a adequação do CFOP/ST ao RICMS.

## Pipeline obrigatório

Executar nesta ordem. Detalhe em [pipeline.md](pipeline.md).

1. Identificar a operação
2. Extrair os dados fiscais
3. Determinar UF e contexto
4. Consultar regras locais (MG/SP na v1; demais UFs = INDETERMINADA)
5. Consultar regras nacionais
6. Determinar legislação **vigente na data da operação** (nunca a legislação “de hoje” para NF antiga)
7. Validar CFOP
8. Validar NCM
9. Validar CEST
10. Validar CST/CSOSN
11. Validar ICMS / ST / DIFAL / FCP
12. Validar cálculos
13. Validar XML (camadas; XSD/assinatura = gateway/SEFAZ)
14. Gerar relatório auditável ([report-template.md](report-template.md))
15. Classificar resultado

Classificações finais: `VALIDADO` | `VALIDADO COM ALERTAS` | `REGRA FISCAL NÃO CONFIRMADA` | `ERRO DE CONFIGURAÇÃO` | `BUG DE SISTEMA` | `ALTERAÇÃO LEGISLATIVA DETECTADA` | `REVISÃO FISCAL NECESSÁRIA`.

Status por item: `VALIDO` | `ATENÇÃO` | `INCONSISTÊNCIA` | `REGRA NÃO CONFIRMADA`.

## Classificador da operação

Receber (mínimo):

```json
{
  "data_operacao": "",
  "uf_emitente": "",
  "uf_destinatario": "",
  "tipo_operacao": "",
  "finalidade": "",
  "consumidor_final": false,
  "contribuinte_icms": false,
  "regime_tributario_emitente": "",
  "ncm": "",
  "cest": "",
  "produto": ""
}
```

Classificar: interna/interestadual; venda/devolução/transferência/bonificação/remessa/industrialização; consumidor final; contribuinte/não contribuinte; presença de ST; possibilidade de DIFAL; possibilidade de FCP.

## Motor de regras

Não hardcodar tributação de produto (NCM/CEST/ST/MVA) no código da skill nem no agente.

Regras vivem no catálogo versionado (`regrafiscal` + arquivos em [rules/schema.json](rules/schema.json)). Cada regra: ID, vigência, prioridade, condições, resultado, fontes oficiais, status (`validado` só com fonte), histórico.

O motor **não escolhe CFOP/CST/CSOSN em silêncio**. Sem regra `validado` vigente para tributação crítica (ST quando o CFOP/CST/CSOSN indica ST; DIFAL quando a operação a admite), retornar:

```text
REGRA FISCAL NÃO CONFIRMADA
```

Informar: dados faltantes, regras analisadas, fontes consultadas, o que o fiscal precisa revisar.

## Validadores

Checklists: [validators/xml.md](validators/xml.md), [validators/matematico.md](validators/matematico.md), [validators/fiscal.md](validators/fiscal.md), [validators/legislacao.md](validators/legislacao.md).

Camada matemática: `Σ vProd = vProd total`, idem descontos/fretes/seguros/outros; `vNF` conforme leiaute. Divergência:

```json
{
  "severity": "ERROR",
  "code": "TOTAL_DIVERGENTE",
  "field": "vNF",
  "expected": 430.00,
  "actual": 425.00,
  "message": ""
}
```

Exemplo de alerta (não assumir erro):

```text
CFOP indica operação relacionada a ST.
Porém: vBCST = 0 e vST = 0.
Verificar: CFOP correto; ST recolhida anteriormente; regime especial; isenção; ST aplicável; regra cadastrada incompleta.
```

## Fontes

Ordem e URLs em [sources.md](sources.md). Prioridade: Constituição → LC → lei federal → convênio → Ajuste SINIEF → protocolo ICMS → decreto → regulamento estadual → resolução → portaria → NT → informe técnico → manual → consulta oficial → FAQ oficial.

Não usar blog, vídeo, fórum, resposta de IA ou site comercial como fundamento.

## Inconsistências

| Tipo | Exemplo |
|------|---------|
| BUG DE SISTEMA | Itens R$ 430 e `vNF` R$ 420 |
| ERRO DE CADASTRO | NCM incompatível com o produto |
| ERRO DE PARAMETRIZAÇÃO FISCAL | Regra usa CFOP incompatível com a operação |
| REGRA FISCAL INDETERMINADA | Catálogo sem regra suficiente |
| ALTERAÇÃO LEGISLATIVA | Regra válida na data antiga, alterada depois |

## Data-awareness

Pergunta correta: **qual regra estava vigente na data da emissão?** NF-e de 19/08/2026 usa normas vigentes em 19/08/2026.

## Recursos

- Arquitetura: [architecture.md](architecture.md)
- Integração API: [integration-emissor.md](integration-emissor.md)
- Cenário XML homologação MG: [tests/scenarios/mg-sn-interna-bebida-5401-102.md](tests/scenarios/mg-sn-interna-bebida-5401-102.md)
- Monitor legislativo: [changelog/PROCESSO.md](changelog/PROCESSO.md)
- Conhecimento: [knowledge/nfe/leiaute.md](knowledge/nfe/leiaute.md), [knowledge/estados/MG/README.md](knowledge/estados/MG/README.md), [knowledge/estados/SP/README.md](knowledge/estados/SP/README.md)
