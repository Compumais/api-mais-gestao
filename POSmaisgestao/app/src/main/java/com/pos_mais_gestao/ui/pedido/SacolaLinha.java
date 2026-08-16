package com.pos_mais_gestao.ui.pedido;

import com.pos_mais_gestao.domain.Produto;
import com.pos_mais_gestao.util.PizzaMeioAMeio;
import java.math.BigDecimal;

public class SacolaLinha {
    public final Produto produto;
    public final Produto produtoMeio;
    public final BigDecimal quantidade;
    public String observacao;

    public SacolaLinha(Produto produto, BigDecimal quantidade, String observacao) {
        this(produto, null, quantidade, observacao);
    }

    public SacolaLinha(Produto produto, Produto produtoMeio, BigDecimal quantidade, String observacao) {
        this.produto = produto;
        this.produtoMeio = produtoMeio;
        this.quantidade = quantidade;
        this.observacao = observacao;
    }

    public boolean isMeioAMeio() {
        return produtoMeio != null;
    }

    public String descricaoCupom() {
        if (produtoMeio == null) {
            return produto.getDescricao();
        }
        return PizzaMeioAMeio.descricao(produto, produtoMeio);
    }

    public BigDecimal subtotal() {
        BigDecimal unitario = produtoMeio == null
                ? produto.getPreco()
                : PizzaMeioAMeio.preco(produto, produtoMeio);
        return unitario.multiply(quantidade);
    }
}
