package com.pos_mais_gestao.data.sync;

import android.content.Context;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.pos_mais_gestao.data.local.PrefsStore;
import com.pos_mais_gestao.util.ProdutoImagemHelper;
import java.io.File;
import java.net.URI;
import java.util.ArrayList;
import java.util.List;

/** Converte referências do catálogo em arquivos locais antes de publicar a carga no SQLite. */
public final class CatalogImageSync {
    private final PrefsStore prefs;
    private final CatalogImageCache cache;

    public CatalogImageSync(Context context, PrefsStore prefs) {
        this.prefs = prefs;
        this.cache = new CatalogImageCache(
                new File(context.getFilesDir(), "catalog-images"));
    }

    public CatalogImageCache.SyncResult sync(
            JsonObject payload, CatalogImageCache.ProgressListener progressListener) {
        List<CatalogImageCache.ImageSpec> specs = new ArrayList<>();
        coletar(payload, "produtos", "produto", specs);
        coletar(payload, "gruposGourmet", "grupo", specs);

        CatalogImageCache.SyncResult result =
                cache.sync(specs, prefs.getToken(), progressListener);
        aplicar(payload, "produtos", "produto", result);
        aplicar(payload, "gruposGourmet", "grupo", result);
        return result;
    }

    private void coletar(
            JsonObject payload,
            String arrayName,
            String type,
            List<CatalogImageCache.ImageSpec> specs) {
        JsonArray array = payload.getAsJsonArray(arrayName);
        if (array == null) {
            return;
        }
        String catalogVersion = texto(payload, "atualizadoem");
        for (JsonElement element : array) {
            if (!element.isJsonObject()) continue;
            JsonObject item = element.getAsJsonObject();
            String id = texto(item, "id");
            String reference = primeiraReferencia(
                    texto(item, "caminhoimagem"),
                    texto(item, "imagemremota"),
                    texto(item, "imagemurl"),
                    texto(item, "imagem"));
            if (id == null || reference == null) continue;
            String url = ProdutoImagemHelper.resolverUrlLocal(
                    prefs.getBaseUrl(), reference, null);
            if (url == null) continue;
            String version = queryVersion(url);
            if (version == null) {
                version = (catalogVersion == null ? "" : catalogVersion) + "|" + url;
            }
            specs.add(new CatalogImageCache.ImageSpec(
                    type + ":" + id,
                    url,
                    version,
                    ProdutoImagemHelper.pertenceAoServidor(url, prefs.getBaseUrl())));
        }
    }

    private void aplicar(
            JsonObject payload,
            String arrayName,
            String type,
            CatalogImageCache.SyncResult result) {
        JsonArray array = payload.getAsJsonArray(arrayName);
        if (array == null) {
            return;
        }
        for (JsonElement element : array) {
            if (!element.isJsonObject()) continue;
            JsonObject item = element.getAsJsonObject();
            String id = texto(item, "id");
            String local = id == null ? null : result.localUris.get(type + ":" + id);
            if (local != null) {
                item.addProperty("caminhoimagem", local);
            }
        }
    }

    private static String queryVersion(String url) {
        try {
            String query = URI.create(url).getRawQuery();
            if (query == null) return null;
            for (String part : query.split("&")) {
                String[] pair = part.split("=", 2);
                if ("v".equals(pair[0]) && pair.length == 2 && !pair[1].isEmpty()) {
                    return pair[1];
                }
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    private static String primeiraReferencia(String... values) {
        for (String value : values) {
            if (value == null) continue;
            String candidate = value.trim();
            if (candidate.startsWith("http://")
                    || candidate.startsWith("https://")
                    || (candidate.startsWith("/") && !candidate.startsWith("//"))) {
                return candidate;
            }
        }
        return null;
    }

    private static String texto(JsonObject object, String key) {
        if (object == null || !object.has(key) || object.get(key).isJsonNull()) {
            return null;
        }
        try {
            String value = object.get(key).getAsString();
            return value == null || value.trim().isEmpty() ? null : value.trim();
        } catch (Exception ignored) {
            return null;
        }
    }
}
