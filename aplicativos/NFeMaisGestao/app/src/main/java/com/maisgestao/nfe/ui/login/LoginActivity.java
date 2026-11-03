package com.maisgestao.nfe.ui.login;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.ProgressBar;
import android.widget.Toast;
import com.maisgestao.nfe.ui.NfeAppCompatActivity;
import com.google.android.material.button.MaterialButton;
import com.google.android.material.textfield.TextInputEditText;
import com.maisgestao.nfe.NfeApplication;
import com.maisgestao.nfe.R;
import com.maisgestao.nfe.data.api.ApiClient;
import com.maisgestao.nfe.data.api.ApiException;
import com.maisgestao.nfe.data.local.PrefsStore;
import com.maisgestao.nfe.ui.empresa.EmpresaActivity;
import com.maisgestao.nfe.util.UiExecutor;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class LoginActivity extends NfeAppCompatActivity {
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private PrefsStore prefs;
    private ApiClient api;
    private TextInputEditText inputUrl;
    private TextInputEditText inputEmail;
    private TextInputEditText inputSenha;
    private MaterialButton btnEntrar;
    private ProgressBar progress;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_login);

        NfeApplication app = (NfeApplication) getApplication();
        prefs = app.getPrefsStore();
        api = app.getApiClient();

        inputUrl = findViewById(R.id.inputUrlApi);
        inputEmail = findViewById(R.id.inputEmail);
        inputSenha = findViewById(R.id.inputSenha);
        btnEntrar = findViewById(R.id.btnEntrar);
        progress = findViewById(R.id.progressLogin);

        inputUrl.setText(prefs.getBaseUrl());
        btnEntrar.setOnClickListener(v -> entrar());
    }

    private void entrar() {
        String url = text(inputUrl);
        String email = text(inputEmail);
        String senha = text(inputSenha);
        if (url.isEmpty() || email.isEmpty() || senha.isEmpty()) {
            Toast.makeText(this, R.string.login_preencha_campos, Toast.LENGTH_SHORT).show();
            return;
        }
        setBusy(true);
        UiExecutor.run(
                this,
                executor,
                () -> {
                    prefs.setBaseUrl(url);
                    api.login(email, senha);
                },
                () -> {
                    setBusy(false);
                    startActivity(new Intent(this, EmpresaActivity.class));
                    finish();
                },
                error -> {
                    setBusy(false);
                    String msg = error instanceof ApiException ? error.getMessage() : error.getMessage();
                    Toast.makeText(this, msg, Toast.LENGTH_LONG).show();
                });
    }

    private void setBusy(boolean busy) {
        progress.setVisibility(busy ? View.VISIBLE : View.GONE);
        btnEntrar.setEnabled(!busy);
    }

    private static String text(TextInputEditText edit) {
        return edit.getText() == null ? "" : edit.getText().toString().trim();
    }

    @Override
    protected void onDestroy() {
        executor.shutdownNow();
        super.onDestroy();
    }
}
