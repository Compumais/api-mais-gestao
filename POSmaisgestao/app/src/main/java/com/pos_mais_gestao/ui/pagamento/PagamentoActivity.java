package com.pos_mais_gestao.ui.pagamento;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;
import com.google.android.material.button.MaterialButton;
import com.pos_mais_gestao.PosApplication;
import com.pos_mais_gestao.R;
import com.pos_mais_gestao.data.api.ApiClient;
import com.pos_mais_gestao.data.api.ApiException;
import com.pos_mais_gestao.data.api.VendaResultadoDto;
import com.pos_mais_gestao.data.local.PrefsStore;
import com.pos_mais_gestao.data.sync.OutboxSync;
import com.pos_mais_gestao.domain.Carrinho;
import com.pos_mais_gestao.domain.ItemCarrinho;
import com.pos_mais_gestao.domain.ItemFicha;
import com.pos_mais_gestao.domain.MeioPagamento;
import com.pos_mais_gestao.hardware.PagamentoHardware;
import com.pos_mais_gestao.ui.cliente.SelecionarClienteActivity;
import com.pos_mais_gestao.ui.falha.FalhaNfceActivity;
import com.pos_mais_gestao.ui.sucesso.SucessoActivity;
import com.pos_mais_gestao.util.MoneyFormat;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class PagamentoActivity extends AppCompatActivity {
    public static final String EXTRA_MODO_MESA = "modo_mesa";
    public static final String EXTRA_ID_CONTA = "id_conta";
    public static final String EXTRA_TOTAL_MESA = "total_mesa";
    public static final String EXTRA_NUMERO_MESA = "numero_mesa";
    public static final String EXTRA_ID_CLIENTE = "id_cliente";
    public static final String EXTRA_NOME_CLIENTE = "nome_cliente";

    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private ApiClient api;
    private PrefsStore prefs;
    private OutboxSync outboxSync;
    private PagamentoHardware pagamentoHardware;
    private ProgressBar progress;
    private MaterialButton btnDinheiro;
    private MaterialButton btnPix;
    private MaterialButton btnCartao;
    private MaterialButton btnInformarCliente;
    private TextView txtClienteSelecionado;

    private boolean modoMesa;
    private String idConta;
    private BigDecimal totalMesa = BigDecimal.ZERO;
    private String identidadeCliente;
    private String nomeCliente;
    private String docCliente;

    private final ActivityResultLauncher<Intent> selecionarClienteLauncher =
            registerForActivityResult(new ActivityResultContracts.StartActivityForResult(), result -> {
                if (result.getResultCode() != RESULT_OK || result.getData() == null) {
                    return;
                }
                Intent data = result.getData();
                String id = data.getStringExtra(SelecionarClienteActivity.EXTRA_CLIENTE_ID);
                String nome = data.getStringExtra(SelecionarClienteActivity.EXTRA_CLIENTE_NOME);
                String doc = data.getStringExtra(SelecionarClienteActivity.EXTRA_CLIENTE_DOC);
                if (id == null || id.trim().isEmpty()) {
                    identidadeCliente = null;
                    nomeCliente = null;
                    docCliente = null;
                } else {
                    identidadeCliente = id.trim();
                    nomeCliente = nome;
                    docCliente = doc;
                }
                atualizarLabelCliente();
            });

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_pagamento);

        PosApplication app = (PosApplication) getApplication();
        api = app.getApiClient();
        prefs = app.getPrefsStore();
        outboxSync = app.getOutboxSync();
        pagamentoHardware = app.getPagamentoHardware();

        modoMesa = getIntent().getBooleanExtra(EXTRA_MODO_MESA, false);
        idConta = getIntent().getStringExtra(EXTRA_ID_CONTA);
        identidadeCliente = getIntent().getStringExtra(EXTRA_ID_CLIENTE);
        nomeCliente = getIntent().getStringExtra(EXTRA_NOME_CLIENTE);
        String totalExtra = getIntent().getStringExtra(EXTRA_TOTAL_MESA);
        if (totalExtra != null) {
            try {
                totalMesa = new BigDecimal(totalExtra);
            } catch (Exception ignored) {
                totalMesa = BigDecimal.ZERO;
            }
        }

        TextView txtTotal = findViewById(R.id.txtTotalPagamento);
        progress = findViewById(R.id.progressPagamento);
        btnDinheiro = findViewById(R.id.btnDinheiro);
        btnPix = findViewById(R.id.btnPix);
        btnCartao = findViewById(R.id.btnCartao);
        btnInformarCliente = findViewById(R.id.btnInformarCliente);
        txtClienteSelecionado = findViewById(R.id.txtClienteSelecionado);

        BigDecimal totalExibir = modoMesa ? totalMesa : Carrinho.getInstance().getTotal();
        txtTotal.setText(getString(R.string.total, MoneyFormat.format(totalExibir)));
        atualizarLabelCliente();

        btnInformarCliente.setOnClickListener(v ->
                selecionarClienteLauncher.launch(new Intent(this, SelecionarClienteActivity.class)));
        btnDinheiro.setOnClickListener(v -> confirmar(MeioPagamento.DINHEIRO));
        btnPix.setOnClickListener(v -> confirmar(MeioPagamento.PIX));
        btnCartao.setOnClickListener(v -> confirmar(MeioPagamento.CARTAO));
    }

    private void atualizarLabelCliente() {
        if (identidadeCliente == null || identidadeCliente.isEmpty()) {
            txtClienteSelecionado.setText(R.string.cliente_nao_informado);
            btnInformarCliente.setText(R.string.informar_cliente);
            return;
        }
        StringBuilder sb = new StringBuilder();
        if (nomeCliente != null && !nomeCliente.isEmpty()) {
            sb.append(nomeCliente);
        } else {
            sb.append(getString(R.string.cliente_selecionado));
        }
        if (docCliente != null && !docCliente.isEmpty()) {
            sb.append("\n").append(docCliente);
        }
        txtClienteSelecionado.setText(sb.toString());
        btnInformarCliente.setText(R.string.trocar_cliente);
    }

    private void confirmar(MeioPagamento meio) {
        if (modoMesa) {
            if (idConta == null || idConta.isEmpty()) {
                Toast.makeText(this, R.string.conta_mesa_invalida, Toast.LENGTH_SHORT).show();
                finish();
                return;
            }
            if (totalMesa.compareTo(BigDecimal.ZERO) <= 0) {
                Toast.makeText(this, R.string.comanda_vazia, Toast.LENGTH_SHORT).show();
                finish();
                return;
            }
        } else if (Carrinho.getInstance().isVazio()) {
            Toast.makeText(this, R.string.carrinho_vazio, Toast.LENGTH_SHORT).show();
            finish();
            return;
        }

        setLoading(true);
        List<ItemCarrinho> snapshot =
                modoMesa ? null : new ArrayList<>(Carrinho.getInstance().getItens());
        BigDecimal totalPagamento = modoMesa ? totalMesa : Carrinho.getInstance().getTotal();
        boolean imprimirFichas = prefs.isImprimirFichasEvento();
        final String idClienteVenda = identidadeCliente;
        final String nomeClienteVenda = nomeCliente;
        final String docClienteVenda = docCliente;

        executor.execute(() -> {
            try {
                if (meio != MeioPagamento.DINHEIRO && pagamentoHardware.estaDisponivel()) {
                    PagamentoHardware.ResultadoPagamentoHardware teF =
                            pagamentoHardware.pagar(meio, totalPagamento);
                    if (!teF.aprovado) {
                        throw new ApiException(
                                teF.mensagem != null ? teF.mensagem : getString(R.string.tef_indisponivel));
                    }
                }

                ArrayList<ItemFicha> fichas = new ArrayList<>();
                // Fichas de evento só na venda rápida — não imprimir ao fechar mesa
                if (imprimirFichas && !modoMesa && snapshot != null) {
                    fichas.addAll(ItemFicha.deCarrinho(snapshot));
                }

                if (!outboxSync.temRede()) {
                    if (modoMesa) {
                        throw new ApiException(getString(R.string.fechar_mesa_requer_rede));
                    }
                    outboxSync.enfileirarVenda(snapshot, meio);
                    ArrayList<ItemFicha> fichasOffline = fichas;
                    runOnUiThread(() -> {
                        setLoading(false);
                        Carrinho.getInstance().limpar();
                        Toast.makeText(this, R.string.venda_offline, Toast.LENGTH_LONG).show();
                        Intent intent = new Intent(this, SucessoActivity.class);
                        intent.putExtra(SucessoActivity.EXTRA_CODIGO, "OFFLINE");
                        intent.putExtra(SucessoActivity.EXTRA_NFCE, getString(R.string.venda_offline_ajuda));
                        intent.putExtra(
                                SucessoActivity.EXTRA_COMPROVANTE,
                                "Venda enfileirada offline\nNAO FISCAL — sem NFC-e\n");
                        intent.putExtra(SucessoActivity.EXTRA_CUPOM_FISCAL, false);
                        anexarFichas(intent, fichasOffline);
                        startActivity(intent);
                        finish();
                    });
                    return;
                }

                VendaResultadoDto resultado = modoMesa
                        ? api.fecharContaMesa(idConta, meio, idClienteVenda)
                        : api.criarVendaPdvRapida(
                                snapshot, meio, idClienteVenda, nomeClienteVenda, docClienteVenda);

                ArrayList<ItemFicha> fichasFinais = fichas;
                runOnUiThread(() -> {
                    setLoading(false);
                    if (!modoMesa) {
                        Carrinho.getInstance().limpar();
                    }
                    abrirResultado(resultado, fichasFinais);
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

    private void anexarFichas(Intent intent, ArrayList<ItemFicha> fichas) {
        if (fichas != null && !fichas.isEmpty()) {
            intent.putExtra(SucessoActivity.EXTRA_FICHAS, (Serializable) fichas);
            intent.putExtra(SucessoActivity.EXTRA_EMPRESA_NOME, prefs.getEmpresaNome());
        }
    }

    private void abrirResultado(VendaResultadoDto resultado, ArrayList<ItemFicha> fichas) {
        if (!resultado.sucessoFiscalCompleto) {
            Intent falha = new Intent(this, FalhaNfceActivity.class);
            falha.putExtra(FalhaNfceActivity.EXTRA_MOTIVO, resultado.mensagemNfce);
            falha.putExtra(FalhaNfceActivity.EXTRA_CSTAT, resultado.cStat);
            falha.putExtra(
                    FalhaNfceActivity.EXTRA_CODIGO,
                    resultado.codigo != null ? resultado.codigo : "—");
            falha.putExtra(FalhaNfceActivity.EXTRA_COMPROVANTE, resultado.comprovanteTexto);
            if (modoMesa) {
                falha.putExtra(FalhaNfceActivity.EXTRA_VOLTAR_MESAS, true);
            }
            if (fichas != null && !fichas.isEmpty()) {
                falha.putExtra(FalhaNfceActivity.EXTRA_FICHAS, (Serializable) fichas);
                falha.putExtra(FalhaNfceActivity.EXTRA_EMPRESA_NOME, prefs.getEmpresaNome());
            }
            falha.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
            startActivity(falha);
            finish();
            return;
        }
        Intent intent = new Intent(this, SucessoActivity.class);
        intent.putExtra(
                SucessoActivity.EXTRA_CODIGO,
                resultado.codigo != null ? resultado.codigo : "—");
        intent.putExtra(SucessoActivity.EXTRA_NFCE, resultado.mensagemNfce);
        intent.putExtra(SucessoActivity.EXTRA_COMPROVANTE, resultado.comprovanteTexto);
        intent.putExtra(SucessoActivity.EXTRA_CUPOM_FISCAL, resultado.cupomFiscal);
        intent.putExtra(SucessoActivity.EXTRA_QR, resultado.qrParaImpressao);
        anexarFichas(intent, fichas);
        if (modoMesa) {
            intent.putExtra(SucessoActivity.EXTRA_VOLTAR_MESAS, true);
            intent.putExtra(SucessoActivity.EXTRA_TITULO, getString(R.string.mesa_fechada_titulo));
        } else {
            intent.putExtra(
                    SucessoActivity.EXTRA_TITULO,
                    resultado.pedidoDav
                            ? getString(R.string.pedido_enviado)
                            : resultado.cupomFiscal
                                    ? getString(R.string.nfce_autorizada_titulo)
                                    : getString(R.string.venda_enviada));
        }
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        startActivity(intent);
        finish();
    }

    private void setLoading(boolean loading) {
        progress.setVisibility(loading ? View.VISIBLE : View.GONE);
        btnDinheiro.setEnabled(!loading);
        btnPix.setEnabled(!loading);
        btnCartao.setEnabled(!loading);
        btnInformarCliente.setEnabled(!loading);
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        executor.shutdownNow();
    }
}
