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
import com.google.android.material.textfield.TextInputLayout;
import com.pos_mais_gestao.PosApplication;
import com.pos_mais_gestao.R;
import com.pos_mais_gestao.data.api.ApiClient;
import com.pos_mais_gestao.data.api.ApiException;
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
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class ConfigActivity extends AppCompatActivity {
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private PrefsStore prefs;
    private ApiClient api;
    private TextInputLayout layoutUrlApi;
    private TextInputEditText inputUrl;
    private RadioGroup radioGrupoConexao;
    private LinearLayout blocoAcoesPdv;
    private MaterialButton btnTestarPdv;
    private MaterialButton btnCarregarCatalogo;
    private TextInputEditText inputPdv;
    private TextInputEditText inputMesas;
    private TextInputLayout layoutMesas;
    private TextView txtConfigOrigemPdv;
    private SwitchMaterial switchEmitirNfce;
    private SwitchMaterial switchFichasEvento;
    private SwitchMaterial switchPixQr;
    private TextInputEditText inputChavePix;
    private TextInputEditText inputNomePix;
    private TextInputEditText inputCidadePix;
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
        api = ((PosApplication) getApplication()).getApiClient();
        layoutUrlApi = findViewById(R.id.layoutUrlApi);
        inputUrl = findViewById(R.id.inputUrlApi);
        radioGrupoConexao = findViewById(R.id.radioGrupoConexao);
        blocoAcoesPdv = findViewById(R.id.blocoAcoesPdv);
        btnTestarPdv = findViewById(R.id.btnTestarPdv);
        btnCarregarCatalogo = findViewById(R.id.btnCarregarCatalogo);
        inputPdv = findViewById(R.id.inputNumeroPdv);
        inputMesas = findViewById(R.id.inputQuantidadeMesas);
        layoutMesas = findViewById(R.id.layoutQuantidadeMesas);
        txtConfigOrigemPdv = findViewById(R.id.txtConfigOrigemPdv);
        switchEmitirNfce = findViewById(R.id.switchEmitirNfcePos);
        switchFichasEvento = findViewById(R.id.switchFichasEvento);
        switchPixQr = findViewById(R.id.switchPixQr);
        inputChavePix = findViewById(R.id.inputChavePix);
        inputNomePix = findViewById(R.id.inputNomePix);
        inputCidadePix = findViewById(R.id.inputCidadePix);
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
        if (prefs.isModoPdvLocal()) {
            radioGrupoConexao.check(R.id.radioConexaoPdv);
        } else {
            radioGrupoConexao.check(R.id.radioConexaoCloud);
        }
        aplicarModoUi(prefs.isModoPdvLocal());
        radioGrupoConexao.setOnCheckedChangeListener((group, checkedId) -> {
            boolean local = checkedId == R.id.radioConexaoPdv;
            aplicarModoUi(local);
            sugerirUrlPadrao(local);
        });
        inputPdv.setText(String.valueOf(prefs.getNumeroPdv()));
        inputMesas.setText(String.valueOf(prefs.getQuantidadeMesas()));
        switchEmitirNfce.setChecked(prefs.isEmitirNfcePos());
        switchFichasEvento.setChecked(prefs.isImprimirFichasEvento());
        switchPixQr.setChecked(prefs.isPixQrHabilitado());
        inputChavePix.setText(prefs.getChavePix());
        inputNomePix.setText(prefs.getNomePix());
        inputCidadePix.setText(prefs.getCidadePix());
        selecionarRadioTema(ThemeHelper.normalizar(prefs.getTema()));
        impressoraIdSelecionada = prefs.getImpressoraId() != null ? prefs.getImpressoraId() : "";
        impressoraNomeSelecionada = prefs.getImpressoraNome();
        impressoraTipoSelecionada = prefs.getImpressoraTipo();
        atualizarTextoImpressoraSelecionada();
        SoftInputHelper.hideOnStart(this);

        btnSalvar.setOnClickListener(v -> salvar());
        btnTestarPdv.setOnClickListener(v -> testarPdv());
        btnCarregarCatalogo.setOnClickListener(v -> carregarCatalogo());
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

    @Override
    protected void onResume() {
        super.onResume();
        if (modoPdvLocal()) {
            sincronizarCamposDoPdv();
        }
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
        String chavePix = inputChavePix.getText() == null
                ? ""
                : inputChavePix.getText().toString().trim();
        if (switchPixQr.isChecked() && chavePix.isEmpty()) {
            Toast.makeText(this, R.string.pix_chave_obrigatoria, Toast.LENGTH_SHORT).show();
            return;
        }
        prefs.setBaseUrl(url);
        prefs.setConexaoModo(modoPdvLocal() ? PrefsStore.MODO_PDV_LOCAL : PrefsStore.MODO_CLOUD);
        if (!modoPdvLocal()) {
            prefs.setNumeroPdv(pdv);
            prefs.setQuantidadeMesas(mesas);
        }
        prefs.setEmitirNfcePos(switchEmitirNfce.isChecked());
        prefs.setImprimirFichasEvento(switchFichasEvento.isChecked());
        prefs.setPixQrHabilitado(switchPixQr.isChecked());
        prefs.setChavePix(chavePix);
        prefs.setNomePix(inputNomePix.getText() == null ? "" : inputNomePix.getText().toString());
        prefs.setCidadePix(inputCidadePix.getText() == null ? "" : inputCidadePix.getText().toString());
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

    private boolean modoPdvLocal() {
        return radioGrupoConexao.getCheckedRadioButtonId() == R.id.radioConexaoPdv;
    }

    private void aplicarModoUi(boolean local) {
        layoutUrlApi.setHint(local ? getString(R.string.url_pdv_local) : getString(R.string.url_api));
        blocoAcoesPdv.setVisibility(local ? View.VISIBLE : View.GONE);
        int cupom = local ? View.GONE : View.VISIBLE;
        ocultarCard(switchEmitirNfce, cupom);
        ocultarCard(switchPixQr, cupom);
        ocultarCard(txtImpressoraSelecionada, cupom);
        inputPdv.setEnabled(!local);
        inputMesas.setEnabled(!local);
        txtConfigOrigemPdv.setVisibility(local ? View.VISIBLE : View.GONE);
        atualizarCamposOrigemPdv();
        if (local) {
            sincronizarCamposDoPdv();
        }
    }

    private void sincronizarCamposDoPdv() {
        executor.execute(() -> {
            try {
                api.sincronizarConfigPdv();
                runOnUiThread(this::atualizarCamposOrigemPdv);
            } catch (Exception ignored) {
            }
        });
    }

    private void atualizarCamposOrigemPdv() {
        inputPdv.setText(String.valueOf(prefs.getNumeroPdv()));
        inputMesas.setText(String.valueOf(prefs.getQuantidadeMesas()));
        boolean comanda = prefs.isModeloComanda();
        if (layoutMesas != null) {
            layoutMesas.setHint(getString(comanda ? R.string.quantidade_comandas : R.string.quantidade_mesas));
        }
        if (txtConfigOrigemPdv != null && prefs.isModoPdvLocal()) {
            txtConfigOrigemPdv.setText(getString(
                    R.string.config_origem_pdv_detalhe,
                    getString(comanda ? R.string.comandas : R.string.mesas),
                    prefs.getQuantidadeMesas(),
                    prefs.getNumeroPdv()));
        }
    }

    private void ocultarCard(View inner, int visibility) {
        if (inner == null) {
            return;
        }
        View parent = (View) inner.getParent();
        if (parent != null && parent.getParent() instanceof View) {
            ((View) parent.getParent()).setVisibility(visibility);
        }
    }

    private void sugerirUrlPadrao(boolean local) {
        String atual = inputUrl.getText() == null ? "" : inputUrl.getText().toString().trim();
        String cloud = prefs.getUrlPadraoCloud();
        String pdv = prefs.getUrlPadraoPdv();
        if (local && (atual.isEmpty() || atual.equals(cloud))) {
            inputUrl.setText(pdv);
        } else if (!local && (atual.isEmpty() || atual.equals(pdv))) {
            inputUrl.setText(cloud);
        }
    }

    private void aplicarUrlModoLocal() {
        String url = inputUrl.getText() == null ? "" : inputUrl.getText().toString().trim();
        prefs.setBaseUrl(url);
        prefs.setConexaoModo(PrefsStore.MODO_PDV_LOCAL);
    }

    private void testarPdv() {
        aplicarUrlModoLocal();
        btnTestarPdv.setEnabled(false);
        executor.execute(() -> {
            try {
                api.pingPdv();
                try {
                    api.sincronizarConfigPdv();
                } catch (ApiException ignored) {
                }
                runOnUiThread(() -> {
                    btnTestarPdv.setEnabled(true);
                    atualizarCamposOrigemPdv();
                    Toast.makeText(this, R.string.pdv_ok, Toast.LENGTH_SHORT).show();
                });
            } catch (ApiException e) {
                runOnUiThread(() -> {
                    btnTestarPdv.setEnabled(true);
                    Toast.makeText(this, e.getMessage(), Toast.LENGTH_LONG).show();
                });
            }
        });
    }

    private void carregarCatalogo() {
        aplicarUrlModoLocal();
        btnCarregarCatalogo.setEnabled(false);
        executor.execute(() -> {
            try {
                int total = api.carregarCatalogo();
                runOnUiThread(() -> {
                    btnCarregarCatalogo.setEnabled(true);
                    atualizarCamposOrigemPdv();
                    Toast.makeText(this, getString(R.string.catalogo_carregado, total), Toast.LENGTH_LONG)
                            .show();
                });
            } catch (ApiException e) {
                runOnUiThread(() -> {
                    btnCarregarCatalogo.setEnabled(true);
                    Toast.makeText(this, e.getMessage(), Toast.LENGTH_LONG).show();
                });
            }
        });
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        executor.shutdownNow();
    }
}
