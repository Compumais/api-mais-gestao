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
import com.pos_mais_gestao.hardware.ImpressoraRedeEndereco;
import com.pos_mais_gestao.hardware.UsbEscPos;
import com.pos_mais_gestao.ui.atalhos.AtalhosActivity;
import com.pos_mais_gestao.ui.empresa.EmpresaActivity;
import com.pos_mais_gestao.ui.login.LoginActivity;
import com.pos_mais_gestao.util.CodigoScanHelper;
import com.pos_mais_gestao.util.CupomTexto;
import com.pos_mais_gestao.util.EtiquetaBalanca;
import com.pos_mais_gestao.util.PosConnectionQrParser;
import com.pos_mais_gestao.util.SoftInputHelper;
import com.pos_mais_gestao.util.ThemeHelper;
import com.journeyapps.barcodescanner.ScanOptions;
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
    private MaterialButton btnLerQrPdv;
    private TextInputEditText inputPdv;
    private TextInputEditText inputMesas;
    private TextInputLayout layoutMesas;
    private TextView txtConfigOrigemPdv;
    private RadioGroup radioGrupoModelo;
    private SwitchMaterial switchEtiquetaBalanca;
    private TextInputEditText inputEtiquetaPrefixo;
    private TextInputEditText inputEtiquetaDigitos;
    private RadioGroup radioGrupoEtiquetaConteudo;
    private SwitchMaterial switchEtiquetaCentavos;
    private SwitchMaterial switchEtiquetaIndicador;
    private SwitchMaterial switchEmitirNfce;
    private SwitchMaterial switchFichasEvento;
    private SwitchMaterial switchPixQr;
    private SwitchMaterial switchPedirNomeCliente;
    private TextInputEditText inputChavePix;
    private TextInputEditText inputNomePix;
    private TextInputEditText inputCidadePix;
    private RadioGroup radioGrupoTema;
    private LinearLayout listaImpressoras;
    private TextView txtImpressoraSelecionada;
    private TextView txtSemImpressoras;
    private TextInputEditText inputImpressoraHost;
    private TextInputEditText inputImpressoraPorta;
    private RadioGroup radioGrupoLargura;
    private final List<ImpressoraInfo> impressoras = new ArrayList<>();
    private String impressoraIdSelecionada = "";
    private String impressoraNomeSelecionada;
    private String impressoraTipoSelecionada = ImpressoraInfo.TIPO_NENHUMA;
    private CodigoScanHelper scanHelper;

    private final ActivityResultLauncher<ScanOptions> scanLauncher =
            CodigoScanHelper.registrarScan(this, this::aplicarQrPdv);
    private final ActivityResultLauncher<String> cameraPermissionLauncher =
            CodigoScanHelper.registrarPermissao(this, () -> {
                if (scanHelper != null) {
                    scanHelper.abrirCamera();
                }
            });

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
        btnLerQrPdv = findViewById(R.id.btnLerQrPdv);
        inputPdv = findViewById(R.id.inputNumeroPdv);
        inputMesas = findViewById(R.id.inputQuantidadeMesas);
        layoutMesas = findViewById(R.id.layoutQuantidadeMesas);
        txtConfigOrigemPdv = findViewById(R.id.txtConfigOrigemPdv);
        radioGrupoModelo = findViewById(R.id.radioGrupoModelo);
        switchEtiquetaBalanca = findViewById(R.id.switchEtiquetaBalanca);
        inputEtiquetaPrefixo = findViewById(R.id.inputEtiquetaPrefixo);
        inputEtiquetaDigitos = findViewById(R.id.inputEtiquetaDigitos);
        radioGrupoEtiquetaConteudo = findViewById(R.id.radioGrupoEtiquetaConteudo);
        switchEtiquetaCentavos = findViewById(R.id.switchEtiquetaCentavos);
        switchEtiquetaIndicador = findViewById(R.id.switchEtiquetaIndicador);
        switchEmitirNfce = findViewById(R.id.switchEmitirNfcePos);
        switchFichasEvento = findViewById(R.id.switchFichasEvento);
        switchPixQr = findViewById(R.id.switchPixQr);
        switchPedirNomeCliente = findViewById(R.id.switchPedirNomeCliente);
        inputChavePix = findViewById(R.id.inputChavePix);
        inputNomePix = findViewById(R.id.inputNomePix);
        inputCidadePix = findViewById(R.id.inputCidadePix);
        radioGrupoTema = findViewById(R.id.radioGrupoTema);
        listaImpressoras = findViewById(R.id.listaImpressoras);
        txtImpressoraSelecionada = findViewById(R.id.txtImpressoraSelecionada);
        txtSemImpressoras = findViewById(R.id.txtSemImpressoras);
        inputImpressoraHost = findViewById(R.id.inputImpressoraHost);
        inputImpressoraPorta = findViewById(R.id.inputImpressoraPorta);
        radioGrupoLargura = findViewById(R.id.radioGrupoLargura);
        MaterialButton btnSalvar = findViewById(R.id.btnSalvarConfig);
        MaterialButton btnAtalhos = findViewById(R.id.btnGerenciarAtalhos);
        MaterialButton btnTrocarEmpresa = findViewById(R.id.btnTrocarEmpresa);
        MaterialButton btnLogout = findViewById(R.id.btnLogout);
        MaterialButton btnAtualizarImpressoras = findViewById(R.id.btnAtualizarImpressoras);
        MaterialButton btnUsarImpressoraRede = findViewById(R.id.btnUsarImpressoraRede);
        MaterialButton btnConfigBalanca = findViewById(R.id.btnConfigBalanca);
        scanHelper = new CodigoScanHelper(
                this,
                scanLauncher,
                cameraPermissionLauncher,
                this::aplicarQrPdv,
                R.string.escanear_qr_pdv);

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
        switchPedirNomeCliente.setChecked(prefs.isModalAbrirMesaHabilitado());
        inputChavePix.setText(prefs.getChavePix());
        inputNomePix.setText(prefs.getNomePix());
        inputCidadePix.setText(prefs.getCidadePix());
        preencherOperacao();
        selecionarRadioTema(ThemeHelper.normalizar(prefs.getTema()));
        impressoraIdSelecionada = prefs.getImpressoraId() != null ? prefs.getImpressoraId() : "";
        impressoraNomeSelecionada = prefs.getImpressoraNome();
        impressoraTipoSelecionada = prefs.getImpressoraTipo();
        preencherCamposRede();
        if (prefs.getColunasImpressao() == CupomTexto.COLUNAS_80) {
            radioGrupoLargura.check(R.id.radioLargura80);
        } else {
            radioGrupoLargura.check(R.id.radioLargura58);
        }
        atualizarTextoImpressoraSelecionada();
        SoftInputHelper.hideOnStart(this);

        btnSalvar.setOnClickListener(v -> salvar());
        btnTestarPdv.setOnClickListener(v -> testarPdv());
        btnCarregarCatalogo.setOnClickListener(v -> carregarCatalogo());
        btnLerQrPdv.setOnClickListener(v -> scanHelper.iniciar());
        btnAtalhos.setOnClickListener(v -> startActivity(new Intent(this, AtalhosActivity.class)));
        btnAtualizarImpressoras.setOnClickListener(v -> solicitarPermissaoECarregar());
        btnUsarImpressoraRede.setOnClickListener(v -> usarImpressoraRede());
        btnConfigBalanca.setOnClickListener(v ->
                startActivity(new Intent(this, BalancaConfigActivity.class)));
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
        acrescentarImpressoraRede();
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
        if (ImpressoraInfo.TIPO_USB.equals(info.tipo) || ImpressoraInfo.TIPO_REDE.equals(info.tipo)) {
            return info.id;
        }
        return getString(R.string.impressora_nenhuma);
    }

    private void preencherCamposRede() {
        ImpressoraRedeEndereco endereco = ImpressoraInfo.TIPO_REDE.equals(impressoraTipoSelecionada)
                ? ImpressoraRedeEndereco.parse(impressoraIdSelecionada)
                : null;
        inputImpressoraHost.setText(endereco == null ? "" : endereco.host);
        inputImpressoraPorta.setText(String.valueOf(
                endereco == null ? ImpressoraRedeEndereco.PORTA_PADRAO : endereco.porta));
    }

    private void usarImpressoraRede() {
        ImpressoraInfo rede = impressoraRedeDosCampos();
        if (rede == null) {
            Toast.makeText(this, R.string.impressora_rede_invalida, Toast.LENGTH_LONG).show();
            return;
        }
        selecionarImpressora(rede);
        carregarImpressoras();
        Toast.makeText(this, R.string.impressora_rede_pronta, Toast.LENGTH_SHORT).show();
    }

    private void acrescentarImpressoraRede() {
        ImpressoraInfo rede = impressoraRedeDosCampos();
        if (rede == null && ImpressoraInfo.TIPO_REDE.equals(impressoraTipoSelecionada)) {
            ImpressoraRedeEndereco endereco = ImpressoraRedeEndereco.parse(impressoraIdSelecionada);
            if (endereco != null) {
                rede = new ImpressoraInfo(endereco.formatar(), endereco.nomeExibicao(), ImpressoraInfo.TIPO_REDE);
            }
        }
        if (rede == null) {
            return;
        }
        if (ImpressoraInfo.TIPO_REDE.equals(impressoraTipoSelecionada)) {
            impressoraIdSelecionada = rede.id;
            impressoraNomeSelecionada = rede.nome;
        }
        impressoras.add(rede);
    }

    private ImpressoraInfo impressoraRedeDosCampos() {
        String host = inputImpressoraHost.getText() == null
                ? ""
                : inputImpressoraHost.getText().toString();
        String porta = inputImpressoraPorta.getText() == null
                ? ""
                : inputImpressoraPorta.getText().toString();
        ImpressoraRedeEndereco endereco = ImpressoraRedeEndereco.montar(host, porta);
        if (endereco == null) {
            return null;
        }
        return new ImpressoraInfo(endereco.formatar(), endereco.nomeExibicao(), ImpressoraInfo.TIPO_REDE);
    }

    private void selecionarImpressora(ImpressoraInfo info) {
        impressoraIdSelecionada = info.id != null ? info.id : "";
        impressoraNomeSelecionada = info.nome;
        impressoraTipoSelecionada = info.tipo;
        if (ImpressoraInfo.TIPO_USB.equals(info.tipo)) {
            UsbEscPos.solicitarPermissaoSeNecessario(this, info.id);
        }
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
        boolean local = modoPdvLocal();
        boolean conexaoMudou = prefs.isModoPdvLocal() != local
                || !prefs.getBaseUrl().equals(normalizarUrl(url));
        boolean precisaLogin = conexaoMudou || !prefs.isLoggedIn();
        String pdvStr = inputPdv.getText() == null ? "1" : inputPdv.getText().toString().trim();
        String mesasStr = inputMesas.getText() == null ? "20" : inputMesas.getText().toString().trim();
        if (url.isEmpty()) {
            Toast.makeText(this, "Informe a URL da API", Toast.LENGTH_SHORT).show();
            return;
        }
        if (ImpressoraInfo.TIPO_REDE.equals(impressoraTipoSelecionada)) {
            ImpressoraInfo rede = impressoraRedeDosCampos();
            if (rede == null) {
                Toast.makeText(this, R.string.impressora_rede_invalida, Toast.LENGTH_LONG).show();
                return;
            }
            impressoraIdSelecionada = rede.id;
            impressoraNomeSelecionada = rede.nome;
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
        if (conexaoMudou) {
            prefs.logout();
        }
        prefs.setBaseUrl(url);
        prefs.setConexaoModo(local ? PrefsStore.MODO_PDV_LOCAL : PrefsStore.MODO_CLOUD);
        if (!local) {
            prefs.setNumeroPdv(pdv);
            prefs.setQuantidadeMesas(mesas);
        }
        prefs.setEmitirNfcePos(switchEmitirNfce.isChecked());
        prefs.setImprimirFichasEvento(switchFichasEvento.isChecked());
        prefs.setPixQrHabilitado(switchPixQr.isChecked());
        prefs.setModalAbrirMesaHabilitado(switchPedirNomeCliente.isChecked());
        if (!local && radioGrupoModelo != null) {
            prefs.setModeloAtendimento(radioGrupoModelo.getCheckedRadioButtonId() == R.id.radioModeloComanda
                    ? PrefsStore.MODELO_COMANDA
                    : PrefsStore.MODELO_MESA);
        }
        prefs.setEtiquetaBalanca(lerEtiqueta());
        prefs.setChavePix(chavePix);
        prefs.setNomePix(inputNomePix.getText() == null ? "" : inputNomePix.getText().toString());
        prefs.setCidadePix(inputCidadePix.getText() == null ? "" : inputCidadePix.getText().toString());
        prefs.setImpressora(impressoraIdSelecionada, impressoraNomeSelecionada, impressoraTipoSelecionada);
        prefs.setColunasImpressao(radioGrupoLargura.getCheckedRadioButtonId() == R.id.radioLargura80
                ? CupomTexto.COLUNAS_80
                : CupomTexto.COLUNAS_58);
        String tema = lerTemaSelecionado();
        prefs.setTema(tema);
        ThemeHelper.aplicar(tema);
        if (!local && !precisaLogin && prefs.isLoggedIn()) {
            executor.execute(() -> {
                try {
                    api.salvarConfiguracaoEmpresa();
                    runOnUiThread(() -> {
                        Toast.makeText(this, "Configurações salvas", Toast.LENGTH_SHORT).show();
                        finish();
                    });
                } catch (ApiException e) {
                    runOnUiThread(() ->
                            Toast.makeText(this, e.getMessage(), Toast.LENGTH_LONG).show());
                }
            });
            return;
        }
        Toast.makeText(this, "Configurações salvas", Toast.LENGTH_SHORT).show();
        if (precisaLogin) {
            abrirLogin();
            return;
        }
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
        btnLerQrPdv.setVisibility(local ? View.VISIBLE : View.GONE);
        int cupom = local ? View.GONE : View.VISIBLE;
        ocultarCard(switchEmitirNfce, cupom);
        ocultarCard(switchPixQr, cupom);
        ocultarCard(txtImpressoraSelecionada, cupom);
        inputPdv.setEnabled(!local);
        inputMesas.setEnabled(!local);
        if (radioGrupoModelo != null) {
            for (int i = 0; i < radioGrupoModelo.getChildCount(); i++) {
                radioGrupoModelo.getChildAt(i).setEnabled(!local);
            }
        }
        txtConfigOrigemPdv.setVisibility(local ? View.VISIBLE : View.GONE);
        atualizarCamposOrigemPdv();
        if (local) {
            sincronizarCamposDoPdv();
        } else if (prefs.isLoggedIn()) {
            executor.execute(() -> {
                try {
                    api.sincronizarConfiguracaoEmpresa();
                    runOnUiThread(this::preencherOperacao);
                } catch (Exception ignored) {
                }
            });
        }
    }

    private void preencherOperacao() {
        if (radioGrupoModelo != null) {
            radioGrupoModelo.check(prefs.isModeloComanda() ? R.id.radioModeloComanda : R.id.radioModeloMesa);
        }
        EtiquetaBalanca.Config etiqueta = prefs.getEtiquetaBalanca();
        if (switchEtiquetaBalanca != null) {
            switchEtiquetaBalanca.setChecked(etiqueta.habilitada);
        }
        if (inputEtiquetaPrefixo != null) {
            inputEtiquetaPrefixo.setText(etiqueta.prefixo);
        }
        if (inputEtiquetaDigitos != null) {
            inputEtiquetaDigitos.setText(String.valueOf(etiqueta.digitosCodigo));
        }
        if (radioGrupoEtiquetaConteudo != null) {
            radioGrupoEtiquetaConteudo.check(etiqueta.conteudoPeso
                    ? R.id.radioEtiquetaPeso
                    : R.id.radioEtiquetaPreco);
        }
        if (switchEtiquetaCentavos != null) {
            switchEtiquetaCentavos.setChecked(etiqueta.centavos);
        }
        if (switchEtiquetaIndicador != null) {
            switchEtiquetaIndicador.setChecked(etiqueta.indicadorUso);
        }
        boolean comanda = prefs.isModeloComanda();
        if (layoutMesas != null) {
            layoutMesas.setHint(getString(comanda ? R.string.quantidade_comandas : R.string.quantidade_mesas));
        }
    }

    private EtiquetaBalanca.Config lerEtiqueta() {
        int digitos = 4;
        try {
            digitos = Integer.parseInt(inputEtiquetaDigitos.getText() == null
                    ? "4"
                    : inputEtiquetaDigitos.getText().toString().trim());
        } catch (Exception ignored) {
        }
        String prefixo = inputEtiquetaPrefixo.getText() == null
                ? "2"
                : inputEtiquetaPrefixo.getText().toString().trim();
        return new EtiquetaBalanca.Config(
                switchEtiquetaBalanca.isChecked(),
                prefixo,
                digitos,
                radioGrupoEtiquetaConteudo.getCheckedRadioButtonId() == R.id.radioEtiquetaPeso,
                switchEtiquetaCentavos.isChecked(),
                switchEtiquetaIndicador.isChecked());
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
        if (radioGrupoModelo != null) {
            radioGrupoModelo.check(comanda ? R.id.radioModeloComanda : R.id.radioModeloMesa);
        }
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
        boolean mudouConexao = !prefs.isModoPdvLocal() || !prefs.getBaseUrl().equals(normalizarUrl(url));
        if (mudouConexao) {
            prefs.logout();
        }
        prefs.setBaseUrl(url);
        prefs.setConexaoModo(PrefsStore.MODO_PDV_LOCAL);
    }

    private String normalizarUrl(String url) {
        return url == null ? "" : url.trim().replaceAll("/+$", "");
    }

    private void aplicarQrPdv(String conteudo) {
        try {
            String url = PosConnectionQrParser.parse(conteudo);
            prefs.logout();
            prefs.setBaseUrl(url);
            prefs.setConexaoModo(PrefsStore.MODO_PDV_LOCAL);
            inputUrl.setText(url);
            radioGrupoConexao.check(R.id.radioConexaoPdv);
            Toast.makeText(this, R.string.qr_pdv_lido_login, Toast.LENGTH_LONG).show();
            abrirLogin();
        } catch (IllegalArgumentException error) {
            Toast.makeText(this, error.getMessage(), Toast.LENGTH_LONG).show();
        }
    }

    private void abrirLogin() {
        Intent intent = new Intent(this, LoginActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        startActivity(intent);
        finish();
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
        if (!prefs.isLoggedIn()) {
            Toast.makeText(this, R.string.login_pdv_necessario, Toast.LENGTH_LONG).show();
            abrirLogin();
            return;
        }
        btnCarregarCatalogo.setEnabled(false);
        btnCarregarCatalogo.setText(R.string.catalogo_sincronizando);
        executor.execute(() -> {
            try {
                ApiClient.CatalogSyncResult resultado = api.carregarCatalogo(
                        (concluido, total) -> runOnUiThread(() ->
                                btnCarregarCatalogo.setText(
                                        getString(R.string.catalogo_imagens_progresso, concluido, total))));
                runOnUiThread(() -> {
                    btnCarregarCatalogo.setEnabled(true);
                    btnCarregarCatalogo.setText(R.string.carregar_catalogo);
                    atualizarCamposOrigemPdv();
                    Toast.makeText(
                                    this,
                                    getString(
                                            R.string.catalogo_carregado_com_imagens,
                                            resultado.produtos,
                                            resultado.imagensBaixadas,
                                            resultado.imagensReutilizadas,
                                            resultado.imagensFalhas),
                                    Toast.LENGTH_LONG)
                            .show();
                });
            } catch (ApiException e) {
                runOnUiThread(() -> {
                    btnCarregarCatalogo.setEnabled(true);
                    btnCarregarCatalogo.setText(R.string.carregar_catalogo);
                    if (e.getStatusCode() == 401) {
                        prefs.logout();
                        Toast.makeText(this, R.string.sessao_pdv_expirada, Toast.LENGTH_LONG).show();
                        abrirLogin();
                        return;
                    }
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
