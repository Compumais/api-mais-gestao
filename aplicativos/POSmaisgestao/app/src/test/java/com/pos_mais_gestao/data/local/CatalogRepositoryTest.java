package com.pos_mais_gestao.data.local;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

import org.junit.Test;

public class CatalogRepositoryTest {
    @Test
    public void preservaRotaHttpFornecidaPeloPrincipal() {
        assertEquals(
                "/pos/imagens/produtos/abc",
                CatalogRepository.referenciaImagemLan(
                        "abc",
                        "/pos/imagens/produtos/",
                        "/pos/imagens/produtos/abc",
                        "https://cdn.exemplo/abc.webp"));
    }

    @Test
    public void converteProtocoloElectronEmEndpointLanComIdCodificado() {
        assertEquals(
                "/pos/imagens/produtos/produto%20com%2Fbarra",
                CatalogRepository.referenciaImagemLan(
                        "produto com/barra",
                        "/pos/imagens/produtos/",
                        "pdv-image://produto/cache.webp"));
    }

    @Test
    public void converteUrlRemotaEmEndpointDoPdv() {
        assertEquals(
                "/pos/imagens/produtos/abc",
                CatalogRepository.referenciaImagemLan(
                        "abc",
                        "/pos/imagens/produtos/",
                        null,
                        "https://cdn.exemplo/abc.webp"));
    }

    @Test
    public void naoPublicaCaminhoArbitrario() {
        assertNull(
                CatalogRepository.referenciaImagemLan(
                        "abc",
                        "/pos/imagens/produtos/",
                        "../../segredo.png"));
    }

    @Test
    public void preservaArquivoDoCacheAndroid() {
        String arquivo =
                "file:/data/user/0/com.pos_mais_gestao/files/catalog-images/imagem.png";
        assertEquals(
                arquivo,
                CatalogRepository.referenciaImagemLan(
                        "abc", "/pos/imagens/produtos/", arquivo));
    }
}
