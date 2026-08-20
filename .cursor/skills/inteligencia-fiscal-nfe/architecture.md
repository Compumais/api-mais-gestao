# Arquitetura da skill e do motor

A IA pesquisa, interpreta e audita. O emissor aplica só regras determinísticas `validado` + vigentes.

```text
ERP / Cadastro
      ↓
Dados da operação
      ↓
Motor fiscal determinístico  ←  Base versionada + vigência
      ↓
Validadores (cálculo + coerência + legislação catalogada)
      ↓
CONFIRMADA → XML / SEFAZ
não confirmada → bloqueio + auditoria
```

## Módulos

| # | Módulo | Onde |
|---|--------|------|
| 1 | Classificador da operação | `api/src/service/fiscal/classificar-operacao-fiscal.ts` |
| 2 | Motor de regras | tabela `regrafiscal` + `resolver-regras-fiscais.ts` |
| 3 | Validador XML | campos/cardinalidade no motor; XSD/assinatura = gateway PHP + SEFAZ |
| 4 | Validador fiscal | `validar-coerencia-fiscal-nfe.ts` |
| 5 | Consulta à legislação | esta skill + fontes em [sources.md](sources.md) |
| 6 | Monitoramento legislativo | [changelog/PROCESSO.md](changelog/PROCESSO.md) (manual na v1) |
| 7 | Auditoria | `auditoriafiscalnfe` + [report-template.md](report-template.md) |
| 8 | Data-awareness | match por `data_operacao` vs `vigencia_inicio`/`vigencia_fim` |
| 9 | Testes | `api/src/service/fiscal/*.test.ts` + [tests/scenarios/](tests/scenarios/) |
| 10 | Tipo de inconsistência | `classificar-inconsistencia-fiscal.ts` |

## Catálogo vs parametrização da empresa

- `parametrizacaotributos` — de/para de cadastro da empresa (sugestão). Sem fonte nem vigência. Não é verdade tributária.
- `regrafiscal` — catálogo com fonte, vigência, status e histórico. Só `validado` libera tributação crítica.

## Cobertura v1

- Nacional: CFOP×UF, CRT×CST/CSOSN, formato NCM/CEST, totais, grupo ICMSSN102.
- Estaduais: esqueleto MG e SP. Demais UFs = INDETERMINADA.
- ST/MVA/DIFAL/FCP por NCM: só se um fiscal gravar regra `validado` com fonte.

## Fora da v1

Crawler legislativo, XSD no Node, cálculo automático de MVA/ST/DIFAL, NFC-e no mesmo gancho (classificador já é compartilhado).
