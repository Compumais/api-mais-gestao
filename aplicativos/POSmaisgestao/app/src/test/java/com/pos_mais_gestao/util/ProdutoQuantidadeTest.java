package com.pos_mais_gestao.util;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import com.pos_mais_gestao.domain.Produto;
import java.math.BigDecimal;
import org.junit.Test;

public class ProdutoQuantidadeTest {
    @Test
    public void detectaVariacoesDeQuilograma() {
        assertTrue(ProdutoQuantidade.unidadeQuilograma("KG"));
        assertTrue(ProdutoQuantidade.unidadeQuilograma(" kg "));
        assertTrue(ProdutoQuantidade.unidadeQuilograma("Quilograma"));
        assertTrue(ProdutoQuantidade.unidadeQuilograma("quilogramas"));
        assertTrue(ProdutoQuantidade.unidadeQuilograma("quilos"));
    }

    @Test
    public void naoConfundeOutrasUnidades() {
        assertFalse(ProdutoQuantidade.unidadeQuilograma("UN"));
        assertFalse(ProdutoQuantidade.unidadeQuilograma("G"));
        assertFalse(ProdutoQuantidade.unidadeQuilograma("CX"));
        assertFalse(ProdutoQuantidade.unidadeQuilograma(null));
    }

    @Test
    public void reconheceQuilogramaPeloIdQuandoASiglaNaoVemNaApi() {
        Produto produto = new Produto(
                "p",
                "Queijo",
                new BigDecimal("40.00"),
                null,
                "A0000001-0000-4000-8000-000000000002",
                35);
        assertTrue(ProdutoQuantidade.vendidoPorQuilograma(produto));
        assertEquals("KG", produto.getUnidadeMedida());
    }

    @Test
    public void mantemUnidadeQueNaoEQuilograma() {
        Produto produto = new Produto(
                "p",
                "Agua",
                new BigDecimal("5.00"),
                "UN",
                "a0000001-0000-4000-8000-000000000001",
                2);
        assertFalse(ProdutoQuantidade.vendidoPorQuilograma(produto));
        assertEquals("UN", produto.getUnidadeMedida());
    }

    @Test
    public void normalizaDecimalSemArredondar() {
        assertEquals(new BigDecimal("0.35"), ProdutoQuantidade.normalizar("0,350"));
        assertEquals(new BigDecimal("1.2345"), ProdutoQuantidade.normalizar("1.2345"));
        assertEquals(new BigDecimal("1234.5"), ProdutoQuantidade.normalizar("1.234,500"));
        assertEquals("0,35", ProdutoQuantidade.exibir(new BigDecimal("0.350")));
    }

    @Test
    public void rejeitaQuantidadeInvalidaOuNaoPositiva() {
        assertNull(ProdutoQuantidade.normalizar(""));
        assertNull(ProdutoQuantidade.normalizar("abc"));
        assertNull(ProdutoQuantidade.normalizar("0"));
        assertNull(ProdutoQuantidade.normalizar("-0,5"));
    }
}
