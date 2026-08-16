package com.pos_mais_gestao.ui.mesas;

import android.content.Intent;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.LayoutInflater;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;
import androidx.activity.result.ActivityResultLauncher;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AlertDialog;
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
import com.pos_mais_gestao.util.PizzaMeioAMeio;
import com.pos_mais_gestao.util.ProdutoBuscaHelper;
import com.pos_mais_gestao.util.SoftInputHelper;
import java.math.BigDecimal;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class ContaMesaActivity extends AppCompatActivity {
    public static final String EXTRA_ID_CONTA = "id_conta";
    public static final String EXTRA_NUMERO_MESA = "numero_mesa";
    public static final String EXTRA_ID_CLIENTE = "id_cliente";
    public static final String EXTRA_NOME_CLIENTE = "nome_cliente";

    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private PrefsStore prefs;
    private ApiClient api;
    private String idConta;
    private String idCliente;
    private String nomeCliente;
    private int numeroMesa;
    private MaterialToolbar toolbar;
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
        SoftInputHelper.hideOnStart(this);

        PosApplication app = (PosApplication) getApplication();
        prefs = app.getPrefsStore();
        api = app.getApiClient();
        scanHelper = new CodigoScanHelper(this, scanLauncher, cameraPermissionLauncher, this::aoCodigoEscaneado);

        idConta = getIntent().getStringExtra(EXTRA_ID_CONTA);
        idCliente = getIntent().getStringExtra(EXTRA_ID_CLIENTE);
        nomeCliente = getIntent().getStringExtra(EXTRA_NOME_CLIENTE);
        numeroMesa = getIntent().getIntExtra(EXTRA_NUMERO_MESA, 0);
        if (idConta == null) {
            finish();
            return;
        }

        toolbar = findViewById(R.id.toolbarConta);
        setSupportActionBar(toolbar);
        toolbar.setNavigationOnClickListener(v -> finish());
        atualizarTituloMesa();

        progress = findViewById(R.id.progressConta);
        lblSecao = findViewById(R.id.lblSecaoConta);
        txtTotalConta = findViewById(R.id.txtTotalConta);
        btnFecharConta = findViewById(R.id.btnFecharConta);
        if (prefs.isModoPdvLocal()) {
            btnFecharConta.setVisibility(View.GONE);
        }
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

    @Override
    protected void onResume() {
        super.onResume();
        SoftInputHelper.hideOnStart(this);
    }

    private void aoCodigoEscaneado(String codigo) {
        SoftInputHelper.hideKeyboard(this);
        inputBusca.setText(codigo);
        SoftInputHelper.hideKeyboard(this);
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
                        SoftInputHelper.hideKeyboard(this);
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
        if (produto.isEspizza()) {
            dialogPizza(produto);
            return;
        }
        lancarProdutoNaConta(produto);
    }

    private void dialogPizza(Produto primeiro) {
        new AlertDialog.Builder(this)
                .setTitle(R.string.pizza_meio_a_meio)
                .setMessage(getString(R.string.pizza_meio_a_meio_ajuda, primeiro.getDescricao()))
                .setNeutralButton(android.R.string.cancel, null)
                .setNegativeButton(R.string.pizza_inteira, (d, w) -> lancarProdutoNaConta(primeiro))
                .setPositiveButton(R.string.escolher_segundo_sabor, (d, w) -> dialogSegundoSabor(primeiro))
                .show();
    }

    private void dialogSegundoSabor(Produto primeiro) {
        executor.execute(() -> {
            try {
                List<Produto> pizzas = api.listarPizzas(primeiro.getId());
                runOnUiThread(() -> {
                    if (pizzas.isEmpty()) {
                        Toast.makeText(this, R.string.sem_outras_pizzas, Toast.LENGTH_LONG).show();
                        lancarProdutoNaConta(primeiro);
                        return;
                    }
                    CharSequence[] nomes = new CharSequence[pizzas.size()];
                    for (int i = 0; i < pizzas.size(); i++) {
                        Produto p = pizzas.get(i);
                        nomes[i] = p.getDescricao() + "  " + MoneyFormat.format(p.getPreco());
                    }
                    new AlertDialog.Builder(this)
                            .setTitle(R.string.escolher_segundo_sabor)
                            .setItems(nomes, (d, which) -> {
                                Produto segundo = pizzas.get(which);
                                Produto base = PizzaMeioAMeio.principal(primeiro, segundo);
                                Produto lancamento = base.comDescricaoEPreco(
                                        PizzaMeioAMeio.descricao(primeiro, segundo),
                                        PizzaMeioAMeio.preco(primeiro, segundo));
                                lancarProdutoNaConta(lancamento);
                            })
                            .setNegativeButton(android.R.string.cancel, null)
                            .show();
                });
            } catch (ApiException e) {
                runOnUiThread(() -> Toast.makeText(this, e.getMessage(), Toast.LENGTH_LONG).show());
            }
        });
    }

    private void lancarProdutoNaConta(Produto produto) {
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

    private void atualizarTituloMesa() {
        toolbar.setTitle(getString(prefs.isModeloComanda() ? R.string.comanda_n : R.string.mesa_n, numeroMesa));
        if (nomeCliente != null && !nomeCliente.trim().isEmpty()) {
            toolbar.setSubtitle(nomeCliente.trim());
        } else {
            toolbar.setSubtitle(getString(R.string.nome_cliente_nao_informado));
        }
    }

    private void dialogEditarNomeCliente() {
        View view = LayoutInflater.from(this).inflate(R.layout.dialog_nome_cliente_mesa, null);
        TextView txtMesa = view.findViewById(R.id.txtMesaDialog);
        TextInputEditText inputNome = view.findViewById(R.id.inputNomeClienteMesa);
        txtMesa.setText(getString(prefs.isModeloComanda() ? R.string.comanda_n : R.string.mesa_n, numeroMesa));
        if (nomeCliente != null) {
            inputNome.setText(nomeCliente);
        }

        new AlertDialog.Builder(this)
                .setTitle(R.string.nome_cliente_mesa)
                .setView(view)
                .setPositiveButton(R.string.salvar, (d, w) -> {
                    String nome = inputNome.getText() == null
                            ? ""
                            : inputNome.getText().toString().trim();
                    salvarNomeCliente(nome);
                })
                .setNegativeButton(R.string.cancelar, null)
                .show();
    }

    private void salvarNomeCliente(String nome) {
        progress.setVisibility(View.VISIBLE);
        executor.execute(() -> {
            try {
                api.atualizarNomeClienteMesa(idConta, nome);
                runOnUiThread(() -> {
                    progress.setVisibility(View.GONE);
                    nomeCliente = nome;
                    atualizarTituloMesa();
                    Toast.makeText(this, R.string.nome_cliente_atualizado, Toast.LENGTH_SHORT).show();
                });
            } catch (ApiException e) {
                runOnUiThread(() -> {
                    progress.setVisibility(View.GONE);
                    Toast.makeText(this, e.getMessage(), Toast.LENGTH_LONG).show();
                });
            }
        });
    }

    private void irParaPagamento() {
        if (prefs.isModoPdvLocal()) {
            Toast.makeText(this, R.string.cupom_somente_pdv, Toast.LENGTH_LONG).show();
            return;
        }
        if (totalAtual.compareTo(BigDecimal.ZERO) <= 0) {
            Toast.makeText(this, R.string.comanda_vazia, Toast.LENGTH_SHORT).show();
            return;
        }
        Intent intent = new Intent(this, PagamentoActivity.class);
        intent.putExtra(PagamentoActivity.EXTRA_MODO_MESA, true);
        intent.putExtra(PagamentoActivity.EXTRA_ID_CONTA, idConta);
        intent.putExtra(PagamentoActivity.EXTRA_NUMERO_MESA, numeroMesa);
        intent.putExtra(PagamentoActivity.EXTRA_TOTAL_MESA, totalAtual.toPlainString());
        if (idCliente != null && !idCliente.isEmpty()) {
            intent.putExtra(PagamentoActivity.EXTRA_ID_CLIENTE, idCliente);
        }
        if (nomeCliente != null && !nomeCliente.isEmpty()) {
            intent.putExtra(PagamentoActivity.EXTRA_NOME_CLIENTE, nomeCliente);
        }
        startActivity(intent);
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        getMenuInflater().inflate(R.menu.menu_conta_mesa, menu);
        return true;
    }

    @Override
    public boolean onOptionsItemSelected(@NonNull MenuItem item) {
        if (item.getItemId() == R.id.action_nome_cliente_mesa) {
            dialogEditarNomeCliente();
            return true;
        }
        return super.onOptionsItemSelected(item);
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
