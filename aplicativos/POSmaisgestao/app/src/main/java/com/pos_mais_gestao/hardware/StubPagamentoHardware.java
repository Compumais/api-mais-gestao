package com.pos_mais_gestao.hardware;

import com.pos_mais_gestao.domain.MeioPagamento;
import java.math.BigDecimal;

/**
 * Stub até definir fabricante/SDK da maquininha.
 * O fluxo atual registra o meio na API sem TEF nativo.
 */
public class StubPagamentoHardware implements PagamentoHardware {
    @Override
    public boolean estaDisponivel() {
        return false;
    }

    @Override
    public ResultadoPagamentoHardware pagar(MeioPagamento meio, BigDecimal valor) {
        return new ResultadoPagamentoHardware(
                false,
                null,
                null,
                "TEF/PIX nativo não configurado. Informe o fabricante/SDK da maquininha.");
    }
}
