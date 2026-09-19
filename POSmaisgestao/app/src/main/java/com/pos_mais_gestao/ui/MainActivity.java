package com.pos_mais_gestao.ui;

import android.content.Intent;
import android.os.Bundle;
import androidx.appcompat.app.AppCompatActivity;
import com.pos_mais_gestao.PosApplication;
import com.pos_mais_gestao.data.api.ApiClient;
import com.pos_mais_gestao.data.api.ApiException;
import com.pos_mais_gestao.data.local.PrefsStore;
import com.pos_mais_gestao.ui.empresa.EmpresaActivity;
import com.pos_mais_gestao.ui.PosDestino;
import com.pos_mais_gestao.ui.login.LoginActivity;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends AppCompatActivity {
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        PosApplication app = (PosApplication) getApplication();
        PrefsStore prefs = app.getPrefsStore();
        if (!prefs.isLoggedIn()) {
            abrirDestino(prefs);
            return;
        }

        ApiClient api = app.getApiClient();
        executor.execute(() -> {
            boolean invalida = false;
            try {
                api.validarSessao();
            } catch (ApiException error) {
                invalida = error.getStatusCode() == 401 || error.getStatusCode() == 403;
            }
            boolean sessaoInvalida = invalida;
            runOnUiThread(() -> {
                if (isFinishing() || isDestroyed()) {
                    return;
                }
                if (sessaoInvalida) {
                    prefs.logout();
                }
                abrirDestino(prefs);
            });
        });
    }

    private void abrirDestino(PrefsStore prefs) {
        Intent intent;
        if (!prefs.isLoggedIn()) {
            intent = new Intent(this, LoginActivity.class);
        } else if (!prefs.hasEmpresa()) {
            intent = new Intent(this, EmpresaActivity.class);
        } else {
            intent = PosDestino.intentHub(this, prefs);
        }
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        startActivity(intent);
        finish();
    }

    @Override
    protected void onDestroy() {
        executor.shutdownNow();
        super.onDestroy();
    }
}
