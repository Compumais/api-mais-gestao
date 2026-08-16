package com.pos_mais_gestao.data.local;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import com.pos_mais_gestao.domain.Produto;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class CatalogDb extends SQLiteOpenHelper {
    private static final String DB = "pos_catalogo.db";
    private static final int VERSION = 2;

    public CatalogDb(Context context) {
        super(context, DB, null, VERSION);
    }

    @Override
    public void onCreate(SQLiteDatabase db) {
        db.execSQL(
                "CREATE TABLE catalogo_grupo ("
                        + "id TEXT PRIMARY KEY NOT NULL,"
                        + "nome TEXT NOT NULL)");
        db.execSQL(
                "CREATE TABLE catalogo_grupo_gourmet ("
                        + "id TEXT PRIMARY KEY NOT NULL,"
                        + "nome TEXT NOT NULL)");
        db.execSQL(
                "CREATE TABLE catalogo_produto ("
                        + "id TEXT PRIMARY KEY NOT NULL,"
                        + "descricao TEXT NOT NULL,"
                        + "preco TEXT NOT NULL,"
                        + "unidademedida TEXT,"
                        + "idunidademedida TEXT,"
                        + "ean TEXT,"
                        + "idgrupo TEXT,"
                        + "idgrupogourmet TEXT,"
                        + "imagem TEXT,"
                        + "caminhoimagem TEXT)");
        db.execSQL(
                "CREATE TABLE catalogo_atalho ("
                        + "ordem INTEGER PRIMARY KEY NOT NULL,"
                        + "idproduto TEXT NOT NULL)");
        db.execSQL(
                "CREATE TABLE catalogo_meta ("
                        + "chave TEXT PRIMARY KEY NOT NULL,"
                        + "valor TEXT NOT NULL)");
        db.execSQL(
                "CREATE INDEX idx_catalogo_produto_descricao ON catalogo_produto(descricao)");
        db.execSQL("CREATE INDEX idx_catalogo_produto_ean ON catalogo_produto(ean)");
        db.execSQL(
                "CREATE INDEX idx_catalogo_produto_grupo_gourmet ON catalogo_produto(idgrupogourmet)");
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        if (oldVersion < 2) {
            db.execSQL(
                    "CREATE TABLE IF NOT EXISTS catalogo_grupo_gourmet ("
                            + "id TEXT PRIMARY KEY NOT NULL,"
                            + "nome TEXT NOT NULL)");
            db.execSQL("ALTER TABLE catalogo_produto ADD COLUMN idgrupogourmet TEXT");
            db.execSQL(
                    "CREATE INDEX IF NOT EXISTS idx_catalogo_produto_grupo_gourmet"
                            + " ON catalogo_produto(idgrupogourmet)");
        }
    }

    public void substituirCarga(
            List<GrupoRow> grupos,
            List<GrupoRow> gruposGourmet,
            List<ProdutoRow> produtos,
            List<String> idsAtalhos,
            String atualizadoem) {
        SQLiteDatabase db = getWritableDatabase();
        db.beginTransaction();
        try {
            db.delete("catalogo_atalho", null, null);
            db.delete("catalogo_produto", null, null);
            db.delete("catalogo_grupo", null, null);
            db.delete("catalogo_grupo_gourmet", null, null);
            for (GrupoRow g : grupos) {
                ContentValues values = new ContentValues();
                values.put("id", g.id);
                values.put("nome", g.nome);
                db.insert("catalogo_grupo", null, values);
            }
            for (GrupoRow g : gruposGourmet) {
                ContentValues values = new ContentValues();
                values.put("id", g.id);
                values.put("nome", g.nome);
                db.insert("catalogo_grupo_gourmet", null, values);
            }
            for (ProdutoRow p : produtos) {
                ContentValues values = new ContentValues();
                values.put("id", p.id);
                values.put("descricao", p.descricao);
                values.put("preco", p.preco);
                values.put("unidademedida", p.unidademedida);
                values.put("idunidademedida", p.idunidademedida);
                values.put("ean", p.ean);
                values.put("idgrupo", p.idgrupo);
                values.put("idgrupogourmet", p.idgrupogourmet);
                values.put("imagem", p.imagem);
                values.put("caminhoimagem", p.caminhoimagem);
                db.insert("catalogo_produto", null, values);
            }
            int ordem = 1;
            for (String id : idsAtalhos) {
                ContentValues values = new ContentValues();
                values.put("ordem", ordem++);
                values.put("idproduto", id);
                db.insert("catalogo_atalho", null, values);
            }
            ContentValues meta = new ContentValues();
            meta.put("chave", "atualizadoem");
            meta.put("valor", atualizadoem == null ? "" : atualizadoem);
            db.insertWithOnConflict("catalogo_meta", null, meta, SQLiteDatabase.CONFLICT_REPLACE);
            db.setTransactionSuccessful();
        } finally {
            db.endTransaction();
        }
    }

    public List<Produto> buscarProdutos(String termo, int limit) {
        String q = termo == null ? "" : termo.trim();
        List<Produto> itens = new ArrayList<>();
        String sql;
        String[] args;
        if (q.isEmpty()) {
            sql =
                    "SELECT id, descricao, preco, unidademedida, idunidademedida, ean, imagem, caminhoimagem"
                            + " FROM catalogo_produto ORDER BY descricao LIMIT ?";
            args = new String[] {String.valueOf(Math.max(1, limit))};
        } else {
            String like = "%" + q + "%";
            sql =
                    "SELECT id, descricao, preco, unidademedida, idunidademedida, ean, imagem, caminhoimagem"
                            + " FROM catalogo_produto"
                            + " WHERE descricao LIKE ? OR ean LIKE ? OR id LIKE ?"
                            + " ORDER BY descricao LIMIT ?";
            args = new String[] {like, like, like, String.valueOf(Math.max(1, limit))};
        }
        try (Cursor c = getReadableDatabase().rawQuery(sql, args)) {
            while (c.moveToNext()) {
                itens.add(produtoDeCursor(c));
            }
        }
        return itens;
    }

    public Produto buscarPorEan(String ean) {
        if (ean == null || ean.trim().isEmpty()) {
            return null;
        }
        String codigo = ean.trim();
        try (Cursor c = getReadableDatabase().rawQuery(
                "SELECT id, descricao, preco, unidademedida, idunidademedida, ean, imagem, caminhoimagem"
                        + " FROM catalogo_produto WHERE ean = ? OR id = ? LIMIT 1",
                new String[] {codigo, codigo})) {
            if (c.moveToFirst()) {
                return produtoDeCursor(c);
            }
        }
        return null;
    }

    public List<Produto> listarAtalhos() {
        List<Produto> itens = new ArrayList<>();
        try (Cursor c = getReadableDatabase().rawQuery(
                "SELECT p.id, p.descricao, p.preco, p.unidademedida, p.idunidademedida, p.ean, p.imagem, p.caminhoimagem"
                        + " FROM catalogo_atalho a JOIN catalogo_produto p ON p.id = a.idproduto"
                        + " ORDER BY a.ordem",
                null)) {
            while (c.moveToNext()) {
                itens.add(produtoDeCursor(c));
            }
        }
        return itens;
    }

    public List<GrupoRow> listarGrupos() {
        List<GrupoRow> grupos = new ArrayList<>();
        try (Cursor c = getReadableDatabase().rawQuery(
                "SELECT g.id, g.nome FROM catalogo_grupo g"
                        + " WHERE EXISTS (SELECT 1 FROM catalogo_produto p WHERE p.idgrupo = g.id)"
                        + " ORDER BY g.nome",
                null)) {
            while (c.moveToNext()) {
                grupos.add(new GrupoRow(c.getString(0), c.getString(1)));
            }
        }
        return grupos;
    }

    public List<GrupoRow> listarGruposGourmet() {
        List<GrupoRow> grupos = new ArrayList<>();
        try (Cursor c = getReadableDatabase().rawQuery(
                "SELECT g.id, g.nome FROM catalogo_grupo_gourmet g"
                        + " WHERE EXISTS (SELECT 1 FROM catalogo_produto p"
                        + " WHERE p.idgrupogourmet = g.id AND p.idgrupogourmet IS NOT NULL"
                        + " AND p.idgrupogourmet <> '')"
                        + " ORDER BY g.nome",
                null)) {
            while (c.moveToNext()) {
                grupos.add(new GrupoRow(c.getString(0), c.getString(1)));
            }
        }
        return grupos;
    }

    public List<Produto> listarPorGrupo(String idgrupo, String termo, int limit) {
        String q = termo == null ? "" : termo.trim();
        List<Produto> itens = new ArrayList<>();
        String sql;
        String[] args;
        int lim = Math.max(1, limit);
        if (idgrupo == null || idgrupo.isEmpty()) {
            return buscarProdutos(q, lim);
        }
        if (q.isEmpty()) {
            sql = "SELECT id, descricao, preco, unidademedida, idunidademedida, ean, imagem, caminhoimagem"
                    + " FROM catalogo_produto WHERE idgrupo = ? ORDER BY descricao LIMIT ?";
            args = new String[] {idgrupo, String.valueOf(lim)};
        } else {
            String like = "%" + q + "%";
            sql = "SELECT id, descricao, preco, unidademedida, idunidademedida, ean, imagem, caminhoimagem"
                    + " FROM catalogo_produto"
                    + " WHERE idgrupo = ? AND (descricao LIKE ? OR ean LIKE ? OR id LIKE ?)"
                    + " ORDER BY descricao LIMIT ?";
            args = new String[] {idgrupo, like, like, like, String.valueOf(lim)};
        }
        try (Cursor c = getReadableDatabase().rawQuery(sql, args)) {
            while (c.moveToNext()) {
                itens.add(produtoDeCursor(c));
            }
        }
        return itens;
    }

    public List<Produto> listarPorGrupoGourmet(String idgrupogourmet, String termo, int limit) {
        String q = termo == null ? "" : termo.trim();
        List<Produto> itens = new ArrayList<>();
        String sql;
        String[] args;
        int lim = Math.max(1, limit);
        String gourmetFiltro =
                "idgrupogourmet IS NOT NULL AND idgrupogourmet <> ''";
        if (idgrupogourmet == null || idgrupogourmet.isEmpty()) {
            if (q.isEmpty()) {
                sql = "SELECT id, descricao, preco, unidademedida, idunidademedida, ean, imagem, caminhoimagem"
                        + " FROM catalogo_produto WHERE " + gourmetFiltro
                        + " ORDER BY descricao LIMIT ?";
                args = new String[] {String.valueOf(lim)};
            } else {
                String like = "%" + q + "%";
                sql = "SELECT id, descricao, preco, unidademedida, idunidademedida, ean, imagem, caminhoimagem"
                        + " FROM catalogo_produto"
                        + " WHERE " + gourmetFiltro
                        + " AND (descricao LIKE ? OR ean LIKE ? OR id LIKE ?)"
                        + " ORDER BY descricao LIMIT ?";
                args = new String[] {like, like, like, String.valueOf(lim)};
            }
        } else if (q.isEmpty()) {
            sql = "SELECT id, descricao, preco, unidademedida, idunidademedida, ean, imagem, caminhoimagem"
                    + " FROM catalogo_produto WHERE idgrupogourmet = ? ORDER BY descricao LIMIT ?";
            args = new String[] {idgrupogourmet, String.valueOf(lim)};
        } else {
            String like = "%" + q + "%";
            sql = "SELECT id, descricao, preco, unidademedida, idunidademedida, ean, imagem, caminhoimagem"
                    + " FROM catalogo_produto"
                    + " WHERE idgrupogourmet = ? AND (descricao LIKE ? OR ean LIKE ? OR id LIKE ?)"
                    + " ORDER BY descricao LIMIT ?";
            args = new String[] {idgrupogourmet, like, like, like, String.valueOf(lim)};
        }
        try (Cursor c = getReadableDatabase().rawQuery(sql, args)) {
            while (c.moveToNext()) {
                itens.add(produtoDeCursor(c));
            }
        }
        return itens;
    }

    public int contarProdutos() {
        try (Cursor c = getReadableDatabase().rawQuery("SELECT COUNT(*) FROM catalogo_produto", null)) {
            if (c.moveToFirst()) {
                return c.getInt(0);
            }
        }
        return 0;
    }

    private Produto produtoDeCursor(Cursor c) {
        String ean = c.getString(5);
        Integer codigo = null;
        if (ean != null) {
            try {
                codigo = Integer.parseInt(ean);
            } catch (Exception ignored) {
            }
        }
        BigDecimal preco = BigDecimal.ZERO;
        try {
            preco = new BigDecimal(c.getString(2));
        } catch (Exception ignored) {
        }
        return new Produto(
                c.getString(0),
                c.getString(1),
                preco,
                c.getString(3),
                c.getString(4),
                codigo,
                c.getString(6),
                c.getString(7));
    }

    public static class GrupoRow {
        public final String id;
        public final String nome;

        public GrupoRow(String id, String nome) {
            this.id = id;
            this.nome = nome;
        }
    }

    public static class ProdutoRow {
        public final String id;
        public final String descricao;
        public final String preco;
        public final String unidademedida;
        public final String idunidademedida;
        public final String ean;
        public final String idgrupo;
        public final String idgrupogourmet;
        public final String imagem;
        public final String caminhoimagem;

        public ProdutoRow(
                String id,
                String descricao,
                String preco,
                String unidademedida,
                String idunidademedida,
                String ean,
                String idgrupo,
                String idgrupogourmet,
                String imagem,
                String caminhoimagem) {
            this.id = id;
            this.descricao = descricao;
            this.preco = preco;
            this.unidademedida = unidademedida;
            this.idunidademedida = idunidademedida;
            this.ean = ean;
            this.idgrupo = idgrupo;
            this.idgrupogourmet = idgrupogourmet;
            this.imagem = imagem;
            this.caminhoimagem = caminhoimagem;
        }
    }
}
