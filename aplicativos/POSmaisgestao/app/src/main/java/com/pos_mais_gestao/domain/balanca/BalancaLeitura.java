package com.pos_mais_gestao.domain.balanca;

import java.math.BigDecimal;

public final class BalancaLeitura {
    private final BalancaEstado estado;
    private final BigDecimal pesoKg;
    private final String mensagem;

    public BalancaLeitura(BalancaEstado estado, BigDecimal pesoKg, String mensagem) {
        this.estado = estado;
        this.pesoKg = pesoKg;
        this.mensagem = mensagem;
    }

    public static BalancaLeitura estado(BalancaEstado estado, String mensagem) {
        return new BalancaLeitura(estado, null, mensagem);
    }

    public static BalancaLeitura peso(BigDecimal pesoKg) {
        return new BalancaLeitura(BalancaEstado.ESTAVEL, pesoKg, "Peso estável");
    }

    public BalancaEstado getEstado() {
        return estado;
    }

    public BigDecimal getPesoKg() {
        return pesoKg;
    }

    public String getMensagem() {
        return mensagem;
    }

    public boolean isPesoValido() {
        return estado == BalancaEstado.ESTAVEL
                && pesoKg != null
                && pesoKg.compareTo(BigDecimal.ZERO) > 0;
    }
}
