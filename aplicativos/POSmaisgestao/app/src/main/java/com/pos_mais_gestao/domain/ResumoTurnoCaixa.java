package com.pos_mais_gestao.domain;

import java.math.BigDecimal;
import java.math.RoundingMode;

public class ResumoTurnoCaixa {
    public int qtdVendas;
    public PagamentosResumo pagamentos = PagamentosResumo.vazio();
    public BigDecimal totalVendas = BigDecimal.ZERO;
    public BigDecimal suprimento = BigDecimal.ZERO;
    /** Total vendido no turno (todas as formas) — persiste em saldoapurado. */
    public BigDecimal saldoapurado = BigDecimal.ZERO;
    /** Suprimento + dinheiro líquido — base da conferência física da gaveta. */
    public BigDecimal saldoCaixaFisico = BigDecimal.ZERO;

    public void recalcular() {
        if (pagamentos != null) {
            pagamentos.arredondar();
            totalVendas = pagamentos.total;
            saldoapurado = pagamentos.total;
        }
        suprimento = arred(suprimento);
        saldoCaixaFisico = arred(suprimento.add(
                pagamentos != null ? pagamentos.dinheiro : BigDecimal.ZERO));
    }

    private static BigDecimal arred(BigDecimal v) {
        if (v == null) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        return v.setScale(2, RoundingMode.HALF_UP);
    }
}
