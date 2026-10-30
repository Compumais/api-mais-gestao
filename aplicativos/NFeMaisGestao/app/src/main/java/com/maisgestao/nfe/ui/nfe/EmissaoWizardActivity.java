package com.maisgestao.nfe.ui.nfe;

import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.CheckBox;
import android.widget.GridLayout;
import android.widget.ProgressBar;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;
import android.widget.ViewFlipper;
import com.google.android.material.dialog.MaterialAlertDialogBuilder;
import com.google.android.material.progressindicator.LinearProgressIndicator;
import com.maisgestao.nfe.ui.NfeAppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.google.android.material.button.MaterialButton;
import com.google.android.material.textfield.TextInputEditText;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.maisgestao.nfe.NfeApplication;
import com.maisgestao.nfe.R;
import com.maisgestao.nfe.data.api.ApiClient;
import com.maisgestao.nfe.data.api.dto.CfopDto;
import com.maisgestao.nfe.data.api.dto.CondicaoPagamentoDto;
import com.maisgestao.nfe.data.api.dto.EntidadeDto;
import com.maisgestao.nfe.data.api.dto.PlanoContasDto;
import com.maisgestao.nfe.data.api.dto.ProdutoDto;
import com.maisgestao.nfe.data.api.dto.SerieDto;
import com.maisgestao.nfe.data.api.dto.TipoDocumentoFinanceiroDto;
import com.maisgestao.nfe.data.local.PrefsStore;
import com.maisgestao.nfe.domain.EmissaoFormStore;
import com.maisgestao.nfe.domain.EmissaoPayloadBuilder;
import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class EmissaoWizardActivity extends NfeAppCompatActivity {
    private static final int TOTAL_STEPS = 8;
    private static final int[] STEP_TITLE_IDS = {
        R.string.wizard_step_contexto,
        R.string.wizard_step_destinatario,
        R.string.wizard_step_itens,
        R.string.wizard_step_itens_conf,
        R.string.wizard_step_tributos,
        R.string.wizard_step_pagamento,
        R.string.wizard_step_transporte,
        R.string.wizard_step_revisao,
    };
    private static final int STEP_CONTEXTO = 0;
    private static final int STEP_DESTINATARIO = 1;
    private static final int STEP_ITENS_BUSCA = 2;
    private static final int STEP_ITENS_CONF = 3;
    private static final int STEP_TRIBUTOS = 4;
    private static final int STEP_PAGAMENTO = 5;
    private static final int STEP_TRANSPORTE = 6;
    private static final int STEP_REVISAO = 7;

    private static final int ESCOPO_COMPRA_E_VENDA = 0;
    private static final int ESCOPO_VENDAS = 1;
    private static final int TIPO_CONTA_RECEITA = 1;

    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final Handler debounceHandler = new Handler(Looper.getMainLooper());
    private final NumberFormat moeda = NumberFormat.getCurrencyInstance(new Locale("pt", "BR"));

    private EmissaoFormStore store;
    private ApiClient api;
    private PrefsStore prefs;
    private ViewFlipper flipper;
    private TextView textStep;
    private TextView textStepTitle;
    private LinearProgressIndicator wizardProgress;
    private ProgressBar progress;

    private Spinner spinnerNatureza;
    private Spinner spinnerSerie;
    private TextView textAmbiente;
    private Spinner spinnerIndPres;
    private Spinner spinnerIdDest;

    private TextInputEditText inputBuscaCliente;
    private TextView textDestinatarioSelecionado;
    private RecyclerView listClientes;
    private ClientePickAdapter clienteAdapter;
    private final List<EntidadeDto> clientesApi = new ArrayList<>();

    private TextInputEditText inputBuscaProduto;
    private RecyclerView listProdutos;
    private ProdutoPickAdapter produtoAdapter;

    private RecyclerView listItens;
    private TextView textSemItens;
    private ItemAdapter itemAdapter;

    private TextView textTributosStatus;
    private RecyclerView listTributosItens;
    private GridLayout gridTotaisFiscais;
    private TextView textTotalNota;
    private TributoItemAdapter tributoItemAdapter;
    private boolean tributosCalculando;

    private Spinner spinnerPagamento;
    private Spinner spinnerTipoDocumento;
    private Spinner spinnerCondicaoPagamento;
    private Spinner spinnerPlanoContas;

    private Spinner spinnerModFrete;
    private TextInputEditText inputValorFrete;
    private TextInputEditText inputValorSeguro;
    private TextInputEditText inputOutrasDespesas;

    private ViewGroup revisaoContainer;
    private CheckBox checkConfirmarProducao;

    private final List<SerieDto> series = new ArrayList<>();
    private final List<String> seriesLabels = new ArrayList<>();
    private final List<CfopDto> cfops = new ArrayList<>();
    private final List<String> cfopLabels = new ArrayList<>();
    private final List<TipoDocumentoFinanceiroDto> tiposDocumento = new ArrayList<>();
    private final List<String> tiposDocumentoLabels = new ArrayList<>();
    private final List<CondicaoPagamentoDto> condicoesPagamento = new ArrayList<>();
    private final List<String> condicoesLabels = new ArrayList<>();
    private final List<PlanoContasDto> planosContas = new ArrayList<>();
    private final List<String> planosLabels = new ArrayList<>();

    private Runnable buscaClienteRunnable;
    private Runnable buscaProdutoRunnable;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_emissao_wizard);

        NfeApplication app = (NfeApplication) getApplication();
        api = app.getApiClient();
        prefs = app.getPrefsStore();
        store = EmissaoFormStore.get();
        String idempresa = prefs.getEmpresaId();
        String rascunhoId = getIntent().getStringExtra("rascunho_id");
        store.reset(idempresa, rascunhoId);

        flipper = findViewById(R.id.wizardFlipper);
        textStep = findViewById(R.id.textStep);
        textStepTitle = findViewById(R.id.textStepTitle);
        wizardProgress = findViewById(R.id.wizardProgress);
        progress = findViewById(R.id.progress);

        bindContextoStep();
        bindDestinatarioStep();
        bindItensBuscaStep();
        bindItensConfStep();
        bindTributosStep();
        bindPagamentoStep();
        bindTransporteStep();
        bindRevisaoStep();

        MaterialButton btnVoltar = findViewById(R.id.btnWizardVoltar);
        MaterialButton btnAvancar = findViewById(R.id.btnWizardAvancar);
        btnVoltar.setOnClickListener(v -> voltar());
        btnAvancar.setOnClickListener(v -> avancar());

        carregarConfigNfe();
        carregarListasPagamento();
        buscarClientes("");
        atualizarStepUi();
    }

    private void bindContextoStep() {
        spinnerNatureza = findViewById(R.id.spinnerNatureza);
        spinnerSerie = findViewById(R.id.spinnerSerie);
        textAmbiente = findViewById(R.id.textAmbiente);
        spinnerIndPres = findViewById(R.id.spinnerIndPres);
        spinnerIdDest = findViewById(R.id.spinnerIdDest);

        ArrayAdapter<String> indPres = new ArrayAdapter<>(
                this, android.R.layout.simple_spinner_dropdown_item,
                new String[]{"1 - Presencial", "2 - Internet", "9 - Outros"});
        spinnerIndPres.setAdapter(indPres);
        ArrayAdapter<String> idDest = new ArrayAdapter<>(
                this, android.R.layout.simple_spinner_dropdown_item,
                new String[]{"1 - Operação interna", "2 - Interestadual", "3 - Exterior"});
        spinnerIdDest.setAdapter(idDest);
    }

    private void bindDestinatarioStep() {
        inputBuscaCliente = findViewById(R.id.inputBuscaCliente);
        textDestinatarioSelecionado = findViewById(R.id.textDestinatarioSelecionado);
        listClientes = findViewById(R.id.listClientesWizard);
        listClientes.setLayoutManager(new LinearLayoutManager(this));
        clienteAdapter = new ClientePickAdapter(cliente -> {
            store.setDestinatario(cliente);
            atualizarDestinatarioUi();
            Toast.makeText(this, getString(R.string.cliente_selecionado), Toast.LENGTH_SHORT).show();
        });
        listClientes.setAdapter(clienteAdapter);

        inputBuscaCliente.addTextChangedListener(new SimpleTextWatcher() {
            @Override
            public void afterTextChanged(Editable s) {
                if (buscaClienteRunnable != null) {
                    debounceHandler.removeCallbacks(buscaClienteRunnable);
                }
                String q = s == null ? "" : s.toString().trim();
                buscaClienteRunnable = () -> buscarClientes(q);
                debounceHandler.postDelayed(buscaClienteRunnable, 400);
                clienteAdapter.setFiltro(q);
            }
        });
    }

    private void bindItensBuscaStep() {
        inputBuscaProduto = findViewById(R.id.inputBuscaProdutoWizard);
        listProdutos = findViewById(R.id.listProdutosWizard);
        listProdutos.setLayoutManager(new LinearLayoutManager(this));
        produtoAdapter = new ProdutoPickAdapter(this::mostrarDialogAdicionarItem);
        listProdutos.setAdapter(produtoAdapter);

        inputBuscaProduto.addTextChangedListener(new SimpleTextWatcher() {
            @Override
            public void afterTextChanged(Editable s) {
                if (buscaProdutoRunnable != null) {
                    debounceHandler.removeCallbacks(buscaProdutoRunnable);
                }
                String q = s == null ? "" : s.toString().trim();
                buscaProdutoRunnable = () -> buscarProdutos(q);
                debounceHandler.postDelayed(buscaProdutoRunnable, 400);
            }
        });
    }

    private void bindItensConfStep() {
        listItens = findViewById(R.id.listItensWizard);
        textSemItens = findViewById(R.id.textSemItens);
        listItens.setLayoutManager(new LinearLayoutManager(this));
        itemAdapter = new ItemAdapter(index -> {
            store.removeItem(index);
            atualizarListaItensUi();
        });
        listItens.setAdapter(itemAdapter);
    }

    private void bindTributosStep() {
        textTributosStatus = findViewById(R.id.textTributosStatus);
        listTributosItens = findViewById(R.id.listTributosItens);
        gridTotaisFiscais = findViewById(R.id.gridTotaisFiscais);
        textTotalNota = findViewById(R.id.textTotalNota);
        listTributosItens.setLayoutManager(new LinearLayoutManager(this));
        tributoItemAdapter = new TributoItemAdapter();
        listTributosItens.setAdapter(tributoItemAdapter);
    }

    private void bindPagamentoStep() {
        spinnerPagamento = findViewById(R.id.spinnerPagamento);
        spinnerTipoDocumento = findViewById(R.id.spinnerTipoDocumento);
        spinnerCondicaoPagamento = findViewById(R.id.spinnerCondicaoPagamento);
        spinnerPlanoContas = findViewById(R.id.spinnerPlanoContas);

        ArrayAdapter<String> formas = new ArrayAdapter<>(
                this,
                android.R.layout.simple_spinner_dropdown_item,
                new String[]{
                    "01 - Dinheiro",
                    "03 - Cartão crédito",
                    "04 - Cartão débito",
                    "15 - Boleto",
                    "17 - PIX",
                    "90 - Sem pagamento"
                });
        spinnerPagamento.setAdapter(formas);

        spinnerTipoDocumento.setOnItemSelectedListener(new SimpleSpinnerListener() {
            @Override
            public void onItemSelected(int position) {
                if (position <= 0 || position > tiposDocumento.size()) {
                    return;
                }
                TipoDocumentoFinanceiroDto tipo = tiposDocumento.get(position - 1);
                if (tipo.formapagamentonfe != null && !tipo.formapagamentonfe.trim().isEmpty()) {
                    selecionarFormaPagamentoCodigo(tipo.formapagamentonfe.trim());
                }
                if (tipo.idplanocontas != null) {
                    selecionarPlanoContas(tipo.idplanocontas);
                }
            }
        });
    }

    private void bindTransporteStep() {
        spinnerModFrete = findViewById(R.id.spinnerModFrete);
        inputValorFrete = findViewById(R.id.inputValorFrete);
        inputValorSeguro = findViewById(R.id.inputValorSeguro);
        inputOutrasDespesas = findViewById(R.id.inputOutrasDespesas);
        ArrayAdapter<String> mod = new ArrayAdapter<>(
                this,
                android.R.layout.simple_spinner_dropdown_item,
                new String[]{"0 - Emitente", "1 - Destinatário", "2 - Terceiros", "9 - Sem frete"});
        spinnerModFrete.setAdapter(mod);
    }

    private void bindRevisaoStep() {
        revisaoContainer = findViewById(R.id.revisaoContainer);
        checkConfirmarProducao = findViewById(R.id.checkConfirmarProducaoWizard);
        findViewById(R.id.btnSalvarRascunho).setOnClickListener(v -> salvarRascunho());
        findViewById(R.id.btnEmitirNota).setOnClickListener(v -> emitir());
    }

    private void carregarConfigNfe() {
        String idempresa = prefs.getEmpresaId();
        if (idempresa == null) {
            return;
        }
        progress.setVisibility(View.VISIBLE);
        executor.execute(() -> {
            try {
                JsonObject config = api.buscarNfeConfig(idempresa);
                Integer ambiente = config.has("ambiente") ? config.get("ambiente").getAsInt() : null;
                List<SerieDto> listaSeries = api.listarSeries(idempresa, ambiente);
                List<CfopDto> listaCfops = api.listarCfopsSaida(idempresa);
                String ultimaSerie = config.has("ultimaidserie") && !config.get("ultimaidserie").isJsonNull()
                        ? config.get("ultimaidserie").getAsString()
                        : null;
                String ultimaNatOp = config.has("ultimanatop") && !config.get("ultimanatop").isJsonNull()
                        ? config.get("ultimanatop").getAsString()
                        : null;
                String ultimoCfop = config.has("ultimacfopsaida") && !config.get("ultimacfopsaida").isJsonNull()
                        ? config.get("ultimacfopsaida").getAsString()
                        : null;
                runOnUiThread(() -> {
                    progress.setVisibility(View.GONE);
                    if (ambiente != null) {
                        textAmbiente.setText(getString(
                                ambiente == 1 ? R.string.ambiente_producao : R.string.ambiente_homologacao));
                    }
                    series.clear();
                    seriesLabels.clear();
                    series.addAll(listaSeries);
                    for (SerieDto s : listaSeries) {
                        seriesLabels.add(s.numero + (s.ambiente != null && s.ambiente == 1 ? " (Prod)" : " (Hom)"));
                    }
                    spinnerSerie.setAdapter(new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, seriesLabels));
                    if (ultimaSerie != null) {
                        for (int i = 0; i < series.size(); i++) {
                            if (ultimaSerie.equals(series.get(i).id)) {
                                spinnerSerie.setSelection(i);
                                break;
                            }
                        }
                    }

                    cfops.clear();
                    cfopLabels.clear();
                    cfopLabels.add("Selecione…");
                    cfops.addAll(listaCfops);
                    for (CfopDto c : listaCfops) {
                        String cod = c.codigo == null ? "" : c.codigo;
                        String desc = c.descricao == null ? cod : c.descricao;
                        cfopLabels.add(cod + " — " + desc);
                    }
                    spinnerNatureza.setAdapter(new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, cfopLabels));
                    int cfopIdx = 0;
                    if (ultimoCfop != null) {
                        for (int i = 0; i < cfops.size(); i++) {
                            if (ultimoCfop.equals(cfops.get(i).codigo)) {
                                cfopIdx = i + 1;
                                break;
                            }
                        }
                    } else if (!cfops.isEmpty()) {
                        cfopIdx = 1;
                    }
                    if (cfopIdx > 0) {
                        spinnerNatureza.setSelection(cfopIdx);
                        aplicarCfopSelecionado(cfopIdx);
                    } else if (ultimaNatOp != null) {
                        store.setCampo("natOp", ultimaNatOp);
                    }
                });
            } catch (Exception error) {
                runOnUiThread(() -> {
                    progress.setVisibility(View.GONE);
                    Toast.makeText(this, error.getMessage(), Toast.LENGTH_LONG).show();
                });
            }
        });
    }

    private void carregarListasPagamento() {
        String idempresa = prefs.getEmpresaId();
        if (idempresa == null) {
            return;
        }
        executor.execute(() -> {
            try {
                List<TipoDocumentoFinanceiroDto> tipos = api.listarTiposDocumentoFinanceiro(idempresa);
                List<CondicaoPagamentoDto> condicoes = api.listarCondicoesPagamento(idempresa);
                List<PlanoContasDto> planos = api.listarPlanoContasReceita(idempresa);
                runOnUiThread(() -> {
                    tiposDocumento.clear();
                    tiposDocumentoLabels.clear();
                    tiposDocumentoLabels.add("Opcional…");
                    for (TipoDocumentoFinanceiroDto t : tipos) {
                        if (t.inativo != null && t.inativo == 1) {
                            continue;
                        }
                        tiposDocumento.add(t);
                        tiposDocumentoLabels.add(t.descricao == null ? t.id : t.descricao);
                    }
                    spinnerTipoDocumento.setAdapter(new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, tiposDocumentoLabels));

                    condicoesPagamento.clear();
                    condicoesLabels.clear();
                    condicoesLabels.add("Opcional…");
                    for (CondicaoPagamentoDto c : condicoes) {
                        if (c.inativo != null && c.inativo == 1) {
                            continue;
                        }
                        if (c.escopo != null && c.escopo != ESCOPO_COMPRA_E_VENDA && c.escopo != ESCOPO_VENDAS) {
                            continue;
                        }
                        condicoesPagamento.add(c);
                        String cod = c.codigo == null ? "" : c.codigo;
                        String desc = c.descricao == null ? cod : c.descricao;
                        condicoesLabels.add((cod.isEmpty() ? "" : cod + " - ") + desc);
                    }
                    spinnerCondicaoPagamento.setAdapter(new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, condicoesLabels));

                    planosContas.clear();
                    planosLabels.clear();
                    planosLabels.add("Opcional…");
                    for (PlanoContasDto p : planos) {
                        if (p.inativo != null && p.inativo == 1) {
                            continue;
                        }
                        if (p.tipoconta != null && p.tipoconta != TIPO_CONTA_RECEITA) {
                            continue;
                        }
                        planosContas.add(p);
                        String cod = p.codigo == null ? "" : p.codigo;
                        String nome = p.nome == null ? "" : p.nome;
                        planosLabels.add((cod.isEmpty() ? "" : cod + " - ") + nome);
                    }
                    spinnerPlanoContas.setAdapter(new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, planosLabels));
                });
            } catch (Exception error) {
                runOnUiThread(() -> Toast.makeText(this, error.getMessage(), Toast.LENGTH_LONG).show());
            }
        });
    }

    private void aplicarCfopSelecionado(int position) {
        if (position <= 0 || position > cfops.size()) {
            return;
        }
        CfopDto cfop = cfops.get(position - 1);
        if (cfop.codigo != null) {
            store.setDefaultCfop(cfop.codigo);
        }
        String natOp = cfop.descricao != null && !cfop.descricao.isEmpty()
                ? cfop.descricao
                : (cfop.codigo != null ? cfop.codigo : "Venda");
        store.setCampo("natOp", natOp);
    }

    private void salvarContexto() {
        int cfopIdx = spinnerNatureza.getSelectedItemPosition();
        aplicarCfopSelecionado(cfopIdx);
        int serieIdx = spinnerSerie.getSelectedItemPosition();
        if (serieIdx >= 0 && serieIdx < series.size()) {
            store.setCampo("idserienfe", series.get(serieIdx).id);
        }
        store.setCampoInt("indPres", indPresValue(spinnerIndPres.getSelectedItemPosition()));
        store.setCampoInt("idDest", idDestValue(spinnerIdDest.getSelectedItemPosition()));
    }

    private void salvarPagamento() {
        store.setFormaPagamentoCodigo(formaPagamentoCodigo(spinnerPagamento.getSelectedItemPosition()));
        int tipoIdx = spinnerTipoDocumento.getSelectedItemPosition();
        if (tipoIdx > 0 && tipoIdx <= tiposDocumento.size()) {
            store.setCampo("idtipodocumento", tiposDocumento.get(tipoIdx - 1).id);
        } else {
            store.getDados().remove("idtipodocumento");
        }
        int condIdx = spinnerCondicaoPagamento.getSelectedItemPosition();
        if (condIdx > 0 && condIdx <= condicoesPagamento.size()) {
            store.setCampo("idcondicaopagto", condicoesPagamento.get(condIdx - 1).id);
        } else {
            store.getDados().remove("idcondicaopagto");
        }
        int planoIdx = spinnerPlanoContas.getSelectedItemPosition();
        if (planoIdx > 0 && planoIdx <= planosContas.size()) {
            store.setCampo("idplanocontas", planosContas.get(planoIdx - 1).id);
        } else {
            store.getDados().remove("idplanocontas");
        }
    }

    private void salvarTransporte() {
        store.setTransporteModFrete(modFreteValue(spinnerModFrete.getSelectedItemPosition()));
        store.setTotaisNumero("frete", parseNumero(inputValorFrete));
        store.setTotaisNumero("seguro", parseNumero(inputValorSeguro));
        store.setTotaisNumero("outrasDespesas", parseNumero(inputOutrasDespesas));
    }

    private void voltar() {
        int step = flipper.getDisplayedChild();
        if (step <= STEP_CONTEXTO) {
            finish();
            return;
        }
        flipper.showPrevious();
        atualizarStepUi();
    }

    private void avancar() {
        int step = flipper.getDisplayedChild();
        if (step == STEP_CONTEXTO) {
            salvarContexto();
        } else if (step == STEP_ITENS_CONF && store.getItens().size() == 0) {
            Toast.makeText(this, R.string.informe_itens, Toast.LENGTH_SHORT).show();
            return;
        } else if (step == STEP_TRIBUTOS && store.getTotaisFiscais() == null) {
            Toast.makeText(this, R.string.calcule_tributos, Toast.LENGTH_SHORT).show();
            return;
        } else if (step == STEP_PAGAMENTO) {
            salvarPagamento();
        } else if (step == STEP_TRANSPORTE) {
            salvarTransporte();
            montarRevisao();
        } else if (step == STEP_REVISAO) {
            return;
        }
        if (step >= STEP_REVISAO) {
            return;
        }
        flipper.showNext();
        atualizarStepUi();
    }

    private void montarRevisao() {
        revisaoContainer.removeAllViews();
        LayoutInflater inflater = LayoutInflater.from(this);
        addRevisaoSecao(inflater, getString(R.string.revisao_destinatario), formatarDestinatario());
        addRevisaoSecao(inflater, getString(R.string.revisao_itens), formatarItensResumo());
        addRevisaoSecao(inflater, getString(R.string.revisao_totais), formatarTotaisResumo());
        addRevisaoSecao(inflater, getString(R.string.revisao_pagamento), formatarPagamentoResumo());
        addRevisaoSecao(inflater, getString(R.string.revisao_transporte), formatarTransporteResumo());
    }

    private void addRevisaoSecao(LayoutInflater inflater, String titulo, String conteudo) {
        View block = inflater.inflate(R.layout.item_simples, revisaoContainer, false);
        TextView title = block.findViewById(R.id.textTitle);
        TextView subtitle = block.findViewById(R.id.textSubtitle);
        title.setText(titulo);
        subtitle.setText(conteudo);
        ViewGroup.MarginLayoutParams lp = (ViewGroup.MarginLayoutParams) block.getLayoutParams();
        if (lp == null) {
            lp = new ViewGroup.MarginLayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        }
        lp.bottomMargin = (int) (8 * getResources().getDisplayMetrics().density);
        block.setLayoutParams(lp);
        revisaoContainer.addView(block);
    }

    private String formatarDestinatario() {
        if (store.getDestinatarioNome() == null) {
            return getString(R.string.nao_informado);
        }
        String doc = store.getDestinatarioDoc() == null ? "" : store.getDestinatarioDoc();
        return store.getDestinatarioNome() + (doc.isEmpty() ? "" : "\n" + doc);
    }

    private String formatarItensResumo() {
        JsonArray itens = store.getItens();
        if (itens.size() == 0) {
            return getString(R.string.sem_itens);
        }
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < itens.size(); i++) {
            JsonObject item = itens.get(i).getAsJsonObject();
            String desc = item.has("descricao") ? item.get("descricao").getAsString() : "Item";
            double qtd = item.has("quantidade") ? item.get("quantidade").getAsDouble() : 0;
            double unit = item.has("valorUnitario") ? item.get("valorUnitario").getAsDouble() : 0;
            if (sb.length() > 0) {
                sb.append("\n");
            }
            sb.append(desc).append(" — ").append(qtd).append(" × ").append(moeda.format(unit));
        }
        return sb.toString();
    }

    private String formatarTotaisResumo() {
        JsonObject totais = store.getTotaisFiscais();
        if (totais == null) {
            return getString(R.string.nao_informado);
        }
        double total = totais.has("totalNota") ? totais.get("totalNota").getAsDouble() : 0;
        return getString(R.string.total_nota) + ": " + moeda.format(total);
    }

    private String formatarPagamentoResumo() {
        int idx = spinnerPagamento.getSelectedItemPosition();
        String forma = idx >= 0 && idx < spinnerPagamento.getCount()
                ? spinnerPagamento.getSelectedItem().toString()
                : store.getFormaPagamentoCodigo();
        StringBuilder sb = new StringBuilder(forma);
        int tipoIdx = spinnerTipoDocumento.getSelectedItemPosition();
        if (tipoIdx > 0 && tipoIdx <= tiposDocumento.size()) {
            sb.append("\nERP: ").append(tiposDocumentoLabels.get(tipoIdx));
        }
        int condIdx = spinnerCondicaoPagamento.getSelectedItemPosition();
        if (condIdx > 0 && condIdx <= condicoesLabels.size() - 1) {
            sb.append("\n").append(getString(R.string.condicao_pagamento)).append(": ").append(condicoesLabels.get(condIdx));
        }
        int planoIdx = spinnerPlanoContas.getSelectedItemPosition();
        if (planoIdx > 0 && planoIdx <= planosLabels.size() - 1) {
            sb.append("\n").append(getString(R.string.plano_contas)).append(": ").append(planosLabels.get(planoIdx));
        }
        return sb.toString();
    }

    private String formatarTransporteResumo() {
        int idx = spinnerModFrete.getSelectedItemPosition();
        String mod = idx >= 0 ? spinnerModFrete.getSelectedItem().toString() : "";
        double frete = parseNumero(inputValorFrete);
        return mod + "\nFrete: " + moeda.format(frete);
    }

    private void buscarClientes(String q) {
        String idempresa = prefs.getEmpresaId();
        if (idempresa == null) {
            return;
        }
        progress.setVisibility(View.VISIBLE);
        executor.execute(() -> {
            try {
                ApiClient.Pagina<EntidadeDto> pagina = api.listarClientes(idempresa, 1, 50, q.isEmpty() ? null : q);
                runOnUiThread(() -> {
                    progress.setVisibility(View.GONE);
                    clientesApi.clear();
                    clientesApi.addAll(pagina.data);
                    clienteAdapter.setItems(clientesApi);
                });
            } catch (Exception error) {
                runOnUiThread(() -> {
                    progress.setVisibility(View.GONE);
                    Toast.makeText(this, error.getMessage(), Toast.LENGTH_LONG).show();
                });
            }
        });
    }

    private void buscarProdutos(String q) {
        String idempresa = prefs.getEmpresaId();
        if (idempresa == null) {
            return;
        }
        progress.setVisibility(View.VISIBLE);
        executor.execute(() -> {
            try {
                ApiClient.Pagina<ProdutoDto> pagina = api.listarProdutos(idempresa, 1, 30, q.isEmpty() ? null : q);
                runOnUiThread(() -> {
                    progress.setVisibility(View.GONE);
                    produtoAdapter.setItems(pagina.data);
                });
            } catch (Exception error) {
                runOnUiThread(() -> {
                    progress.setVisibility(View.GONE);
                    Toast.makeText(this, error.getMessage(), Toast.LENGTH_LONG).show();
                });
            }
        });
    }

    private void mostrarDialogAdicionarItem(ProdutoDto produto) {
        View dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_item_quantidade, null);
        TextView titulo = dialogView.findViewById(R.id.textProdutoDialog);
        TextInputEditText inputQtd = dialogView.findViewById(R.id.inputQuantidade);
        TextInputEditText inputValor = dialogView.findViewById(R.id.inputValorUnitario);
        titulo.setText(produto.nome);
        inputQtd.setText("1");
        double preco = 0.01;
        if (produto.preco != null) {
            try {
                preco = Double.parseDouble(produto.preco.replace(",", "."));
                if (preco <= 0) {
                    preco = 0.01;
                }
            } catch (Exception ignored) {
                preco = 0.01;
            }
        }
        inputValor.setText(String.format(Locale.US, "%.2f", preco));

        new MaterialAlertDialogBuilder(this)
                .setTitle(R.string.adicionar_item)
                .setView(dialogView)
                .setNegativeButton(R.string.cancelar, null)
                .setPositiveButton(R.string.confirmar, (d, w) -> {
                    double qtd = parseNumero(inputQtd);
                    double unit = parseNumero(inputValor);
                    if (qtd <= 0 || unit <= 0) {
                        Toast.makeText(this, R.string.informe_itens, Toast.LENGTH_SHORT).show();
                        return;
                    }
                    store.addItemFromProduto(produto, qtd, unit);
                    Toast.makeText(this, R.string.salvo, Toast.LENGTH_SHORT).show();
                })
                .show();
    }

    private void calcularTributos() {
        if (tributosCalculando) {
            return;
        }
        String idempresa = prefs.getEmpresaId();
        JsonObject params = new JsonObject();
        params.addProperty("idempresa", idempresa);
        params.add("itens", store.getItens());
        if (store.getDados().has("totais")) {
            params.add("totais", store.getDados().get("totais"));
        }
        tributosCalculando = true;
        textTributosStatus.setText(R.string.calculando_tributos);
        progress.setVisibility(View.VISIBLE);
        executor.execute(() -> {
            try {
                JsonObject res = api.calcularTributos(params);
                int crt = res.has("crt") ? res.get("crt").getAsInt() : 0;
                JsonArray itens = res.getAsJsonArray("itens");
                JsonObject totais = res.getAsJsonObject("totaisFiscais");
                store.setTributos(crt, itens, totais);
                runOnUiThread(() -> {
                    tributosCalculando = false;
                    progress.setVisibility(View.GONE);
                    exibirTributos(crt, itens, totais);
                });
            } catch (Exception error) {
                runOnUiThread(() -> {
                    tributosCalculando = false;
                    progress.setVisibility(View.GONE);
                    textTributosStatus.setText(error.getMessage());
                    Toast.makeText(this, error.getMessage(), Toast.LENGTH_LONG).show();
                });
            }
        });
    }

    private void exibirTributos(int crt, JsonArray itens, JsonObject totais) {
        textTributosStatus.setText("CRT " + crt);
        tributoItemAdapter.setItems(itens);
        gridTotaisFiscais.removeAllViews();
        if (totais != null) {
            adicionarCelulaTotal("BC ICMS", totais, "baseIcms");
            adicionarCelulaTotal("ICMS", totais, "valorIcms");
            adicionarCelulaTotal("PIS", totais, "valorPis");
            adicionarCelulaTotal("COFINS", totais, "valorCofins");
            adicionarCelulaTotal("Produtos", totais, "totalProdutos");
            adicionarCelulaTotal("Frete", totais, "frete");
            double totalNota = totais.has("totalNota") ? totais.get("totalNota").getAsDouble() : 0;
            textTotalNota.setText(getString(R.string.total_nota) + ": " + moeda.format(totalNota));
        } else {
            textTotalNota.setText("");
        }
    }

    private void adicionarCelulaTotal(String label, JsonObject totais, String key) {
        if (!totais.has(key)) {
            return;
        }
        TextView cell = new TextView(this);
        double valor = totais.get(key).getAsDouble();
        cell.setText(label + "\n" + moeda.format(valor));
        cell.setPadding(8, 8, 8, 8);
        GridLayout.LayoutParams lp = new GridLayout.LayoutParams();
        lp.width = 0;
        lp.columnSpec = GridLayout.spec(GridLayout.UNDEFINED, 1f);
        lp.setMargins(4, 4, 4, 4);
        cell.setLayoutParams(lp);
        cell.setBackgroundResource(R.drawable.bg_card_item);
        gridTotaisFiscais.addView(cell);
    }

    private void salvarRascunho() {
        store.setCampoBool("confirmarProducao", checkConfirmarProducao.isChecked());
        JsonObject payload = EmissaoPayloadBuilder.build(store, checkConfirmarProducao.isChecked());
        progress.setVisibility(View.VISIBLE);
        executor.execute(() -> {
            try {
                JsonObject res = api.salvarRascunho(payload);
                runOnUiThread(() -> {
                    progress.setVisibility(View.GONE);
                    Toast.makeText(this, getString(R.string.rascunho_salvo, res.get("idnotafiscal").getAsString()), Toast.LENGTH_LONG).show();
                    finish();
                });
            } catch (Exception error) {
                runOnUiThread(() -> {
                    progress.setVisibility(View.GONE);
                    Toast.makeText(this, error.getMessage(), Toast.LENGTH_LONG).show();
                });
            }
        });
    }

    private void emitir() {
        store.setCampoBool("confirmarProducao", checkConfirmarProducao.isChecked());
        JsonObject payload = EmissaoPayloadBuilder.build(store, checkConfirmarProducao.isChecked());
        progress.setVisibility(View.VISIBLE);
        executor.execute(() -> {
            try {
                JsonObject res = api.emitir(payload);
                String id = res.has("idnotafiscal") ? res.get("idnotafiscal").getAsString() : null;
                runOnUiThread(() -> {
                    progress.setVisibility(View.GONE);
                    if (id != null) {
                        Intent intent = new Intent(this, NfeDetailActivity.class);
                        intent.putExtra(NfeDetailActivity.EXTRA_NOTA_ID, id);
                        startActivity(intent);
                    }
                    finish();
                });
            } catch (Exception error) {
                runOnUiThread(() -> {
                    progress.setVisibility(View.GONE);
                    Toast.makeText(this, error.getMessage(), Toast.LENGTH_LONG).show();
                });
            }
        });
    }

    @Override
    protected int getBottomBarId() {
        return R.id.wizardBottomBar;
    }

    private void atualizarStepUi() {
        int step = flipper.getDisplayedChild();
        textStep.setText(getString(R.string.wizard_step, step + 1, TOTAL_STEPS));
        if (step >= 0 && step < STEP_TITLE_IDS.length) {
            textStepTitle.setText(STEP_TITLE_IDS[step]);
        }
        wizardProgress.setMax(TOTAL_STEPS);
        wizardProgress.setProgressCompat(step + 1, true);
        MaterialButton btnAvancar = findViewById(R.id.btnWizardAvancar);
        btnAvancar.setText(step == STEP_REVISAO ? R.string.concluir : R.string.avancar);

        if (step == STEP_DESTINATARIO) {
            atualizarDestinatarioUi();
        }
        if (step == STEP_ITENS_CONF) {
            atualizarListaItensUi();
        }
        if (step == STEP_TRIBUTOS) {
            calcularTributos();
        }
        if (step == STEP_REVISAO) {
            montarRevisao();
        }
    }

    private void atualizarDestinatarioUi() {
        if (store.getDestinatarioNome() != null) {
            textDestinatarioSelecionado.setVisibility(View.VISIBLE);
            String doc = store.getDestinatarioDoc() == null ? "" : store.getDestinatarioDoc();
            textDestinatarioSelecionado.setText(
                    getString(R.string.destinatario_selecionado, store.getDestinatarioNome())
                            + (doc.isEmpty() ? "" : "\n" + doc));
        } else {
            textDestinatarioSelecionado.setVisibility(View.GONE);
        }
    }

    private void atualizarListaItensUi() {
        JsonArray itens = store.getItens();
        textSemItens.setVisibility(itens.size() == 0 ? View.VISIBLE : View.GONE);
        listItens.setVisibility(itens.size() == 0 ? View.GONE : View.VISIBLE);
        itemAdapter.setItems(itens);
    }

    private void selecionarFormaPagamentoCodigo(String codigo) {
        String[] map = {"01", "03", "04", "15", "17", "90"};
        for (int i = 0; i < map.length; i++) {
            if (map[i].equals(codigo)) {
                spinnerPagamento.setSelection(i);
                return;
            }
        }
    }

    private void selecionarPlanoContas(String id) {
        for (int i = 0; i < planosContas.size(); i++) {
            if (id.equals(planosContas.get(i).id)) {
                spinnerPlanoContas.setSelection(i + 1);
                return;
            }
        }
    }

    private static int indPresValue(int index) {
        if (index == 1) {
            return 2;
        }
        if (index == 2) {
            return 9;
        }
        return 1;
    }

    private static int idDestValue(int index) {
        if (index == 1) {
            return 2;
        }
        if (index == 2) {
            return 3;
        }
        return 1;
    }

    private static String formaPagamentoCodigo(int index) {
        switch (index) {
            case 1:
                return "03";
            case 2:
                return "04";
            case 3:
                return "15";
            case 4:
                return "17";
            case 5:
                return "90";
            default:
                return "01";
        }
    }

    private static int modFreteValue(int index) {
        if (index == 1) {
            return 1;
        }
        if (index == 2) {
            return 2;
        }
        if (index == 3) {
            return 9;
        }
        return 0;
    }

    private static double parseNumero(TextInputEditText edit) {
        if (edit.getText() == null) {
            return 0;
        }
        String raw = edit.getText().toString().trim().replace(",", ".");
        if (raw.isEmpty()) {
            return 0;
        }
        try {
            return Double.parseDouble(raw);
        } catch (Exception e) {
            return 0;
        }
    }

    private static String text(TextInputEditText edit) {
        return edit.getText() == null ? "" : edit.getText().toString().trim();
    }

    @Override
    protected void onDestroy() {
        debounceHandler.removeCallbacksAndMessages(null);
        executor.shutdownNow();
        super.onDestroy();
    }

    private abstract static class SimpleTextWatcher implements TextWatcher {
        @Override
        public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

        @Override
        public void onTextChanged(CharSequence s, int start, int before, int count) {}
    }

    private abstract static class SimpleSpinnerListener implements android.widget.AdapterView.OnItemSelectedListener {
        @Override
        public void onItemSelected(android.widget.AdapterView<?> parent, View view, int position, long id) {
            onItemSelected(position);
        }

        public abstract void onItemSelected(int position);

        @Override
        public void onNothingSelected(android.widget.AdapterView<?> parent) {}
    }

    static final class ClientePickAdapter extends RecyclerView.Adapter<SimpleViewHolder> {
        interface OnPick {
            void onPick(EntidadeDto cliente);
        }

        private final OnPick onPick;
        private final List<EntidadeDto> items = new ArrayList<>();
        private final List<EntidadeDto> filtered = new ArrayList<>();
        private String filtro = "";

        ClientePickAdapter(OnPick onPick) {
            this.onPick = onPick;
        }

        void setItems(List<EntidadeDto> clientes) {
            items.clear();
            if (clientes != null) {
                items.addAll(clientes);
            }
            aplicarFiltro();
        }

        void setFiltro(String filtro) {
            this.filtro = filtro == null ? "" : filtro.toLowerCase(Locale.ROOT);
            aplicarFiltro();
        }

        private void aplicarFiltro() {
            filtered.clear();
            for (EntidadeDto c : items) {
                if (filtro.isEmpty() || matches(c, filtro)) {
                    filtered.add(c);
                }
            }
            notifyDataSetChanged();
        }

        private static boolean matches(EntidadeDto c, String filtro) {
            String nome = c.nome == null ? "" : c.nome.toLowerCase(Locale.ROOT);
            String doc = c.cnpjcpf == null ? "" : c.cnpjcpf.toLowerCase(Locale.ROOT);
            return nome.contains(filtro) || doc.contains(filtro);
        }

        @Override
        public SimpleViewHolder onCreateViewHolder(android.view.ViewGroup parent, int viewType) {
            android.view.View view = LayoutInflater.from(parent.getContext())
                    .inflate(R.layout.item_simples, parent, false);
            return new SimpleViewHolder(view);
        }

        @Override
        public void onBindViewHolder(SimpleViewHolder holder, int position) {
            EntidadeDto c = filtered.get(position);
            holder.title.setText(c.nome);
            holder.subtitle.setText(c.cnpjcpf);
            holder.itemView.setOnClickListener(v -> onPick.onPick(c));
        }

        @Override
        public int getItemCount() {
            return filtered.size();
        }
    }

    static final class ProdutoPickAdapter extends RecyclerView.Adapter<SimpleViewHolder> {
        interface OnPick {
            void onPick(ProdutoDto produto);
        }

        private final OnPick onPick;
        private final List<ProdutoDto> items = new ArrayList<>();

        ProdutoPickAdapter(OnPick onPick) {
            this.onPick = onPick;
        }

        void setItems(List<ProdutoDto> produtos) {
            items.clear();
            if (produtos != null) {
                items.addAll(produtos);
            }
            notifyDataSetChanged();
        }

        @Override
        public SimpleViewHolder onCreateViewHolder(android.view.ViewGroup parent, int viewType) {
            android.view.View view = LayoutInflater.from(parent.getContext())
                    .inflate(R.layout.item_simples, parent, false);
            return new SimpleViewHolder(view);
        }

        @Override
        public void onBindViewHolder(SimpleViewHolder holder, int position) {
            ProdutoDto p = items.get(position);
            holder.title.setText(p.nome);
            holder.subtitle.setText(p.preco == null ? "" : p.preco);
            holder.itemView.setOnClickListener(v -> onPick.onPick(p));
        }

        @Override
        public int getItemCount() {
            return items.size();
        }
    }

    static final class ItemAdapter extends RecyclerView.Adapter<ItemViewHolder> {
        interface OnRemove {
            void onRemove(int index);
        }

        private final OnRemove onRemove;
        private JsonArray items = new JsonArray();
        private final NumberFormat moeda = NumberFormat.getCurrencyInstance(new Locale("pt", "BR"));

        ItemAdapter(OnRemove onRemove) {
            this.onRemove = onRemove;
        }

        void setItems(JsonArray itens) {
            items = itens == null ? new JsonArray() : itens;
            notifyDataSetChanged();
        }

        @Override
        public ItemViewHolder onCreateViewHolder(android.view.ViewGroup parent, int viewType) {
            android.view.View view = LayoutInflater.from(parent.getContext())
                    .inflate(R.layout.item_emissao_item, parent, false);
            return new ItemViewHolder(view);
        }

        @Override
        public void onBindViewHolder(ItemViewHolder holder, int position) {
            JsonObject item = items.get(position).getAsJsonObject();
            holder.title.setText(item.has("descricao") ? item.get("descricao").getAsString() : "Item");
            double qtd = item.has("quantidade") ? item.get("quantidade").getAsDouble() : 0;
            double unit = item.has("valorUnitario") ? item.get("valorUnitario").getAsDouble() : 0;
            holder.subtitle.setText(
                    "Qtd " + qtd + " × " + moeda.format(unit) + " = " + moeda.format(qtd * unit));
            holder.btnRemover.setOnClickListener(v -> onRemove.onRemove(position));
        }

        @Override
        public int getItemCount() {
            return items.size();
        }
    }

    static final class TributoItemAdapter extends RecyclerView.Adapter<TributoViewHolder> {
        private JsonArray items = new JsonArray();
        private final NumberFormat moeda = NumberFormat.getCurrencyInstance(new Locale("pt", "BR"));

        void setItems(JsonArray itens) {
            items = itens == null ? new JsonArray() : itens;
            notifyDataSetChanged();
        }

        @Override
        public TributoViewHolder onCreateViewHolder(android.view.ViewGroup parent, int viewType) {
            android.view.View view = LayoutInflater.from(parent.getContext())
                    .inflate(R.layout.item_tributo_card, parent, false);
            return new TributoViewHolder(view);
        }

        @Override
        public void onBindViewHolder(TributoViewHolder holder, int position) {
            JsonObject item = items.get(position).getAsJsonObject();
            holder.nome.setText(item.has("descricao") ? item.get("descricao").getAsString() : "Item");
            String cst = item.has("csosn") ? "CSOSN " + item.get("csosn").getAsString()
                    : (item.has("cst") ? "CST " + item.get("cst").getAsString() : "");
            StringBuilder linhas = new StringBuilder(cst);
            appendLinha(linhas, "BC ICMS", item, "baseIcms", moeda);
            appendLinha(linhas, "ICMS", item, "valorIcms", moeda);
            appendLinha(linhas, "PIS", item, "valorPis", moeda);
            appendLinha(linhas, "COFINS", item, "valorCofins", moeda);
            holder.detalhes.setText(linhas.toString().trim());
        }

        private static void appendLinha(StringBuilder sb, String label, JsonObject item, String key, NumberFormat moeda) {
            if (!item.has(key)) {
                return;
            }
            if (sb.length() > 0) {
                sb.append("\n");
            }
            sb.append(label).append(": ").append(moeda.format(item.get(key).getAsDouble()));
        }

        @Override
        public int getItemCount() {
            return items.size();
        }
    }

    static class SimpleViewHolder extends RecyclerView.ViewHolder {
        final TextView title;
        final TextView subtitle;

        SimpleViewHolder(android.view.View itemView) {
            super(itemView);
            title = itemView.findViewById(R.id.textTitle);
            subtitle = itemView.findViewById(R.id.textSubtitle);
        }
    }

    static class ItemViewHolder extends RecyclerView.ViewHolder {
        final TextView title;
        final TextView subtitle;
        final MaterialButton btnRemover;

        ItemViewHolder(android.view.View itemView) {
            super(itemView);
            title = itemView.findViewById(R.id.textTitle);
            subtitle = itemView.findViewById(R.id.textSubtitle);
            btnRemover = itemView.findViewById(R.id.btnRemoverItem);
        }
    }

    static class TributoViewHolder extends RecyclerView.ViewHolder {
        final TextView nome;
        final TextView detalhes;

        TributoViewHolder(android.view.View itemView) {
            super(itemView);
            nome = itemView.findViewById(R.id.textItemNome);
            detalhes = itemView.findViewById(R.id.textItemTributos);
        }
    }
}
