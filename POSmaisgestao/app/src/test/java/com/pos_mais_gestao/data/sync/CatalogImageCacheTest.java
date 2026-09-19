package com.pos_mais_gestao.data.sync;

import static org.junit.Assert.assertArrayEquals;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import com.pos_mais_gestao.util.ProdutoImagemHelper;
import java.io.File;
import java.nio.file.Files;
import java.util.Base64;
import java.util.Collections;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import okhttp3.mockwebserver.RecordedRequest;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;

public class CatalogImageCacheTest {
    private static final byte[] PNG = Base64.getDecoder().decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=");

    @Rule public final TemporaryFolder temporaryFolder = new TemporaryFolder();

    @Test
    public void baixaComBearerPublicaArquivoLocalEReutilizaOffline() throws Exception {
        MockWebServer server = new MockWebServer();
        server.enqueue(new MockResponse()
                .setResponseCode(200)
                .setHeader("Content-Type", "image/png")
                .setBody(new okio.Buffer().write(PNG)));
        server.start();
        try {
            File directory = temporaryFolder.newFolder("catalog-images");
            CatalogImageCache cache = new CatalogImageCache(directory);
            CatalogImageCache.ImageSpec spec = new CatalogImageCache.ImageSpec(
                    "produto:p1",
                    server.url("/pos/imagens/produtos/p1?v=versao-1").toString(),
                    "versao-1",
                    true);

            CatalogImageCache.SyncResult first =
                    cache.sync(Collections.singletonList(spec), "token-real", null);

            assertEquals(1, first.baixadas);
            assertEquals(0, first.falhas);
            RecordedRequest request = server.takeRequest();
            assertEquals("Bearer token-real", request.getHeader("Authorization"));
            String localUri = first.localUris.get("produto:p1");
            File localFile = new File(java.net.URI.create(localUri));
            assertTrue(localFile.isFile());
            assertArrayEquals(PNG, Files.readAllBytes(localFile.toPath()));
            assertEquals(localUri, ProdutoImagemHelper.resolverUrl(
                    "http://192.168.0.10:5050", localUri));

            server.shutdown();
            CatalogImageCache.SyncResult offline =
                    cache.sync(Collections.singletonList(spec), "token-real", null);
            assertEquals(0, offline.baixadas);
            assertEquals(1, offline.reutilizadas);
            assertEquals(localUri, offline.localUris.get("produto:p1"));
        } finally {
            try {
                server.shutdown();
            } catch (Exception ignored) {
            }
        }
    }

    @Test
    public void falhaDeImagemMantemCacheAnteriorESyncContinua() throws Exception {
        MockWebServer server = new MockWebServer();
        server.enqueue(new MockResponse()
                .setHeader("Content-Type", "image/png")
                .setBody(new okio.Buffer().write(PNG)));
        server.enqueue(new MockResponse().setResponseCode(500));
        server.start();
        try {
            CatalogImageCache cache =
                    new CatalogImageCache(temporaryFolder.newFolder("fallback-images"));
            CatalogImageCache.ImageSpec v1 = new CatalogImageCache.ImageSpec(
                    "produto:p1", server.url("/imagem?v=1").toString(), "1", false);
            CatalogImageCache.SyncResult first =
                    cache.sync(Collections.singletonList(v1), "", null);
            CatalogImageCache.ImageSpec v2 = new CatalogImageCache.ImageSpec(
                    "produto:p1", server.url("/imagem?v=2").toString(), "2", false);

            CatalogImageCache.SyncResult second =
                    cache.sync(Collections.singletonList(v2), "", null);

            assertEquals(1, second.falhas);
            assertEquals(first.localUris.get("produto:p1"), second.localUris.get("produto:p1"));
        } finally {
            server.shutdown();
        }
    }
}
