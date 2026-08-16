package com.pos_mais_gestao.data.local;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.pos_mais_gestao.domain.Produto;
import java.util.ArrayList;
import java.util.List;

public class CatalogRepository {
    private final CatalogDb db;

    public CatalogRepository(android.content.Context context) {
        this.db = new CatalogDb(context);
    }

    public int gravarSync(JsonObject payload) {
        List<CatalogDb.GrupoRow> grupos = new ArrayList<>();
        JsonArray gruposJson = payload.getAsJsonArray("grupos");
        if (gruposJson != null) {
            for (JsonElement el : gruposJson) {
                JsonObject obj = el.getAsJsonObject();
                String id = texto(obj, "id");
                String nome = texto(obj, "nome");
                if (id != null && nome != null) {
                    grupos.add(new CatalogDb.GrupoRow(id, nome));
                }
            }
        }

        List<CatalogDb.GrupoRow> gruposGourmet = new ArrayList<>();
        JsonArray gourmetJson = payload.getAsJsonArray("gruposGourmet");
        if (gourmetJson != null) {
            for (JsonElement el : gourmetJson) {
                JsonObject obj = el.getAsJsonObject();
                String id = texto(obj, "id");
                String nome = texto(obj, "nome");
                if (id != null && nome != null) {
                    gruposGourmet.add(new CatalogDb.GrupoRow(id, nome));
                }
            }
        }

        List<CatalogDb.ProdutoRow> produtos = new ArrayList<>();
        JsonArray produtosJson = payload.getAsJsonArray("produtos");
        if (produtosJson != null) {
            for (JsonElement el : produtosJson) {
                JsonObject obj = el.getAsJsonObject();
                String id = texto(obj, "id");
                String descricao = texto(obj, "descricao");
                if (id == null || descricao == null) {
                    continue;
                }
                produtos.add(new CatalogDb.ProdutoRow(
                        id,
                        descricao,
                        textoOu(obj, "preco", "0"),
                        texto(obj, "unidademedida"),
                        texto(obj, "idunidademedida"),
                        texto(obj, "ean"),
                        texto(obj, "idgrupo"),
                        texto(obj, "idgrupogourmet"),
                        texto(obj, "imagem"),
                        texto(obj, "caminhoimagem")));
            }
        }

        List<String> atalhos = new ArrayList<>();
        JsonArray atalhosJson = payload.getAsJsonArray("atalhos");
        if (atalhosJson != null) {
            for (JsonElement el : atalhosJson) {
                if (el.isJsonPrimitive()) {
                    String id = el.getAsString();
                    if (id != null && !id.isEmpty()) {
                        atalhos.add(id);
                    }
                    continue;
                }
                JsonObject obj = el.getAsJsonObject();
                String id = texto(obj, "id");
                if (id == null) {
                    id = texto(obj, "idproduto");
                }
                if (id != null) {
                    atalhos.add(id);
                }
            }
        }

        db.substituirCarga(grupos, gruposGourmet, produtos, atalhos, textoOu(payload, "atualizadoem", ""));
        return produtos.size();
    }

    public List<Produto> buscarProdutos(String termo, int limit) {
        return db.buscarProdutos(termo, limit);
    }

    public Produto buscarPorEan(String ean) {
        return db.buscarPorEan(ean);
    }

    public List<Produto> listarAtalhos() {
        return db.listarAtalhos();
    }

    public List<CatalogDb.GrupoRow> listarGrupos() {
        return db.listarGrupos();
    }

    public List<CatalogDb.GrupoRow> listarGruposGourmet() {
        return db.listarGruposGourmet();
    }

    public List<Produto> listarPorGrupo(String idgrupo, String termo, int limit) {
        return db.listarPorGrupo(idgrupo, termo, limit);
    }

    public List<Produto> listarPorGrupoGourmet(String idgrupogourmet, String termo, int limit) {
        return db.listarPorGrupoGourmet(idgrupogourmet, termo, limit);
    }

    public int contarProdutos() {
        return db.contarProdutos();
    }

    private static String texto(JsonObject obj, String key) {
        if (obj == null || !obj.has(key) || obj.get(key).isJsonNull()) {
            return null;
        }
        try {
            return obj.get(key).getAsString();
        } catch (Exception e) {
            return obj.get(key).toString();
        }
    }

    private static String textoOu(JsonObject obj, String key, String fallback) {
        String v = texto(obj, key);
        return v == null ? fallback : v;
    }
}
