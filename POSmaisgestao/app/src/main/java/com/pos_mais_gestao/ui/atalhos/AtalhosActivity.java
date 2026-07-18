package com.pos_mais_gestao.ui.atalhos;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.View;
import android.widget.ProgressBar;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.google.android.material.textfield.TextInputEditText;
import com.pos_mais_gestao.PosApplication;
import com.pos_mais_gestao.R;
import com.pos_mais_gestao.data.api.ApiClient;
import com.pos_mais_gestao.data.api.ApiException;
import com.pos_mais_gestao.data.local.PrefsStore;
import com.pos_mais_gestao.data.sync.OutboxSync;
import com.pos_mais_gestao.domain.Produto;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class AtalhosActivity extends AppCompatActivity {
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final Handler handler = new Handler(Looper.getMainLooper());
    private PrefsStore prefs;
    private ApiClient api;
    private OutboxSync outboxSync;
    private AtalhoManageAdapter buscaAdapter;
    private AtalhoManageAdapter atalhosAdapter;
    private ProgressBar progress;
    private Runnable buscaPendente;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_atalhos);

        PosApplication app = (PosApplication) getApplication();
        prefs = app.getPrefsStore();
        api = app.getApiClient();
        outboxSync = app.getOutboxSync();

        progress = findViewById(R.id.progressAtalhos);
        TextInputEditText inputBusca = findViewById(R.id.inputBuscaAtalho);

        buscaAdapter = new AtalhoManageAdapter(false, produto -> {
            prefs.adicionarAtalho(produto);
            atualizarAtalhos();
            sincronizarNuvem();
            Toast.makeText(this, "Atalho adicionado", Toast.LENGTH_SHORT).show();
        });
        atalhosAdapter = new AtalhoManageAdapter(true, produto -> {
            prefs.removerAtalho(produto.getId());
            atualizarAtalhos();
            sincronizarNuvem();
            Toast.makeText(this, "Atalho removido", Toast.LENGTH_SHORT).show();
        });

        RecyclerView listaBusca = findViewById(R.id.listaBuscaAtalhos);
        listaBusca.setLayoutManager(new LinearLayoutManager(this));
        listaBusca.setAdapter(buscaAdapter);

        RecyclerView listaAtalhos = findViewById(R.id.listaAtalhosAtuais);
        listaAtalhos.setLayoutManager(new LinearLayoutManager(this));
        listaAtalhos.setAdapter(atalhosAdapter);

        inputBusca.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                if (buscaPendente != null) {
                    handler.removeCallbacks(buscaPendente);
                }
                String termo = s == null ? "" : s.toString().trim();
                buscaPendente = () -> {
                    if (termo.length() >= 1) {
                        buscar(termo);
                    } else {
                        buscaAdapter.setItens(null);
                    }
                };
                handler.postDelayed(buscaPendente, 350);
            }

            @Override
            public void afterTextChanged(Editable s) {}
        });

        atualizarAtalhos();
        carregarRemotos();
    }

    private void atualizarAtalhos() {
        atalhosAdapter.setItens(prefs.getAtalhos());
    }

    private void carregarRemotos() {
        executor.execute(() -> {
            try {
                List<Produto> remotos = api.listarAtalhosRemotos();
                runOnUiThread(() -> {
                    prefs.setAtalhos(remotos);
                    atualizarAtalhos();
                });
            } catch (ApiException ignored) {
            }
        });
    }

    private void sincronizarNuvem() {
        List<String> ids = new ArrayList<>();
        for (Produto p : prefs.getAtalhos()) {
            ids.add(p.getId());
        }
        executor.execute(() -> {
            try {
                if (outboxSync.temRede()) {
                    api.sincronizarAtalhos(ids);
                } else {
                    outboxSync.enfileirarAtalhos(ids);
                }
            } catch (ApiException e) {
                outboxSync.enfileirarAtalhos(ids);
            }
        });
    }

    private void buscar(String termo) {
        progress.setVisibility(View.VISIBLE);
        executor.execute(() -> {
            try {
                List<Produto> produtos = api.buscarProdutos(termo);
                runOnUiThread(() -> {
                    progress.setVisibility(View.GONE);
                    buscaAdapter.setItens(produtos);
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
        handler.removeCallbacksAndMessages(null);
    }
}
