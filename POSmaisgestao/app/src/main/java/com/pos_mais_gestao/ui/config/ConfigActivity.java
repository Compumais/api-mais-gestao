package com.pos_mais_gestao.ui.config;

import android.content.Intent;
import android.os.Bundle;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import com.google.android.material.button.MaterialButton;
import com.google.android.material.switchmaterial.SwitchMaterial;
import com.google.android.material.textfield.TextInputEditText;
import com.pos_mais_gestao.PosApplication;
import com.pos_mais_gestao.R;
import com.pos_mais_gestao.data.local.PrefsStore;
import com.pos_mais_gestao.domain.Carrinho;
import com.pos_mais_gestao.ui.atalhos.AtalhosActivity;
import com.pos_mais_gestao.ui.login.LoginActivity;

public class ConfigActivity extends AppCompatActivity {
    private PrefsStore prefs;
    private TextInputEditText inputUrl;
    private TextInputEditText inputPdv;
    private TextInputEditText inputMesas;
    private SwitchMaterial switchEmitirNfce;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_config);

        prefs = ((PosApplication) getApplication()).getPrefsStore();
        inputUrl = findViewById(R.id.inputUrlApi);
        inputPdv = findViewById(R.id.inputNumeroPdv);
        inputMesas = findViewById(R.id.inputQuantidadeMesas);
        switchEmitirNfce = findViewById(R.id.switchEmitirNfcePos);
        MaterialButton btnSalvar = findViewById(R.id.btnSalvarConfig);
        MaterialButton btnAtalhos = findViewById(R.id.btnGerenciarAtalhos);
        MaterialButton btnLogout = findViewById(R.id.btnLogout);

        inputUrl.setText(prefs.getBaseUrl());
        inputPdv.setText(String.valueOf(prefs.getNumeroPdv()));
        inputMesas.setText(String.valueOf(prefs.getQuantidadeMesas()));
        switchEmitirNfce.setChecked(prefs.isEmitirNfcePos());

        btnSalvar.setOnClickListener(v -> salvar());
        btnAtalhos.setOnClickListener(v -> startActivity(new Intent(this, AtalhosActivity.class)));
        btnLogout.setOnClickListener(v -> {
            prefs.logout();
            Carrinho.getInstance().limpar();
            Intent intent = new Intent(this, LoginActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
            startActivity(intent);
            finish();
        });
    }

    private void salvar() {
        String url = inputUrl.getText() == null ? "" : inputUrl.getText().toString().trim();
        String pdvStr = inputPdv.getText() == null ? "1" : inputPdv.getText().toString().trim();
        String mesasStr = inputMesas.getText() == null ? "20" : inputMesas.getText().toString().trim();
        if (url.isEmpty()) {
            Toast.makeText(this, "Informe a URL da API", Toast.LENGTH_SHORT).show();
            return;
        }
        int pdv = 1;
        try {
            pdv = Integer.parseInt(pdvStr);
        } catch (NumberFormatException ignored) {
        }
        int mesas = 20;
        try {
            mesas = Integer.parseInt(mesasStr);
        } catch (NumberFormatException ignored) {
        }
        prefs.setBaseUrl(url);
        prefs.setNumeroPdv(pdv);
        prefs.setQuantidadeMesas(mesas);
        prefs.setEmitirNfcePos(switchEmitirNfce.isChecked());
        Toast.makeText(this, "Configurações salvas", Toast.LENGTH_SHORT).show();
        finish();
    }
}
