package com.pos_mais_gestao.util;

import android.os.Handler;
import android.os.Looper;
import com.pos_mais_gestao.data.api.ApiClient;
import com.pos_mais_gestao.data.api.ApiException;
import com.pos_mais_gestao.domain.Produto;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.function.Supplier;

public class ProdutoBuscaHelper {
    public interface Listener {
        void onAtalhos(List<Produto> atalhos);

        void onResultados(List<Produto> produtos, boolean temMais, boolean append);

        void onErro(String mensagem);
    }

    private final ApiClient api;
    private final ExecutorService executor;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Listener listener;
    private final Supplier<List<Produto>> fornecedorAtalhos;
    private Runnable buscaPendente;
    private String termoAtual = "";
    private int paginaAtual = 1;
    private boolean temMais;
    private boolean buscando;
    private final List<Produto> acumulados = new ArrayList<>();

    public ProdutoBuscaHelper(
            ApiClient api,
            ExecutorService executor,
            Supplier<List<Produto>> fornecedorAtalhos,
            Listener listener) {
        this.api = api;
        this.executor = executor;
        this.fornecedorAtalhos = fornecedorAtalhos;
        this.listener = listener;
    }

    public void onTextoAlterado(String texto) {
        if (buscaPendente != null) {
            handler.removeCallbacks(buscaPendente);
        }
        String termo = texto == null ? "" : texto.trim();
        buscaPendente = () -> {
            if (termo.isEmpty()) {
                mostrarAtalhos();
            } else {
                buscar(termo, false);
            }
        };
        handler.postDelayed(buscaPendente, 350);
    }

    public void mostrarAtalhos() {
        termoAtual = "";
        paginaAtual = 1;
        temMais = false;
        acumulados.clear();
        List<Produto> atalhos = fornecedorAtalhos.get();
        listener.onAtalhos(atalhos != null ? atalhos : new ArrayList<>());
    }

    public void carregarMais() {
        if (!temMais || buscando || termoAtual.isEmpty()) {
            return;
        }
        buscar(termoAtual, true);
    }

    public boolean temMais() {
        return temMais;
    }

    public boolean isBuscando() {
        return buscando;
    }

    private void buscar(String termo, boolean append) {
        if (!append) {
            termoAtual = termo;
            paginaAtual = 1;
            acumulados.clear();
        } else {
            paginaAtual += 1;
        }
        buscando = true;
        final int pagina = paginaAtual;
        executor.execute(() -> {
            try {
                ApiClient.PaginaProdutos paginaProdutos = api.buscarProdutos(termo, pagina, 30);
                handler.post(() -> {
                    buscando = false;
                    if (append) {
                        acumulados.addAll(paginaProdutos.produtos);
                    } else {
                        acumulados.clear();
                        acumulados.addAll(paginaProdutos.produtos);
                    }
                    temMais = paginaProdutos.temMais();
                    listener.onResultados(new ArrayList<>(acumulados), temMais, append);
                });
            } catch (ApiException e) {
                handler.post(() -> {
                    buscando = false;
                    if (append) {
                        paginaAtual = Math.max(1, paginaAtual - 1);
                    }
                    listener.onErro(e.getMessage());
                });
            }
        });
    }

    public void limparCallbacks() {
        handler.removeCallbacksAndMessages(null);
    }
}
