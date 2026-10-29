package com.pos_mais_gestao.data.local;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import java.util.ArrayList;
import java.util.List;

public class OutboxDb extends SQLiteOpenHelper {
    private static final String DB = "pos_outbox.db";
    private static final int VERSION = 1;

    public static final String TIPO_VENDA = "venda_pdv";
    public static final String TIPO_ITEM_MESA = "item_mesa";
    public static final String TIPO_ATALHOS = "atalhos";

    public OutboxDb(Context context) {
        super(context, DB, null, VERSION);
    }

    @Override
    public void onCreate(SQLiteDatabase db) {
        db.execSQL(
                "CREATE TABLE outbox ("
                        + "id INTEGER PRIMARY KEY AUTOINCREMENT,"
                        + "tipo TEXT NOT NULL,"
                        + "payload TEXT NOT NULL,"
                        + "status TEXT NOT NULL DEFAULT 'pendente',"
                        + "tentativas INTEGER NOT NULL DEFAULT 0,"
                        + "criadoem INTEGER NOT NULL)");
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {}

    public long enfileirar(String tipo, String payload) {
        ContentValues values = new ContentValues();
        values.put("tipo", tipo);
        values.put("payload", payload);
        values.put("status", "pendente");
        values.put("tentativas", 0);
        values.put("criadoem", System.currentTimeMillis());
        return getWritableDatabase().insert("outbox", null, values);
    }

    public List<OutboxItem> listarPendentes() {
        List<OutboxItem> itens = new ArrayList<>();
        try (Cursor c = getReadableDatabase().query(
                "outbox",
                new String[] {"id", "tipo", "payload", "status", "tentativas"},
                "status=?",
                new String[] {"pendente"},
                null,
                null,
                "id ASC",
                "50")) {
            while (c.moveToNext()) {
                OutboxItem item = new OutboxItem();
                item.id = c.getLong(0);
                item.tipo = c.getString(1);
                item.payload = c.getString(2);
                item.status = c.getString(3);
                item.tentativas = c.getInt(4);
                itens.add(item);
            }
        }
        return itens;
    }

    public void marcarConcluido(long id) {
        ContentValues values = new ContentValues();
        values.put("status", "ok");
        getWritableDatabase().update("outbox", values, "id=?", new String[] {String.valueOf(id)});
    }

    public void incrementarTentativa(long id) {
        getWritableDatabase().execSQL(
                "UPDATE outbox SET tentativas = tentativas + 1 WHERE id = ?",
                new Object[] {id});
    }

    public int contarPendentes() {
        try (Cursor c = getReadableDatabase().rawQuery(
                "SELECT COUNT(*) FROM outbox WHERE status='pendente'", null)) {
            if (c.moveToFirst()) {
                return c.getInt(0);
            }
        }
        return 0;
    }

    public static class OutboxItem {
        public long id;
        public String tipo;
        public String payload;
        public String status;
        public int tentativas;
    }
}
