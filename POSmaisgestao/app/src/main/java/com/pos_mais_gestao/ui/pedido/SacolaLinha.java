package com.pos_mais_gestao.ui.pedido;

import com.pos_mais_gestao.domain.Produto;
import java.math.BigDecimal;

public class SacolaLinha {
    public final Produto produto;
    public final BigDecimal quantidade;
    public String observacao;

    public SacolaLinha(Produto produto, BigDecimal quantidade, String observacao) {
        this.produto = produto;
        this.quantidade = quantidade;
        this.observacao = observacao;
    }

    public BigDecimal subtotal() {
        return produto.getPreco().multiply(quantidade);
    }
}
