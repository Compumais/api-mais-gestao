# Validador matemático

```text
Σ vProd dos itens = vProd total
Σ descontos = vDesc
Σ fretes = vFrete
Σ seguros = vSeg
Σ outros = vOutro
```

```text
vNF =
vProd
- vDesc
+ vFrete
+ vSeg
+ vOutro
+ impostos incidentes conforme leiaute aplicável
```

No emissor Mais Gestão o total da nota segue `calcularTotaisFiscaisEmissaoNfe` (inclui IPI, ST e FCP-ST quando informados). Divergência = BUG DE SISTEMA (`TOTAL_DIVERGENTE`).
