# Pipeline de análise

Toda consulta considera a **DATA DA OPERAÇÃO**.

```text
1. Identificar a operação
        ↓
2. Extrair os dados fiscais
        ↓
3. Determinar UF e contexto
        ↓
4. Consultar regras locais
        ↓
5. Consultar regras nacionais
        ↓
6. Determinar legislação vigente na data
        ↓
7. Validar CFOP
        ↓
8. Validar NCM
        ↓
9. Validar CEST
        ↓
10. Validar CST/CSOSN
        ↓
11. Validar ICMS/ST/DIFAL/FCP
        ↓
12. Validar cálculos
        ↓
13. Validar XML
        ↓
14. Gerar relatório auditável
        ↓
15. Classificar resultado
```

## Classificações finais

| Código | Significado |
|--------|-------------|
| VALIDADO | Estrutura, totais e tributação crítica CONFIRMADAS |
| VALIDADO COM ALERTAS | Transmissão permitida; há ATENÇÃO que não impede |
| REGRA FISCAL NÃO CONFIRMADA | ST/DIFAL/FCP ou código fiscal sem regra `validado` vigente |
| ERRO DE CONFIGURAÇÃO | Cadastro ou parametrização incompatível com a operação |
| BUG DE SISTEMA | Totais/chave/campos gerados de forma inconsistente |
| ALTERAÇÃO LEGISLATIVA DETECTADA | Regra usada vigia em outra data |
| REVISÃO FISCAL NECESSÁRIA | CONFLITANTE ou INDETERMINADA que o motor não resolve |

## Bloqueio no emissor (v1)

Transmissão só segue se o resultado for `VALIDADO` ou `VALIDADO COM ALERTAS` **e** a tributação crítica estiver CONFIRMADA:

- CFOP e CST/CSOSN presentes e coerentes com CRT/UF (regras nacionais)
- ST, quando o CFOP (54xx/64xx) ou CST/CSOSN de ST indicar substituição
- DIFAL, quando a operação for interestadual a consumidor final não contribuinte

Sem isso: HTTP 400 `REGRA_FISCAL_NAO_CONFIRMADA` + relatório.
