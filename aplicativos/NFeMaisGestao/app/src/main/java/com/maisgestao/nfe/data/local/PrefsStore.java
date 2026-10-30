package com.maisgestao.nfe.data.local;

import android.content.Context;
import android.content.SharedPreferences;
import androidx.security.crypto.EncryptedSharedPreferences;
import androidx.security.crypto.MasterKeys;
import com.google.gson.Gson;
import com.google.gson.JsonObject;
import java.io.IOException;
import java.security.GeneralSecurityException;

public class PrefsStore {
    private static final String PREFS = "nfe_mais_gestao";
    private static final String SECURE_PREFS = "nfe_mais_gestao_session";
    private static final String KEY_BASE_URL = "base_url";
    private static final String KEY_TOKEN = "session_token";
    private static final String KEY_USER_ID = "user_id";
    private static final String KEY_USER_NAME = "user_name";
    private static final String KEY_EMPRESA_JSON = "empresa_json";
    private static final String DEFAULT_BASE_URL = "https://apimaisgestao.compumais.com";

    private final SharedPreferences prefs;
    private final SharedPreferences sessionPrefs;
    private final Gson gson = new Gson();

    public PrefsStore(Context context) {
        Context appContext = context.getApplicationContext();
        prefs = appContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        sessionPrefs = criarPreferenciasSeguras(appContext);
        migrarTokenLegado();
    }

    private SharedPreferences criarPreferenciasSeguras(Context context) {
        try {
            String masterKeyAlias = MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC);
            return EncryptedSharedPreferences.create(
                    SECURE_PREFS,
                    masterKeyAlias,
                    context,
                    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM);
        } catch (GeneralSecurityException | IOException error) {
            return prefs;
        }
    }

    private void migrarTokenLegado() {
        if (sessionPrefs == prefs || sessionPrefs.contains(KEY_TOKEN)) {
            return;
        }
        String tokenLegado = prefs.getString(KEY_TOKEN, null);
        if (tokenLegado != null && !tokenLegado.trim().isEmpty()) {
            if (sessionPrefs.edit().putString(KEY_TOKEN, tokenLegado).commit()) {
                prefs.edit().remove(KEY_TOKEN).apply();
            }
        }
    }

    public String getBaseUrl() {
        String url = prefs.getString(KEY_BASE_URL, DEFAULT_BASE_URL);
        if (url == null || url.trim().isEmpty()) {
            return DEFAULT_BASE_URL;
        }
        return url.trim().replaceAll("/+$", "");
    }

    public void setBaseUrl(String baseUrl) {
        prefs.edit().putString(KEY_BASE_URL, baseUrl == null ? "" : baseUrl.trim()).apply();
    }

    public String getToken() {
        return sessionPrefs.getString(KEY_TOKEN, null);
    }

    public void setToken(String token) {
        sessionPrefs.edit().putString(KEY_TOKEN, token).apply();
    }

    public String getUserId() {
        return prefs.getString(KEY_USER_ID, null);
    }

    public String getUserName() {
        return prefs.getString(KEY_USER_NAME, null);
    }

    public void setUser(String userId, String userName) {
        prefs.edit()
                .putString(KEY_USER_ID, userId)
                .putString(KEY_USER_NAME, userName)
                .apply();
    }

    public void setEmpresa(String id, String nome) {
        JsonObject obj = new JsonObject();
        obj.addProperty("id", id);
        obj.addProperty("nome", nome);
        prefs.edit().putString(KEY_EMPRESA_JSON, gson.toJson(obj)).apply();
    }

    public String getEmpresaId() {
        JsonObject empresa = getEmpresaJson();
        if (empresa != null && empresa.has("id") && !empresa.get("id").isJsonNull()) {
            return empresa.get("id").getAsString();
        }
        return null;
    }

    public String getEmpresaNome() {
        JsonObject empresa = getEmpresaJson();
        if (empresa != null && empresa.has("nome") && !empresa.get("nome").isJsonNull()) {
            return empresa.get("nome").getAsString();
        }
        return null;
    }

    private JsonObject getEmpresaJson() {
        String raw = prefs.getString(KEY_EMPRESA_JSON, null);
        if (raw == null || raw.trim().isEmpty()) {
            return null;
        }
        try {
            return gson.fromJson(raw, JsonObject.class);
        } catch (Exception ignored) {
            return null;
        }
    }

    public void clearEmpresa() {
        prefs.edit().remove(KEY_EMPRESA_JSON).apply();
    }

    public boolean isLoggedIn() {
        String token = getToken();
        return token != null && !token.trim().isEmpty();
    }

    public boolean hasEmpresa() {
        String id = getEmpresaId();
        return id != null && !id.trim().isEmpty();
    }

    public void logout() {
        sessionPrefs.edit().remove(KEY_TOKEN).apply();
        prefs.edit()
                .remove(KEY_USER_ID)
                .remove(KEY_USER_NAME)
                .remove(KEY_EMPRESA_JSON)
                .apply();
    }
}
