package com.pos_mais_gestao.ui.venda;

import android.content.Intent;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
import android.widget.TextView;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.GridLayoutManager;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.google.android.material.appbar.MaterialToolbar;
import com.google.android.material.button.MaterialButton;
import com.google.android.material.textfield.TextInputEditText;
import com.pos_mais_gestao.PosApplication;
import com.pos_mais_gestao.R;
import com.pos_mais_gestao.data.api.ApiClient;
import com.pos_mais_gestao.data.local.PrefsStore;
import com.pos_mais_gestao.domain.Carrinho;
import com.pos_mais_gestao.domain.ItemCarrinho;
import com.pos_mais_gestao.domain.Produto;
import com.pos_mais_gestao.ui.atalhos.AtalhosActivity;
import com.pos_mais_gestao.ui.config.ConfigActivity;
import com.pos_mais_gestao.ui.login.LoginActivity;
import com.pos_mais_gestao.ui.pagamento.PagamentoActivity;
import com.pos_mais_gestao.util.MoneyFormat;
import com.pos_mais_gestao.util.ProdutoBuscaHelper;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class VendaActivity extends AppCompatActivity {
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private PrefsStore prefs;
    private ApiClient api;
    private ProdutoAdapter produtoAdapter;
    private CarrinhoAdapter carrinhoAdapter;
    private ProdutoBuscaHelper buscaHelper;
    private RecyclerView listaProdutos;
    private TextView lblSecao;
    private TextView txtVazio;
    private MaterialButton btnPagar;
    private MaterialButton btnCarregarMais;
    private boolean mostrandoBusca;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_venda);

        PosApplication app = (PosApplication) getApplication();
        prefs = app.getPrefsStore();
        api = app.getApiClient();

        MaterialToolbar toolbar = findViewById(R.id.toolbarVenda);
        setSupportActionBar(toolbar);
        toolbar.setTitle(R.string.venda_rapida);
        toolbar.setNavigationOnClickListener(v -> finish());

        lblSecao = findViewById(R.id.lblSecao);
        txtVazio = findViewById(R.id.txtVazio);
        btnPagar = findViewById(R.id.btnPagar);
        btnCarregarMais = findViewById(R.id.btnCarregarMais);
        TextInputEditText inputBusca = findViewById(R.id.inputBusca);

        produtoAdapter = new ProdutoAdapter(this::adicionarProduto);
        listaProdutos = findViewById(R.id.listaProdutos);
        listaProdutos.setLayoutManager(new GridLayoutManager(this, 2));
        listaProdutos.setAdapter(produtoAdapter);

        carrinhoAdapter = new CarrinhoAdapter(new CarrinhoAdapter.Listener() {
            @Override
            public void onMais(ItemCarrinho item) {
                item.incrementar();
                atualizarCarrinho();
            }

            @Override
            public void onMenos(ItemCarrinho item) {
                item.decrementar();
                Carrinho.getInstance().removerSeZero();
                atualizarCarrinho();
            }
        });
        RecyclerView listaCarrinho = findViewById(R.id.listaCarrinho);
        listaCarrinho.setLayoutManager(new LinearLayoutManager(this));
        listaCarrinho.setAdapter(carrinhoAdapter);

        btnPagar.setOnClickListener(v -> {
            if (Carrinho.getInstance().isVazio()) {
                Toast.makeText(this, R.string.carrinho_vazio, Toast.LENGTH_SHORT).show();
                return;
            }
            startActivity(new Intent(this, PagamentoActivity.class));
        });
        btnCarregarMais.setOnClickListener(v -> buscaHelper.carregarMais());

        buscaHelper = new ProdutoBuscaHelper(api, executor, prefs::getAtalhos, new ProdutoBuscaHelper.Listener() {
            @Override
            public void onAtalhos(List<Produto> atalhos) {
                mostrandoBusca = false;
                lblSecao.setText(R.string.atalhos);
                listaProdutos.setLayoutManager(new GridLayoutManager(VendaActivity.this, 2));
                produtoAdapter.setItens(atalhos);
                btnCarregarMais.setVisibility(View.GONE);
                txtVazio.setText(R.string.sem_atalhos);
                txtVazio.setVisibility(atalhos.isEmpty() ? View.VISIBLE : View.GONE);
            }

            @Override
            public void onResultados(List<Produto> produtos, boolean temMais, boolean append) {
                mostrandoBusca = true;
                lblSecao.setText(R.string.resultados);
                listaProdutos.setLayoutManager(new LinearLayoutManager(VendaActivity.this));
                produtoAdapter.setItens(produtos);
                btnCarregarMais.setVisibility(temMais ? View.VISIBLE : View.GONE);
                txtVazio.setText(R.string.nenhum_produto);
                txtVazio.setVisibility(produtos.isEmpty() ? View.VISIBLE : View.GONE);
            }

            @Override
            public void onErro(String mensagem) {
                Toast.makeText(VendaActivity.this, mensagem, Toast.LENGTH_LONG).show();
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
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (!mostrandoBusca) {
            buscaHelper.mostrarAtalhos();
        }
        atualizarCarrinho();
    }

    private void adicionarProduto(Produto produto) {
        Carrinho.getInstance().adicionar(produto);
        atualizarCarrinho();
    }

    private void atualizarCarrinho() {
        Carrinho carrinho = Carrinho.getInstance();
        carrinhoAdapter.setItens(carrinho.getItens());
        btnPagar.setText(getString(R.string.pagar) + " — " + MoneyFormat.format(carrinho.getTotal()));
        btnPagar.setEnabled(!carrinho.isVazio());
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        getMenuInflater().inflate(R.menu.menu_venda, menu);
        return true;
    }

    @Override
    public boolean onOptionsItemSelected(@NonNull MenuItem item) {
        int id = item.getItemId();
        if (id == R.id.action_atalhos) {
            startActivity(new Intent(this, AtalhosActivity.class));
            return true;
        }
        if (id == R.id.action_config) {
            startActivity(new Intent(this, ConfigActivity.class));
            return true;
        }
        if (id == R.id.action_logout) {
            prefs.logout();
            Carrinho.getInstance().limpar();
            Intent intent = new Intent(this, LoginActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
            startActivity(intent);
            finish();
            return true;
        }
        return super.onOptionsItemSelected(item);
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
