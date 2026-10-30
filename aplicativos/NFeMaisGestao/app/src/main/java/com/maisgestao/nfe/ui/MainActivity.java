package com.maisgestao.nfe.ui;

import android.content.Intent;
import android.os.Bundle;
import androidx.appcompat.app.AppCompatActivity;
import com.maisgestao.nfe.NfeApplication;
import com.maisgestao.nfe.data.api.ApiClient;
import com.maisgestao.nfe.data.api.ApiException;
import com.maisgestao.nfe.data.local.PrefsStore;
import com.maisgestao.nfe.ui.empresa.EmpresaActivity;
import com.maisgestao.nfe.ui.hub.HubActivity;
import com.maisgestao.nfe.ui.login.LoginActivity;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends AppCompatActivity {
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        NfeApplication app = (NfeApplication) getApplication();
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
            intent = new Intent(this, HubActivity.class);
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
