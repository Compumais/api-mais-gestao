package com.pos_mais_gestao.ui.pagamento;

import android.content.Intent;
import android.graphics.Bitmap;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.ImageButton;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import com.google.android.material.button.MaterialButton;
import com.google.android.material.textfield.TextInputEditText;
import com.google.android.material.textfield.TextInputLayout;
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
import com.pos_mais_gestao.domain.LancamentoPagamento;
import com.pos_mais_gestao.domain.MeioPagamento;
import com.pos_mais_gestao.ui.cliente.SelecionarClienteActivity;
import com.pos_mais_gestao.ui.falha.FalhaNfceActivity;
import com.pos_mais_gestao.ui.sucesso.SucessoActivity;
import com.pos_mais_gestao.util.MoneyFormat;
import com.pos_mais_gestao.util.PagamentosMisto;
import com.pos_mais_gestao.util.PixPayloadBuilder;
import com.pos_mais_gestao.util.QrBitmapHelper;
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
    private final List<LancamentoPagamento> lancamentos = new ArrayList<>();
    private ApiClient api;
    private PrefsStore prefs;
    private OutboxSync outboxSync;
    private ProgressBar progress;
    private MaterialButton btnDinheiro;
    private MaterialButton btnPix;
    private MaterialButton btnCartao;
    private MaterialButton btnFechar;
    private MaterialButton btnInformarCliente;
    private TextView txtTotal;
    private TextView txtRestante;
    private TextView txtTroco;
    private TextView txtClienteSelecionado;
    private TextView txtLancamentosVazio;
    private LinearLayout listaLancamentos;

    private boolean modoMesa;
    private String idConta;
    private BigDecimal totalVenda = BigDecimal.ZERO;
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

        modoMesa = getIntent().getBooleanExtra(EXTRA_MODO_MESA, false);
        idConta = getIntent().getStringExtra(EXTRA_ID_CONTA);
        identidadeCliente = getIntent().getStringExtra(EXTRA_ID_CLIENTE);
        nomeCliente = getIntent().getStringExtra(EXTRA_NOME_CLIENTE);
        String totalExtra = getIntent().getStringExtra(EXTRA_TOTAL_MESA);
        if (modoMesa && totalExtra != null) {
            try {
                totalVenda = new BigDecimal(totalExtra);
            } catch (Exception ignored) {
                totalVenda = BigDecimal.ZERO;
            }
        } else {
            totalVenda = Carrinho.getInstance().getTotal();
        }

        txtTotal = findViewById(R.id.txtTotalPagamento);
        txtRestante = findViewById(R.id.txtRestantePagamento);
        txtTroco = findViewById(R.id.txtTrocoPagamento);
        progress = findViewById(R.id.progressPagamento);
        btnDinheiro = findViewById(R.id.btnDinheiro);
        btnPix = findViewById(R.id.btnPix);
        btnCartao = findViewById(R.id.btnCartao);
        btnFechar = findViewById(R.id.btnFecharPagamento);
        btnInformarCliente = findViewById(R.id.btnInformarCliente);
        txtClienteSelecionado = findViewById(R.id.txtClienteSelecionado);
        txtLancamentosVazio = findViewById(R.id.txtLancamentosVazio);
        listaLancamentos = findViewById(R.id.listaLancamentos);

        btnFechar.setText(modoMesa ? R.string.fechar_conta : R.string.confirmar_pagamento);
        atualizarLabelCliente();
        atualizarResumo();

        btnInformarCliente.setOnClickListener(v ->
                selecionarClienteLauncher.launch(new Intent(this, SelecionarClienteActivity.class)));
        btnDinheiro.setOnClickListener(v -> iniciarLancamento(MeioPagamento.DINHEIRO));
        btnPix.setOnClickListener(v -> iniciarLancamento(MeioPagamento.PIX));
        btnCartao.setOnClickListener(v -> iniciarLancamento(MeioPagamento.CARTAO));
        btnFechar.setOnClickListener(v -> confirmarFechamento());
    }

    private void iniciarLancamento(MeioPagamento meio) {
        if (!validarVendaAberta()) {
            return;
        }
        BigDecimal restante = PagamentosMisto.restante(totalVenda, lancamentos);
        if (restante.compareTo(BigDecimal.ZERO) <= 0) {
            Toast.makeText(this, R.string.saldo_ja_quitado, Toast.LENGTH_SHORT).show();
            return;
        }
        View view = LayoutInflater.from(this).inflate(R.layout.dialog_valor, null);
        TextInputLayout layout = view.findViewById(R.id.layoutValor);
        TextInputEditText input = view.findViewById(R.id.inputValor);
        layout.setHint(getString(R.string.valor_lancamento));
        input.setText(MoneyFormat.toApi(restante));
        input.selectAll();

        new AlertDialog.Builder(this)
                .setTitle(tituloMeio(meio))
                .setView(view)
                .setPositiveButton(R.string.adicionar_lancamento, (d, w) -> {
                    BigDecimal valor = MoneyFormat.parse(
                            input.getText() == null ? "" : input.getText().toString());
                    if (valor.compareTo(BigDecimal.ZERO) <= 0) {
                        Toast.makeText(this, R.string.valor_lancamento_invalido, Toast.LENGTH_SHORT).show();
                        return;
                    }
                    BigDecimal atual = PagamentosMisto.restante(totalVenda, lancamentos);
                    if (PagamentosMisto.valorExcedeRestante(meio, valor, atual)) {
                        Toast.makeText(
                                this,
                                getString(R.string.valor_maior_restante, MoneyFormat.format(atual)),
                                Toast.LENGTH_LONG).show();
                        return;
                    }
                    if (meio == MeioPagamento.PIX) {
                        confirmarPix(valor);
                    } else {
                        adicionarLancamento(LancamentoPagamento.ok(meio, valor));
                    }
                })
                .setNegativeButton(R.string.cancelar, null)
                .show();
    }

    private void confirmarPix(BigDecimal valor) {
        if (!prefs.isPixQrHabilitado()) {
            adicionarLancamento(LancamentoPagamento.ok(MeioPagamento.PIX, valor));
            return;
        }
        String chave = prefs.getChavePix();
        if (chave == null || chave.trim().isEmpty()) {
            Toast.makeText(this, R.string.pix_chave_obrigatoria, Toast.LENGTH_LONG).show();
            return;
        }
        try {
            String nome = prefs.getNomePix();
            if (nome == null || nome.trim().isEmpty()) {
                nome = prefs.getEmpresaNome();
            }
            String payload = PixPayloadBuilder.montar(chave, valor, nome, prefs.getCidadePix());
            Bitmap qr = QrBitmapHelper.gerar(payload, 720);

            View view = LayoutInflater.from(this).inflate(R.layout.dialog_pix_qr, null);
            TextView txtValor = view.findViewById(R.id.txtPixValor);
            TextView txtChave = view.findViewById(R.id.txtPixChave);
            TextView txtPayload = view.findViewById(R.id.txtPixPayload);
            ImageView imgQr = view.findViewById(R.id.imgPixQr);

            txtValor.setText(MoneyFormat.format(valor));
            txtChave.setText(chave.trim());
            txtPayload.setText(payload);
            imgQr.setImageBitmap(qr);

            new AlertDialog.Builder(this)
                    .setTitle(R.string.pix)
                    .setView(view)
                    .setPositiveButton(R.string.pix_confirmar_recebido, (d, w) ->
                            adicionarLancamento(LancamentoPagamento.ok(MeioPagamento.PIX, valor)))
                    .setNegativeButton(R.string.cancelar, null)
                    .show();
        } catch (Exception e) {
            Toast.makeText(this, R.string.pix_qr_erro, Toast.LENGTH_LONG).show();
        }
    }

    private void adicionarLancamento(LancamentoPagamento lancamento) {
        lancamentos.add(lancamento);
        atualizarResumo();
    }

    private void removerLancamento(LancamentoPagamento lancamento) {
        lancamentos.remove(lancamento);
        atualizarResumo();
    }

    private void atualizarResumo() {
        txtTotal.setText(getString(R.string.total, MoneyFormat.format(totalVenda)));
        BigDecimal restante = PagamentosMisto.restante(totalVenda, lancamentos);
        BigDecimal troco = PagamentosMisto.troco(totalVenda, lancamentos);
        if (restante.compareTo(BigDecimal.ZERO) <= 0) {
            txtRestante.setText(R.string.saldo_quitado);
            txtRestante.setTextColor(getColor(R.color.dinheiro));
        } else {
            txtRestante.setText(getString(R.string.restante_pagamento, MoneyFormat.format(restante)));
            txtRestante.setTextColor(getColor(R.color.danger));
        }
        if (troco.compareTo(BigDecimal.ZERO) > 0) {
            txtTroco.setVisibility(View.VISIBLE);
            txtTroco.setText(getString(R.string.troco_pagamento, MoneyFormat.format(troco)));
        } else {
            txtTroco.setVisibility(View.GONE);
        }

        listaLancamentos.removeAllViews();
        LayoutInflater inflater = LayoutInflater.from(this);
        for (LancamentoPagamento item : lancamentos) {
            View row = inflater.inflate(R.layout.item_lancamento_pagamento, listaLancamentos, false);
            TextView txtMeio = row.findViewById(R.id.txtLancamentoMeio);
            TextView txtValor = row.findViewById(R.id.txtLancamentoValor);
            ImageButton btnRemover = row.findViewById(R.id.btnRemoverLancamento);
            txtMeio.setText(tituloMeio(item.meio));
            txtValor.setText(MoneyFormat.format(item.valor));
            btnRemover.setOnClickListener(v -> removerLancamento(item));
            listaLancamentos.addView(row);
        }
        txtLancamentosVazio.setVisibility(lancamentos.isEmpty() ? View.VISIBLE : View.GONE);
        btnFechar.setEnabled(PagamentosMisto.podeFechar(totalVenda, lancamentos));
    }

    private String tituloMeio(MeioPagamento meio) {
        if (meio == MeioPagamento.PIX) {
            return getString(R.string.pix);
        }
        if (meio == MeioPagamento.CARTAO) {
            return getString(R.string.cartao);
        }
        return getString(R.string.dinheiro);
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

    private boolean validarVendaAberta() {
        if (modoMesa) {
            if (idConta == null || idConta.isEmpty()) {
                Toast.makeText(this, R.string.conta_mesa_invalida, Toast.LENGTH_SHORT).show();
                finish();
                return false;
            }
            if (totalVenda.compareTo(BigDecimal.ZERO) <= 0) {
                Toast.makeText(this, R.string.comanda_vazia, Toast.LENGTH_SHORT).show();
                finish();
                return false;
            }
            return true;
        }
        if (Carrinho.getInstance().isVazio()) {
            Toast.makeText(this, R.string.carrinho_vazio, Toast.LENGTH_SHORT).show();
            finish();
            return false;
        }
        return true;
    }

    private void confirmarFechamento() {
        if (!validarVendaAberta()) {
            return;
        }
        PagamentosMisto.ResultadoFechamento fechamento;
        try {
            fechamento = PagamentosMisto.validarFechamento(totalVenda, lancamentos, null);
        } catch (IllegalArgumentException e) {
            Toast.makeText(this, e.getMessage(), Toast.LENGTH_LONG).show();
            return;
        }

        setLoading(true);
        List<ItemCarrinho> snapshot =
                modoMesa ? null : new ArrayList<>(Carrinho.getInstance().getItens());
        boolean imprimirFichas = prefs.isImprimirFichasEvento();
        final String idClienteVenda = identidadeCliente;
        final String nomeClienteVenda = nomeCliente;
        final String docClienteVenda = docCliente;
        final List<LancamentoPagamento> pags = new ArrayList<>(fechamento.efetivos);
        final BigDecimal troco = fechamento.troco;

        executor.execute(() -> {
            try {
                ArrayList<ItemFicha> fichas = new ArrayList<>();
                if (imprimirFichas && !modoMesa && snapshot != null) {
                    fichas.addAll(ItemFicha.deCarrinho(snapshot));
                }

                if (!prefs.isModoPdvLocal() && !outboxSync.temRede()) {
                    if (modoMesa) {
                        throw new ApiException(getString(R.string.fechar_mesa_requer_rede));
                    }
                    outboxSync.enfileirarVenda(snapshot, pags, troco);
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
                        ? api.fecharContaMesa(idConta, pags, troco, idClienteVenda)
                        : api.criarVendaPdvRapida(
                                snapshot, pags, troco, idClienteVenda, nomeClienteVenda, docClienteVenda);

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
        btnFechar.setEnabled(!loading && PagamentosMisto.podeFechar(totalVenda, lancamentos));
        for (int i = 0; i < listaLancamentos.getChildCount(); i++) {
            View row = listaLancamentos.getChildAt(i);
            View remover = row.findViewById(R.id.btnRemoverLancamento);
            if (remover != null) {
                remover.setEnabled(!loading);
            }
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        executor.shutdownNow();
    }
}
