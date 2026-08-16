package com.pos_mais_gestao.domain;

import java.math.BigDecimal;
import java.math.RoundingMode;

public class PagamentosResumo {
    public BigDecimal dinheiro = BigDecimal.ZERO;
    public BigDecimal cartao = BigDecimal.ZERO;
    public BigDecimal pix = BigDecimal.ZERO;
    public BigDecimal prepago = BigDecimal.ZERO;
    public BigDecimal total = BigDecimal.ZERO;

    public static PagamentosResumo vazio() {
        return new PagamentosResumo();
    }

    public void somar(PagamentosResumo outro) {
        if (outro == null) {
            return;
        }
        dinheiro = dinheiro.add(outro.dinheiro);
        cartao = cartao.add(outro.cartao);
        pix = pix.add(outro.pix);
        prepago = prepago.add(outro.prepago);
        total = total.add(outro.total);
    }

    public PagamentosResumo arredondar() {
        dinheiro = arred(dinheiro);
        cartao = arred(cartao);
        pix = arred(pix);
        prepago = arred(prepago);
        total = arred(total);
        return this;
    }

    private static BigDecimal arred(BigDecimal v) {
        return v.setScale(2, RoundingMode.HALF_UP);
    }
}
