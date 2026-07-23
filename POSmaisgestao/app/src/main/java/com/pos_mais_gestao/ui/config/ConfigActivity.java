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
import android.widget.RadioGroup;
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
import com.pos_mais_gestao.ui.empresa.EmpresaActivity;
import com.pos_mais_gestao.ui.login.LoginActivity;
import com.pos_mais_gestao.util.SoftInputHelper;
import com.pos_mais_gestao.util.ThemeHelper;
import java.util.ArrayList;
import java.util.List;

public class ConfigActivity extends AppCompatActivity {
    private PrefsStore prefs;
    private TextInputEditText inputUrl;
    private TextInputEditText inputPdv;
    private TextInputEditText inputMesas;
    private SwitchMaterial switchEmitirNfce;
    private SwitchMaterial switchFichasEvento;
    private RadioGroup radioGrupoTema;
    private LinearLayout listaImpressoras;
    private TextView txtImpressoraSelecionada;
    private TextView txtSemImpressoras;
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
        SoftInputHelper.hideOnStart(this);

        prefs = ((PosApplication) getApplication()).getPrefsStore();
        inputUrl = findViewById(R.id.inputUrlApi);
        inputPdv = findViewById(R.id.inputNumeroPdv);
        inputMesas = findViewById(R.id.inputQuantidadeMesas);
        switchEmitirNfce = findViewById(R.id.switchEmitirNfcePos);
        switchFichasEvento = findViewById(R.id.switchFichasEvento);
        radioGrupoTema = findViewById(R.id.radioGrupoTema);
        listaImpressoras = findViewById(R.id.listaImpressoras);
        txtImpressoraSelecionada = findViewById(R.id.txtImpressoraSelecionada);
        txtSemImpressoras = findViewById(R.id.txtSemImpressoras);
        MaterialButton btnSalvar = findViewById(R.id.btnSalvarConfig);
        MaterialButton btnAtalhos = findViewById(R.id.btnGerenciarAtalhos);
        MaterialButton btnTrocarEmpresa = findViewById(R.id.btnTrocarEmpresa);
        MaterialButton btnLogout = findViewById(R.id.btnLogout);
        MaterialButton btnAtualizarImpressoras = findViewById(R.id.btnAtualizarImpressoras);

        inputUrl.setText(prefs.getBaseUrl());
        inputPdv.setText(String.valueOf(prefs.getNumeroPdv()));
        inputMesas.setText(String.valueOf(prefs.getQuantidadeMesas()));
        switchEmitirNfce.setChecked(prefs.isEmitirNfcePos());
        switchFichasEvento.setChecked(prefs.isImprimirFichasEvento());
        selecionarRadioTema(ThemeHelper.normalizar(prefs.getTema()));
        impressoraIdSelecionada = prefs.getImpressoraId() != null ? prefs.getImpressoraId() : "";
        impressoraNomeSelecionada = prefs.getImpressoraNome();
        impressoraTipoSelecionada = prefs.getImpressoraTipo();
        atualizarTextoImpressoraSelecionada();
        SoftInputHelper.hideOnStart(this);

        btnSalvar.setOnClickListener(v -> salvar());
        btnAtalhos.setOnClickListener(v -> startActivity(new Intent(this, AtalhosActivity.class)));
        btnAtualizarImpressoras.setOnClickListener(v -> solicitarPermissaoECarregar());
        btnTrocarEmpresa.setOnClickListener(v -> trocarEmpresa());
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

    private void trocarEmpresa() {
        Carrinho.getInstance().limpar();
        prefs.clearEmpresa();
        Intent intent = new Intent(this, EmpresaActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        startActivity(intent);
        finish();
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
        int dispositivosReais = 0;
        for (ImpressoraInfo info : impressoras) {
            if (!ImpressoraInfo.TIPO_NENHUMA.equals(info.tipo)) {
                dispositivosReais++;
            }
            View item = inflater.inflate(R.layout.item_impressora, listaImpressoras, false);
            RadioButton radio = item.findViewById(R.id.radioImpressora);
            TextView txtNome = item.findViewById(R.id.txtNomeImpressora);
            TextView txtDetalhe = item.findViewById(R.id.txtDetalheImpressora);
            txtNome.setText(info.nome);
            txtNome.setTextColor(ContextCompat.getColor(this, R.color.foreground));
            txtDetalhe.setText(detalheTipo(info));
            txtDetalhe.setTextColor(ContextCompat.getColor(this, R.color.muted_foreground));
            boolean selecionada = idsIguais(info.id, impressoraIdSelecionada)
                    && tiposIguais(info.tipo, impressoraTipoSelecionada);
            radio.setChecked(selecionada);
            item.setOnClickListener(v -> selecionarImpressora(info));
            listaImpressoras.addView(item);
        }
        txtSemImpressoras.setVisibility(dispositivosReais == 0 ? View.VISIBLE : View.GONE);
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
        prefs.setImprimirFichasEvento(switchFichasEvento.isChecked());
        prefs.setImpressora(impressoraIdSelecionada, impressoraNomeSelecionada, impressoraTipoSelecionada);
        String tema = lerTemaSelecionado();
        prefs.setTema(tema);
        ThemeHelper.aplicar(tema);
        Toast.makeText(this, "Configurações salvas", Toast.LENGTH_SHORT).show();
        finish();
    }

    private void selecionarRadioTema(String tema) {
        if (ThemeHelper.DARK.equals(tema)) {
            radioGrupoTema.check(R.id.radioTemaEscuro);
        } else if (ThemeHelper.SYSTEM.equals(tema)) {
            radioGrupoTema.check(R.id.radioTemaSistema);
        } else {
            radioGrupoTema.check(R.id.radioTemaClaro);
        }
    }

    private String lerTemaSelecionado() {
        int id = radioGrupoTema.getCheckedRadioButtonId();
        if (id == R.id.radioTemaEscuro) {
            return ThemeHelper.DARK;
        }
        if (id == R.id.radioTemaSistema) {
            return ThemeHelper.SYSTEM;
        }
        return ThemeHelper.LIGHT;
    }
}
