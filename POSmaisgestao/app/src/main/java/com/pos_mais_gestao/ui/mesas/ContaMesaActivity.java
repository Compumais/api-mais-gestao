package com.pos_mais_gestao.ui.mesas;

import android.content.Intent;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.View;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;
import androidx.activity.result.ActivityResultLauncher;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.GridLayoutManager;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.google.android.material.appbar.MaterialToolbar;
import com.google.android.material.button.MaterialButton;
import com.google.android.material.textfield.TextInputEditText;
import com.journeyapps.barcodescanner.ScanOptions;
import com.pos_mais_gestao.PosApplication;
import com.pos_mais_gestao.R;
import com.pos_mais_gestao.data.api.ApiClient;
import com.pos_mais_gestao.data.api.ApiException;
import com.pos_mais_gestao.data.api.ContaMesaItemDto;
import com.pos_mais_gestao.data.local.PrefsStore;
import com.pos_mais_gestao.domain.Produto;
import com.pos_mais_gestao.ui.pagamento.PagamentoActivity;
import com.pos_mais_gestao.ui.venda.ProdutoAdapter;
import com.pos_mais_gestao.util.CodigoScanHelper;
import com.pos_mais_gestao.util.MoneyFormat;
import com.pos_mais_gestao.util.ProdutoBuscaHelper;
import java.math.BigDecimal;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class ContaMesaActivity extends AppCompatActivity {
    public static final String EXTRA_ID_CONTA = "id_conta";
    public static final String EXTRA_NUMERO_MESA = "numero_mesa";

    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private PrefsStore prefs;
    private ApiClient api;
    private String idConta;
    private int numeroMesa;
    private ProdutoAdapter produtoAdapter;
    private ContaItemAdapter itemAdapter;
    private ProdutoBuscaHelper buscaHelper;
    private CodigoScanHelper scanHelper;
    private ProgressBar progress;
    private TextView lblSecao;
    private TextView txtTotalConta;
    private TextInputEditText inputBusca;
    private MaterialButton btnFecharConta;
    private BigDecimal totalAtual = BigDecimal.ZERO;
    private int quantidadeSelecionada = 1;

    private final ActivityResultLauncher<ScanOptions> scanLauncher =
            CodigoScanHelper.registrarScan(this, this::aoCodigoEscaneado);
    private final ActivityResultLauncher<String> cameraPermissionLauncher =
            CodigoScanHelper.registrarPermissao(this, () -> {
                if (scanHelper != null) {
                    scanHelper.abrirCamera();
                }
            });

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_conta_mesa);

        PosApplication app = (PosApplication) getApplication();
        prefs = app.getPrefsStore();
        api = app.getApiClient();
        scanHelper = new CodigoScanHelper(this, scanLauncher, cameraPermissionLauncher, this::aoCodigoEscaneado);

        idConta = getIntent().getStringExtra(EXTRA_ID_CONTA);
        numeroMesa = getIntent().getIntExtra(EXTRA_NUMERO_MESA, 0);
        if (idConta == null) {
            finish();
            return;
        }

        MaterialToolbar toolbar = findViewById(R.id.toolbarConta);
        setSupportActionBar(toolbar);
        toolbar.setTitle(getString(R.string.mesa_n, numeroMesa));
        toolbar.setNavigationOnClickListener(v -> finish());

        progress = findViewById(R.id.progressConta);
        lblSecao = findViewById(R.id.lblSecaoConta);
        txtTotalConta = findViewById(R.id.txtTotalConta);
        btnFecharConta = findViewById(R.id.btnFecharConta);
        btnFecharConta.setOnClickListener(v -> irParaPagamento());
        inputBusca = findViewById(R.id.inputBuscaConta);
        MaterialButton btnEscanear = findViewById(R.id.btnEscanearConta);
        btnEscanear.setOnClickListener(v -> scanHelper.iniciar());
        MaterialButton btnQty1 = findViewById(R.id.btnQty1);
        MaterialButton btnQty2 = findViewById(R.id.btnQty2);
        MaterialButton btnQty5 = findViewById(R.id.btnQty5);

        btnQty1.setOnClickListener(v -> selecionarQty(1, btnQty1, btnQty2, btnQty5));
        btnQty2.setOnClickListener(v -> selecionarQty(2, btnQty1, btnQty2, btnQty5));
        btnQty5.setOnClickListener(v -> selecionarQty(5, btnQty1, btnQty2, btnQty5));
        selecionarQty(1, btnQty1, btnQty2, btnQty5);

        produtoAdapter = new ProdutoAdapter(this::lancarProduto);
        RecyclerView listaProdutos = findViewById(R.id.listaProdutosConta);
        listaProdutos.setLayoutManager(new GridLayoutManager(this, 2));
        listaProdutos.setAdapter(produtoAdapter);

        itemAdapter = new ContaItemAdapter(this::removerItem);
        RecyclerView listaItens = findViewById(R.id.listaItensConta);
        listaItens.setLayoutManager(new LinearLayoutManager(this));
        listaItens.setAdapter(itemAdapter);

        buscaHelper = new ProdutoBuscaHelper(api, executor, prefs::getAtalhos, new ProdutoBuscaHelper.Listener() {
            @Override
            public void onAtalhos(List<Produto> atalhos) {
                lblSecao.setText(R.string.atalhos);
                listaProdutos.setLayoutManager(new GridLayoutManager(ContaMesaActivity.this, 2));
                produtoAdapter.setItens(atalhos);
            }

            @Override
            public void onResultados(List<Produto> produtos, boolean temMais, boolean append) {
                lblSecao.setText(R.string.resultados);
                listaProdutos.setLayoutManager(new LinearLayoutManager(ContaMesaActivity.this));
                produtoAdapter.setItens(produtos);
            }

            @Override
            public void onErro(String mensagem) {
                Toast.makeText(ContaMesaActivity.this, mensagem, Toast.LENGTH_LONG).show();
            }
        });

        inputBusca.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                buscaHelper.onTextoAlterado(s == null ? "" : s.toString());
            }

            @Override
            public void afterTextChanged(Editable s) {}
        });

        buscaHelper.mostrarAtalhos();
        carregarItens();
    }

    private void aoCodigoEscaneado(String codigo) {
        inputBusca.setText(codigo);
        inputBusca.setSelection(codigo.length());
        executor.execute(() -> {
            try {
                List<Produto> produtos = api.buscarProdutos(codigo);
                runOnUiThread(() -> {
                    if (produtos == null || produtos.isEmpty()) {
                        Toast.makeText(this, R.string.produto_nao_encontrado_scan, Toast.LENGTH_LONG).show();
                        buscaHelper.onTextoAlterado(codigo);
                        return;
                    }
                    if (produtos.size() == 1) {
                        lancarProduto(produtos.get(0));
                        inputBusca.setText("");
                        buscaHelper.mostrarAtalhos();
                    } else {
                        buscaHelper.onTextoAlterado(codigo);
                    }
                });
            } catch (ApiException e) {
                runOnUiThread(() -> Toast.makeText(this, e.getMessage(), Toast.LENGTH_LONG).show());
            }
        });
    }

    private void selecionarQty(int qty, MaterialButton... botoes) {
        quantidadeSelecionada = qty;
        for (MaterialButton botao : botoes) {
            boolean ativo = (botao.getId() == R.id.btnQty1 && qty == 1)
                    || (botao.getId() == R.id.btnQty2 && qty == 2)
                    || (botao.getId() == R.id.btnQty5 && qty == 5);
            botao.setAlpha(ativo ? 1f : 0.55f);
        }
    }

    private void lancarProduto(Produto produto) {
        progress.setVisibility(View.VISIBLE);
        String qty = String.valueOf(quantidadeSelecionada);
        executor.execute(() -> {
            try {
                api.adicionarItemMesa(idConta, produto, qty);
                List<ContaMesaItemDto> itens = api.listarItensMesa(idConta);
                runOnUiThread(() -> {
                    progress.setVisibility(View.GONE);
                    itemAdapter.setItens(itens);
                    atualizarTotal(itens);
                });
            } catch (ApiException e) {
                runOnUiThread(() -> {
                    progress.setVisibility(View.GONE);
                    Toast.makeText(this, e.getMessage(), Toast.LENGTH_LONG).show();
                });
            }
        });
    }

    private void carregarItens() {
        progress.setVisibility(View.VISIBLE);
        executor.execute(() -> {
            try {
                List<ContaMesaItemDto> itens = api.listarItensMesa(idConta);
                runOnUiThread(() -> {
                    progress.setVisibility(View.GONE);
                    itemAdapter.setItens(itens);
                    atualizarTotal(itens);
                });
            } catch (ApiException e) {
                runOnUiThread(() -> {
                    progress.setVisibility(View.GONE);
                    Toast.makeText(this, e.getMessage(), Toast.LENGTH_LONG).show();
                });
            }
        });
    }

    private void atualizarTotal(List<ContaMesaItemDto> itens) {
        BigDecimal total = BigDecimal.ZERO;
        if (itens != null) {
            for (ContaMesaItemDto item : itens) {
                try {
                    BigDecimal q = new BigDecimal(item.quantidade != null ? item.quantidade : "0");
                    BigDecimal p = new BigDecimal(item.precounitario != null ? item.precounitario : "0");
                    total = total.add(q.multiply(p));
                } catch (Exception ignored) {
                }
            }
        }
        totalAtual = total;
        txtTotalConta.setText(getString(R.string.total, MoneyFormat.format(total)));
        btnFecharConta.setEnabled(total.compareTo(BigDecimal.ZERO) > 0);
    }

    private void irParaPagamento() {
        if (totalAtual.compareTo(BigDecimal.ZERO) <= 0) {
            Toast.makeText(this, R.string.comanda_vazia, Toast.LENGTH_SHORT).show();
            return;
        }
        Intent intent = new Intent(this, PagamentoActivity.class);
        intent.putExtra(PagamentoActivity.EXTRA_MODO_MESA, true);
        intent.putExtra(PagamentoActivity.EXTRA_ID_CONTA, idConta);
        intent.putExtra(PagamentoActivity.EXTRA_NUMERO_MESA, numeroMesa);
        intent.putExtra(PagamentoActivity.EXTRA_TOTAL_MESA, totalAtual.toPlainString());
        startActivity(intent);
    }

    private void removerItem(ContaMesaItemDto item) {
        progress.setVisibility(View.VISIBLE);
        executor.execute(() -> {
            try {
                api.removerItemMesa(item.id);
                List<ContaMesaItemDto> itens = api.listarItensMesa(idConta);
                runOnUiThread(() -> {
                    progress.setVisibility(View.GONE);
                    itemAdapter.setItens(itens);
                    atualizarTotal(itens);
                });
            } catch (ApiException e) {
                runOnUiThread(() -> {
                    progress.setVisibility(View.GONE);
                    Toast.makeText(this, e.getMessage(), Toast.LENGTH_LONG).show();
                });
            }
        });
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        executor.shutdownNow();
        if (buscaHelper != null) {
            buscaHelper.limparCallbacks();
        }
    }
}
