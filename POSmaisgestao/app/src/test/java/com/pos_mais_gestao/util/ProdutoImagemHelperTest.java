package com.pos_mais_gestao.util;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

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

    @Test
    public void trocaProtocoloElectronPeloEndpointHttpDoPrincipal() {
        assertEquals(
                "http://192.168.1.10:5050/pos/imagens/produtos/abc",
                ProdutoImagemHelper.resolverUrl(
                        "http://192.168.1.10:5050",
                        "pdv-image://produto/cache.webp",
                        "/pos/imagens/produtos/abc"));
    }

    @Test
    public void naoTentaAbrirFilesystemWindowsNoAndroidSemFallback() {
        assertNull(
                ProdutoImagemHelper.resolverUrl(
                        "http://192.168.1.10:5050",
                        "C:\\PDV\\produto-imagens\\abc.webp"));
    }

    @Test
    public void enviaTokenSomenteAoMesmoServidor() {
        assertTrue(
                ProdutoImagemHelper.pertenceAoServidor(
                        "http://192.168.1.10:5050/pos/imagens/produtos/abc",
                        "http://192.168.1.10:5050"));
        assertFalse(
                ProdutoImagemHelper.pertenceAoServidor(
                        "http://192.168.1.10:50500/coleta",
                        "http://192.168.1.10:5050"));
    }
}
