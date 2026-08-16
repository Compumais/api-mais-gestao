package com.pos_mais_gestao.domain;

import com.pos_mais_gestao.util.PizzaMeioAMeio;
import java.math.BigDecimal;
import java.math.RoundingMode;

public class ItemCarrinho {
    private final Produto produto;
    private final Produto produtoMeio;
    private BigDecimal quantidade;

    public ItemCarrinho(Produto produto, BigDecimal quantidade) {
        this(produto, null, quantidade);
    }

    public ItemCarrinho(Produto produto, Produto produtoMeio, BigDecimal quantidade) {
        this.produto = produto;
        this.produtoMeio = produtoMeio;
        this.quantidade = quantidade;
    }

    public Produto getProduto() {
        return produto;
    }

    public Produto getProdutoMeio() {
        return produtoMeio;
    }

    public boolean isMeioAMeio() {
        return produtoMeio != null;
    }

    public String getDescricaoExibicao() {
        if (produtoMeio == null) {
            return produto.getDescricao();
        }
        return PizzaMeioAMeio.descricao(produto, produtoMeio);
    }

    public Produto getProdutoFiscal() {
        if (produtoMeio == null) {
            return produto;
        }
        return PizzaMeioAMeio.principal(produto, produtoMeio);
    }

    public BigDecimal getPrecoUnitario() {
        if (produtoMeio == null) {
            return produto.getPreco();
        }
        return PizzaMeioAMeio.preco(produto, produtoMeio);
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
        return getPrecoUnitario().multiply(quantidade).setScale(2, RoundingMode.HALF_UP);
    }
}
