package com.pos_mais_gestao.ui.produtos;

import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.google.android.material.appbar.MaterialToolbar;
import com.google.android.material.button.MaterialButton;
import com.google.android.material.textfield.TextInputEditText;
import com.pos_mais_gestao.PosApplication;
import com.pos_mais_gestao.R;
import com.pos_mais_gestao.data.api.ApiClient;
import com.pos_mais_gestao.data.api.ApiException;
import com.pos_mais_gestao.data.local.PrefsStore;
import com.pos_mais_gestao.domain.Produto;
import com.pos_mais_gestao.util.MoneyFormat;
import com.pos_mais_gestao.util.ProdutoBuscaHelper;
import com.pos_mais_gestao.util.SoftInputHelper;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class ProdutosActivity extends AppCompatActivity {
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private ApiClient api;
    private PrefsStore prefs;
    private ProdutoBuscaHelper buscaHelper;
    private ProdutoPrecoAdapter adapter;
    private ProgressBar progress;
    private TextView txtVazio;
    private MaterialButton btnCarregarMais;
    private TextInputEditText inputBusca;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_produtos);
        SoftInputHelper.hideOnStart(this);

        PosApplication app = (PosApplication) getApplication();
        api = app.getApiClient();
        prefs = app.getPrefsStore();

        MaterialToolbar toolbar = findViewById(R.id.toolbarProdutos);
        setSupportActionBar(toolbar);
        toolbar.setNavigationOnClickListener(v -> finish());

        progress = findViewById(R.id.progressProdutos);
        txtVazio = findViewById(R.id.txtVazioProdutos);
        btnCarregarMais = findViewById(R.id.btnCarregarMaisProdutos);
        inputBusca = findViewById(R.id.inputBuscaProduto);
        RecyclerView lista = findViewById(R.id.listaProdutos);

        adapter = new ProdutoPrecoAdapter(this::dialogEditarPreco);
        lista.setLayoutManager(new LinearLayoutManager(this));
        lista.setAdapter(adapter);
        TextView txtAjuda = findViewById(R.id.txtProdutosAjuda);
        if (prefs.isModoPdvLocal()) {
            txtAjuda.setText(R.string.produtos_consulta_ajuda);
        }

        buscaHelper = new ProdutoBuscaHelper(api, executor, prefs::getAtalhos, new ProdutoBuscaHelper.Listener() {
            @Override
            public void onAtalhos(List<Produto> atalhos) {
                progress.setVisibility(View.GONE);
                adapter.setItens(atalhos);
                btnCarregarMais.setVisibility(View.GONE);
                txtVazio.setText(R.string.produtos_digite_busca);
                txtVazio.setVisibility(atalhos == null || atalhos.isEmpty() ? View.VISIBLE : View.GONE);
            }

            @Override
            public void onResultados(List<Produto> produtos, boolean temMais, boolean append) {
                progress.setVisibility(View.GONE);
                adapter.setItens(produtos);
                btnCarregarMais.setVisibility(temMais ? View.VISIBLE : View.GONE);
                txtVazio.setText(R.string.nenhum_produto);
                txtVazio.setVisibility(produtos == null || produtos.isEmpty() ? View.VISIBLE : View.GONE);
            }

            @Override
            public void onErro(String mensagem) {
                progress.setVisibility(View.GONE);
                Toast.makeText(ProdutosActivity.this, mensagem, Toast.LENGTH_LONG).show();
            }
        });

        inputBusca.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                progress.setVisibility(View.VISIBLE);
                buscaHelper.onTextoAlterado(s == null ? "" : s.toString());
            }

            @Override
            public void afterTextChanged(Editable s) {}
        });

        btnCarregarMais.setOnClickListener(v -> {
            progress.setVisibility(View.VISIBLE);
            buscaHelper.carregarMais();
        });

        buscaHelper.mostrarAtalhos();
    }

    private void dialogEditarPreco(Produto produto) {
        if (prefs.isModoPdvLocal()) {
            return;
        }
        View view = LayoutInflater.from(this).inflate(R.layout.dialog_valor, null);
        com.google.android.material.textfield.TextInputLayout layout = view.findViewById(R.id.layoutValor);
        layout.setHint(getString(R.string.preco_venda));
        TextInputEditText input = view.findViewById(R.id.inputValor);
        input.setText(produto.getPreco().toPlainString());

        new AlertDialog.Builder(this)
                .setTitle(produto.getDescricao())
                .setMessage(R.string.editar_preco_ajuda)
                .setView(view)
                .setPositiveButton(R.string.salvar, (d, w) -> {
                    String valor = input.getText() == null ? "" : input.getText().toString().trim();
                    BigDecimal novoPreco = MoneyFormat.parse(valor.replace(",", "."));
                    if (valor.isEmpty() || novoPreco.compareTo(BigDecimal.ZERO) < 0) {
                        Toast.makeText(this, R.string.preco_invalido, Toast.LENGTH_SHORT).show();
                        return;
                    }
                    salvarPreco(produto, novoPreco);
                })
                .setNegativeButton(R.string.cancelar, null)
                .show();
    }

    private void salvarPreco(Produto produto, BigDecimal novoPreco) {
        progress.setVisibility(View.VISIBLE);
        executor.execute(() -> {
            try {
                Produto atualizado = api.atualizarPrecoProduto(produto.getId(), novoPreco);
                atualizarAtalhoLocal(atualizado);
                runOnUiThread(() -> {
                    progress.setVisibility(View.GONE);
                    adapter.atualizarProduto(atualizado);
                    Toast.makeText(this, R.string.preco_atualizado, Toast.LENGTH_SHORT).show();
                });
            } catch (ApiException e) {
                runOnUiThread(() -> {
                    progress.setVisibility(View.GONE);
                    Toast.makeText(this, e.getMessage(), Toast.LENGTH_LONG).show();
                });
            }
        });
    }

    private void atualizarAtalhoLocal(Produto atualizado) {
        List<Produto> atalhos = new ArrayList<>(prefs.getAtalhos());
        boolean mudou = false;
        for (int i = 0; i < atalhos.size(); i++) {
            if (atualizado.getId().equals(atalhos.get(i).getId())) {
                atalhos.set(i, atualizado);
                mudou = true;
            }
        }
        if (mudou) {
            prefs.setAtalhos(atalhos);
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        executor.shutdownNow();
    }
}
