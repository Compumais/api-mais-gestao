package com.pos_mais_gestao.ui.config;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.RadioButton;
import android.widget.TextView;
import android.widget.Toast;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;
import com.google.android.material.button.MaterialButton;
import com.google.android.material.switchmaterial.SwitchMaterial;
import com.google.android.material.textfield.TextInputEditText;
import com.pos_mais_gestao.PosApplication;
import com.pos_mais_gestao.R;
import com.pos_mais_gestao.data.local.PrefsStore;
import com.pos_mais_gestao.domain.Carrinho;
import com.pos_mais_gestao.hardware.ImpressoraDiscovery;
import com.pos_mais_gestao.hardware.ImpressoraInfo;
import com.pos_mais_gestao.ui.atalhos.AtalhosActivity;
import com.pos_mais_gestao.ui.login.LoginActivity;
import java.util.ArrayList;
import java.util.List;

public class ConfigActivity extends AppCompatActivity {
    private PrefsStore prefs;
    private TextInputEditText inputUrl;
    private TextInputEditText inputPdv;
    private TextInputEditText inputMesas;
    private SwitchMaterial switchEmitirNfce;
    private LinearLayout listaImpressoras;
    private TextView txtImpressoraSelecionada;
    private final List<ImpressoraInfo> impressoras = new ArrayList<>();
    private String impressoraIdSelecionada = "";
    private String impressoraNomeSelecionada;
    private String impressoraTipoSelecionada = ImpressoraInfo.TIPO_NENHUMA;

    private final ActivityResultLauncher<String> bluetoothPermissionLauncher =
            registerForActivityResult(new ActivityResultContracts.RequestPermission(), granted -> {
                if (granted) {
                    carregarImpressoras();
                } else {
                    Toast.makeText(this, R.string.permissao_bluetooth_negada, Toast.LENGTH_LONG).show();
                    carregarImpressoras();
                }
            });

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_config);

        prefs = ((PosApplication) getApplication()).getPrefsStore();
        inputUrl = findViewById(R.id.inputUrlApi);
        inputPdv = findViewById(R.id.inputNumeroPdv);
        inputMesas = findViewById(R.id.inputQuantidadeMesas);
        switchEmitirNfce = findViewById(R.id.switchEmitirNfcePos);
        listaImpressoras = findViewById(R.id.listaImpressoras);
        txtImpressoraSelecionada = findViewById(R.id.txtImpressoraSelecionada);
        MaterialButton btnSalvar = findViewById(R.id.btnSalvarConfig);
        MaterialButton btnAtalhos = findViewById(R.id.btnGerenciarAtalhos);
        MaterialButton btnLogout = findViewById(R.id.btnLogout);
        MaterialButton btnAtualizarImpressoras = findViewById(R.id.btnAtualizarImpressoras);

        inputUrl.setText(prefs.getBaseUrl());
        inputPdv.setText(String.valueOf(prefs.getNumeroPdv()));
        inputMesas.setText(String.valueOf(prefs.getQuantidadeMesas()));
        switchEmitirNfce.setChecked(prefs.isEmitirNfcePos());
        impressoraIdSelecionada = prefs.getImpressoraId() != null ? prefs.getImpressoraId() : "";
        impressoraNomeSelecionada = prefs.getImpressoraNome();
        impressoraTipoSelecionada = prefs.getImpressoraTipo();
        atualizarTextoImpressoraSelecionada();

        btnSalvar.setOnClickListener(v -> salvar());
        btnAtalhos.setOnClickListener(v -> startActivity(new Intent(this, AtalhosActivity.class)));
        btnAtualizarImpressoras.setOnClickListener(v -> solicitarPermissaoECarregar());
        btnLogout.setOnClickListener(v -> {
            prefs.logout();
            Carrinho.getInstance().limpar();
            Intent intent = new Intent(this, LoginActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
            startActivity(intent);
            finish();
        });

        solicitarPermissaoECarregar();
    }

    private void solicitarPermissaoECarregar() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_CONNECT)
                    != PackageManager.PERMISSION_GRANTED) {
                bluetoothPermissionLauncher.launch(Manifest.permission.BLUETOOTH_CONNECT);
                return;
            }
        }
        carregarImpressoras();
    }

    private void carregarImpressoras() {
        impressoras.clear();
        impressoras.addAll(ImpressoraDiscovery.listar(this));
        listaImpressoras.removeAllViews();
        LayoutInflater inflater = LayoutInflater.from(this);
        for (ImpressoraInfo info : impressoras) {
            View item = inflater.inflate(R.layout.item_impressora, listaImpressoras, false);
            RadioButton radio = item.findViewById(R.id.radioImpressora);
            TextView txtNome = item.findViewById(R.id.txtNomeImpressora);
            TextView txtDetalhe = item.findViewById(R.id.txtDetalheImpressora);
            txtNome.setText(info.nome);
            txtDetalhe.setText(detalheTipo(info));
            boolean selecionada = idsIguais(info.id, impressoraIdSelecionada)
                    && tiposIguais(info.tipo, impressoraTipoSelecionada);
            radio.setChecked(selecionada);
            item.setOnClickListener(v -> selecionarImpressora(info));
            listaImpressoras.addView(item);
        }
        sincronizarRadios();
    }

    private String detalheTipo(ImpressoraInfo info) {
        if (ImpressoraInfo.TIPO_BLUETOOTH.equals(info.tipo)) {
            return info.id;
        }
        if (ImpressoraInfo.TIPO_USB.equals(info.tipo)) {
            return info.id;
        }
        return getString(R.string.impressora_nenhuma);
    }

    private void selecionarImpressora(ImpressoraInfo info) {
        impressoraIdSelecionada = info.id != null ? info.id : "";
        impressoraNomeSelecionada = info.nome;
        impressoraTipoSelecionada = info.tipo;
        atualizarTextoImpressoraSelecionada();
        sincronizarRadios();
    }

    private void sincronizarRadios() {
        for (int i = 0; i < listaImpressoras.getChildCount(); i++) {
            View item = listaImpressoras.getChildAt(i);
            RadioButton radio = item.findViewById(R.id.radioImpressora);
            ImpressoraInfo info = impressoras.get(i);
            radio.setChecked(idsIguais(info.id, impressoraIdSelecionada)
                    && tiposIguais(info.tipo, impressoraTipoSelecionada));
        }
    }

    private void atualizarTextoImpressoraSelecionada() {
        if (impressoraNomeSelecionada == null || impressoraNomeSelecionada.isEmpty()
                || ImpressoraInfo.TIPO_NENHUMA.equals(impressoraTipoSelecionada)) {
            txtImpressoraSelecionada.setText(R.string.impressora_nenhuma);
        } else {
            txtImpressoraSelecionada.setText(
                    getString(R.string.impressora_selecionada, impressoraNomeSelecionada));
        }
    }

    private boolean idsIguais(String a, String b) {
        String aa = a == null ? "" : a;
        String bb = b == null ? "" : b;
        return aa.equals(bb);
    }

    private boolean tiposIguais(String a, String b) {
        String aa = a == null ? ImpressoraInfo.TIPO_NENHUMA : a;
        String bb = b == null ? ImpressoraInfo.TIPO_NENHUMA : b;
        return aa.equals(bb);
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
        prefs.setImpressora(impressoraIdSelecionada, impressoraNomeSelecionada, impressoraTipoSelecionada);
        Toast.makeText(this, "Configurações salvas", Toast.LENGTH_SHORT).show();
        finish();
    }
}
