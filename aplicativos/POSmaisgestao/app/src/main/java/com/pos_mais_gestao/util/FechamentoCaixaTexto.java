package com.pos_mais_gestao.util;

import com.pos_mais_gestao.domain.ResumoTurnoCaixa;
import java.math.BigDecimal;

public final class FechamentoCaixaTexto {
    private FechamentoCaixaTexto() {}

    public static String montar(
            CupomTexto.Cabecalho cabecalho,
            ResumoTurnoCaixa resumo,
            BigDecimal saldoInformado,
            String observacao,
            String abertoEm) {
        return CupomTexto.fechamento(cabecalho, resumo, saldoInformado, observacao, abertoEm);
    }
}