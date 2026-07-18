package com.pos_mais_gestao.ui.pagamento;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import com.google.android.material.button.MaterialButton;
import com.pos_mais_gestao.PosApplication;
import com.pos_mais_gestao.R;
import com.pos_mais_gestao.data.api.ApiClient;
import com.pos_mais_gestao.data.api.ApiException;
import com.pos_mais_gestao.data.api.VendaResultadoDto;
import com.pos_mais_gestao.data.sync.OutboxSync;
import com.pos_mais_gestao.domain.Carrinho;
import com.pos_mais_gestao.domain.ItemCarrinho;
import com.pos_mais_gestao.domain.MeioPagamento;
import com.pos_mais_gestao.hardware.PagamentoHardware;
import com.pos_mais_gestao.ui.sucesso.SucessoActivity;
import com.pos_mais_gestao.util.MoneyFormat;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class PagamentoActivity extends AppCompatActivity {
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private ApiClient api;
    private OutboxSync outboxSync;
    private PagamentoHardware pagamentoHardware;
    private ProgressBar progress;
    private MaterialButton btnDinheiro;
    private MaterialButton btnPix;
    private MaterialButton btnCartao;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_pagamento);

        PosApplication app = (PosApplication) getApplication();
        api = app.getApiClient();
        outboxSync = app.getOutboxSync();
        pagamentoHardware = app.getPagamentoHardware();

        TextView txtTotal = findViewById(R.id.txtTotalPagamento);
        progress = findViewById(R.id.progressPagamento);
        btnDinheiro = findViewById(R.id.btnDinheiro);
        btnPix = findViewById(R.id.btnPix);
        btnCartao = findViewById(R.id.btnCartao);

        txtTotal.setText(getString(R.string.total, MoneyFormat.format(Carrinho.getInstance().getTotal())));

        btnDinheiro.setOnClickListener(v -> confirmar(MeioPagamento.DINHEIRO));
        btnPix.setOnClickListener(v -> confirmar(MeioPagamento.PIX));
        btnCartao.setOnClickListener(v -> confirmar(MeioPagamento.CARTAO));
    }

    private void confirmar(MeioPagamento meio) {
        if (Carrinho.getInstance().isVazio()) {
            Toast.makeText(this, R.string.carrinho_vazio, Toast.LENGTH_SHORT).show();
            finish();
            return;
        }

        setLoading(true);
        List<ItemCarrinho> snapshot = new ArrayList<>(Carrinho.getInstance().getItens());

        executor.execute(() -> {
            try {
                if (meio != MeioPagamento.DINHEIRO && pagamentoHardware.estaDisponivel()) {
                    PagamentoHardware.ResultadoPagamentoHardware teF =
                            pagamentoHardware.pagar(meio, Carrinho.getInstance().getTotal());
                    if (!teF.aprovado) {
                        throw new ApiException(teF.mensagem != null ? teF.mensagem : getString(R.string.tef_indisponivel));
                    }
                }

                if (!outboxSync.temRede()) {
                    outboxSync.enfileirarVenda(snapshot, meio);
                    runOnUiThread(() -> {
                        setLoading(false);
                        Carrinho.getInstance().limpar();
                        Toast.makeText(this, R.string.venda_offline, Toast.LENGTH_LONG).show();
                        Intent intent = new Intent(this, SucessoActivity.class);
                        intent.putExtra(SucessoActivity.EXTRA_CODIGO, "OFFLINE");
                        intent.putExtra(SucessoActivity.EXTRA_NFCE, getString(R.string.venda_offline));
                        intent.putExtra(SucessoActivity.EXTRA_COMPROVANTE, "Venda enfileirada offline\n");
                        startActivity(intent);
                        finish();
                    });
                    return;
                }

                VendaResultadoDto resultado = api.criarVendaPdvRapida(snapshot, meio);
                runOnUiThread(() -> {
                    setLoading(false);
                    Carrinho.getInstance().limpar();
                    Intent intent = new Intent(this, SucessoActivity.class);
                    intent.putExtra(
                            SucessoActivity.EXTRA_CODIGO,
                            resultado.codigo != null ? resultado.codigo : "—");
                    intent.putExtra(SucessoActivity.EXTRA_NFCE, resultado.mensagemNfce);
                    intent.putExtra(SucessoActivity.EXTRA_COMPROVANTE, resultado.comprovanteTexto);
                    intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
                    startActivity(intent);
                    finish();
                });
            } catch (ApiException e) {
                runOnUiThread(() -> {
                    setLoading(false);
                    Toast.makeText(this, e.getMessage(), Toast.LENGTH_LONG).show();
                });
            } catch (Exception e) {
                runOnUiThread(() -> {
                    setLoading(false);
                    Toast.makeText(this, e.getMessage(), Toast.LENGTH_LONG).show();
                });
            }
        });
    }

    private void setLoading(boolean loading) {
        progress.setVisibility(loading ? View.VISIBLE : View.GONE);
        btnDinheiro.setEnabled(!loading);
        btnPix.setEnabled(!loading);
        btnCartao.setEnabled(!loading);
        if (loading) {
            Toast.makeText(this, R.string.enviando, Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        executor.shutdownNow();
    }
}
