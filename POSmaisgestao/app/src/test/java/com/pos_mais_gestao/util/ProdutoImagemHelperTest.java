package com.pos_mais_gestao.util;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

public class ProdutoImagemHelperTest {
    @Test
    public void resolveReferenciaRelativaContraServidorAtual() {
        assertEquals(
                "http://192.168.1.10:5050/pos/imagens/produtos/abc",
                ProdutoImagemHelper.resolverUrl(
                        "http://192.168.1.10:5050/",
                        "/pos/imagens/produtos/abc"));
    }

    @Test
    public void preservaUrlAbsolutaDaNuvem() {
        assertEquals(
                "https://cdn.exemplo.com/produto.webp",
                ProdutoImagemHelper.resolverUrl(
                        "https://api.exemplo.com",
                        "https://cdn.exemplo.com/produto.webp"));
    }
}
