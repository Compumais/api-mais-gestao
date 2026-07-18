package com.pos_mais_gestao.ui.login;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.ProgressBar;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import com.google.android.material.button.MaterialButton;
import com.google.android.material.textfield.TextInputEditText;
import com.pos_mais_gestao.PosApplication;
import com.pos_mais_gestao.R;
import com.pos_mais_gestao.data.api.ApiClient;
import com.pos_mais_gestao.data.api.ApiException;
import com.pos_mais_gestao.data.local.PrefsStore;
import com.pos_mais_gestao.ui.empresa.EmpresaActivity;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class LoginActivity extends AppCompatActivity {
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private PrefsStore prefs;
    private ApiClient api;
    private TextInputEditText inputUrlApi;
    private TextInputEditText inputEmail;
    private TextInputEditText inputSenha;
    private MaterialButton btnEntrar;
    private ProgressBar progressLogin;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_login);

        PosApplication app = (PosApplication) getApplication();
        prefs = app.getPrefsStore();
        api = app.getApiClient();

        inputUrlApi = findViewById(R.id.inputUrlApi);
        inputEmail = findViewById(R.id.inputEmail);
        inputSenha = findViewById(R.id.inputSenha);
        btnEntrar = findViewById(R.id.btnEntrar);
        progressLogin = findViewById(R.id.progressLogin);

        inputUrlApi.setText(prefs.getBaseUrl());
        btnEntrar.setOnClickListener(v -> entrar());
    }

    private void entrar() {
        String url = text(inputUrlApi);
        String email = text(inputEmail);
        String senha = text(inputSenha);

        if (url.isEmpty() || email.isEmpty() || senha.isEmpty()) {
            Toast.makeText(this, "Preencha URL, e-mail e senha", Toast.LENGTH_SHORT).show();
            return;
        }

        prefs.setBaseUrl(url);
        setLoading(true);

        executor.execute(() -> {
            try {
                api.login(email, senha);
                runOnUiThread(() -> {
                    setLoading(false);
                    Intent intent = new Intent(this, EmpresaActivity.class);
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
                    startActivity(intent);
                    finish();
                });
            } catch (ApiException e) {
                runOnUiThread(() -> {
                    setLoading(false);
                    Toast.makeText(this, e.getMessage(), Toast.LENGTH_LONG).show();
                });
            }
        });
    }

    private void setLoading(boolean loading) {
        progressLogin.setVisibility(loading ? View.VISIBLE : View.GONE);
        btnEntrar.setEnabled(!loading);
    }

    private static String text(TextInputEditText edit) {
        return edit.getText() == null ? "" : edit.getText().toString().trim();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        executor.shutdownNow();
    }
}
