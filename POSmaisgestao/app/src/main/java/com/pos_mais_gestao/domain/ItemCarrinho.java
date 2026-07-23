package com.pos_mais_gestao.domain;

import java.math.BigDecimal;
import java.math.RoundingMode;

public class ItemCarrinho {
    private final Produto produto;
    private BigDecimal quantidade;

    public ItemCarrinho(Produto produto, BigDecimal quantidade) {
        this.produto = produto;
        this.quantidade = quantidade;
    }

    public Produto getProduto() {
        return produto;
    }

    public BigDecimal getQuantidade() {
        return quantidade;
    }

    public void setQuantidade(BigDecimal quantidade) {
        this.quantidade = quantidade;
    }

    public void incrementar() {
        quantidade = quantidade.add(BigDecimal.ONE);
    }

    public void decrementar() {
        BigDecimal nova = quantidade.subtract(BigDecimal.ONE);
        if (nova.compareTo(BigDecimal.ZERO) < 0) {
            nova = BigDecimal.ZERO;
        }
        quantidade = nova;
    }

    public BigDecimal getSubtotal() {
        return produto.getPreco().multiply(quantidade).setScale(2, RoundingMode.HALF_UP);
    }
}
