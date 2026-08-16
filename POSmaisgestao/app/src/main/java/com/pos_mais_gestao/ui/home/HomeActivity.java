package com.pos_mais_gestao.ui.home;

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
import androidx.annotation.NonNull;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import com.google.android.material.appbar.MaterialToolbar;
import com.google.android.material.button.MaterialButton;
import com.google.android.material.textfield.TextInputEditText;
import com.pos_mais_gestao.PosApplication;
import com.pos_mais_gestao.R;
import com.pos_mais_gestao.data.api.ApiClient;
import com.pos_mais_gestao.data.api.ApiException;
import com.pos_mais_gestao.data.api.FechamentoCaixaDto;
import com.pos_mais_gestao.data.local.PrefsStore;
import com.pos_mais_gestao.data.sync.OutboxSync;
import com.pos_mais_gestao.domain.Carrinho;
import com.pos_mais_gestao.domain.Produto;
import com.pos_mais_gestao.domain.ResumoTurnoCaixa;
import com.pos_mais_gestao.hardware.ImpressoraPos;
import com.pos_mais_gestao.ui.atalhos.AtalhosActivity;
import com.pos_mais_gestao.ui.config.ConfigActivity;
import com.pos_mais_gestao.ui.empresa.EmpresaActivity;
import com.pos_mais_gestao.ui.login.LoginActivity;
import com.pos_mais_gestao.ui.mesas.MesasActivity;
import com.pos_mais_gestao.ui.produtos.ProdutosActivity;
import com.pos_mais_gestao.ui.venda.VendaActivity;
import com.pos_mais_gestao.ui.vendas.VendasActivity;
import com.pos_mais_gestao.util.FechamentoCaixaTexto;
import com.pos_mais_gestao.util.MoneyFormat;
import java.math.BigDecimal;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class HomeActivity extends AppCompatActivity {
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private PrefsStore prefs;
    private ApiClient api;
    private OutboxSync outboxSync;
    private TextView txtStatusCaixa;
    private TextView txtSyncPendente;
    private MaterialButton btnVenda;
    private MaterialButton btnMesas;
    private MaterialButton btnVendas;
    private MaterialButton btnFecharCaixaHome;
    private FechamentoCaixaDto caixaAberto;
    private boolean carregandoCaixa;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_home);

        PosApplication app = (PosApplication) getApplication();
        prefs = app.getPrefsStore();
        api = app.getApiClient();
        outboxSync = app.getOutboxSync();

        MaterialToolbar toolbar = findViewById(R.id.toolbarHome);
        setSupportActionBar(toolbar);
        toolbar.setTitle(R.string.brand_name);

        TextView txtEmpresa = findViewById(R.id.txtEmpresaHome);
        String nome = prefs.getEmpresaNome();
        txtEmpresa.setText(nome != null ? nome : "");

        txtStatusCaixa = findViewById(R.id.txtStatusCaixa);
        txtSyncPendente = findViewById(R.id.txtSyncPendente);
        btnVenda = findViewById(R.id.btnVendaRapida);
        btnMesas = findViewById(R.id.btnMesas);
        btnFecharCaixaHome = findViewById(R.id.btnFecharCaixaHome);
        btnVendas = findViewById(R.id.btnVendas);
        MaterialButton btnProdutos = findViewById(R.id.btnProdutos);
        aplicarModoLocalHome();

        btnVenda.setOnClickListener(v -> {
            if (prefs.isModoPdvLocal()) {
                Toast.makeText(this, R.string.cupom_somente_pdv, Toast.LENGTH_LONG).show();
                return;
            }
            if (caixaAberto == null) {
                Toast.makeText(this, R.string.abra_caixa_para_vender, Toast.LENGTH_SHORT).show();
                dialogAbrirCaixa();
                return;
            }
            startActivity(new Intent(this, VendaActivity.class));
        });
        btnMesas.setOnClickListener(v -> startActivity(new Intent(this, MesasActivity.class)));
        btnVendas.setOnClickListener(v -> startActivity(new Intent(this, VendasActivity.class)));
        btnProdutos.setOnClickListener(v -> startActivity(new Intent(this, ProdutosActivity.class)));
        btnFecharCaixaHome.setOnClickListener(v -> dialogFecharCaixa());
    }

    private void aplicarModoLocalHome() {
        boolean local = prefs.isModoPdvLocal();
        btnVenda.setVisibility(local ? View.GONE : View.VISIBLE);
        btnVendas.setVisibility(local ? View.GONE : View.VISIBLE);
        btnFecharCaixaHome.setVisibility(View.GONE);
        btnMesas.setText(prefs.isModeloComanda() ? R.string.comandas : R.string.mesas);
    }

    @Override
    protected void onResume() {
        super.onResume();
        atualizarSyncUi();
        carregarCaixa();
        sincronizarAtalhosEOutbox();
    }

    private void sincronizarAtalhosEOutbox() {
        executor.execute(() -> {
            try {
                if (!prefs.isModoPdvLocal()) {
                    outboxSync.processarPendentes();
                }
                List<Produto> remotos = api.listarAtalhosRemotos();
                if (!remotos.isEmpty() || prefs.getAtalhos().isEmpty()) {
                    prefs.setAtalhos(remotos);
                }
            } catch (Exception ignored) {
            }
            runOnUiThread(this::atualizarSyncUi);
        });
    }

    private void atualizarSyncUi() {
        if (prefs.isModoPdvLocal()) {
            txtSyncPendente.setVisibility(View.GONE);
            return;
        }
        int pendentes = outboxSync.getDb().contarPendentes();
        if (pendentes > 0) {
            txtSyncPendente.setVisibility(View.VISIBLE);
            txtSyncPendente.setText(getString(R.string.sync_pendente, pendentes));
        } else {
            txtSyncPendente.setVisibility(View.GONE);
        }
    }

    private void carregarCaixa() {
        carregandoCaixa = true;
        txtStatusCaixa.setText("Verificando caixa…");
        executor.execute(() -> {
            try {
                FechamentoCaixaDto caixa = api.buscarCaixaAberto();
                runOnUiThread(() -> {
                    carregandoCaixa = false;
                    caixaAberto = caixa;
                    atualizarStatusCaixaUi();
                });
            } catch (ApiException e) {
                runOnUiThread(() -> {
                    carregandoCaixa = false;
                    caixaAberto = null;
                    txtStatusCaixa.setText(e.getMessage());
                    aplicarModoLocalHome();
                });
            }
        });
    }

    private void atualizarStatusCaixaUi() {
        if (caixaAberto != null) {
            String status = getString(R.string.caixa_aberto) + " · PDV " + prefs.getNumeroPdv();
            if (prefs.isModoPdvLocal()) {
                status = status + " — " + getString(R.string.caixa_somente_pdv);
            }
            txtStatusCaixa.setText(status);
            btnVenda.setEnabled(true);
            btnMesas.setEnabled(true);
            aplicarModoLocalHome();
            if (!prefs.isModoPdvLocal()) {
                btnFecharCaixaHome.setVisibility(View.VISIBLE);
            }
        } else {
            txtStatusCaixa.setText(prefs.isModoPdvLocal()
                    ? getString(R.string.caixa_fechado) + " — " + getString(R.string.pos_local_ajuda)
                    : getString(R.string.caixa_fechado) + " — " + getString(R.string.abra_caixa_para_vender));
            btnVenda.setEnabled(true);
            btnMesas.setEnabled(true);
            aplicarModoLocalHome();
        }
        invalidateOptionsMenu();
    }

    private void dialogAbrirCaixa() {
        if (prefs.isModoPdvLocal()) {
            Toast.makeText(this, R.string.abra_caixa_no_pdv, Toast.LENGTH_LONG).show();
            return;
        }
        if (caixaAberto != null) {
            Toast.makeText(this, R.string.caixa_ja_aberto, Toast.LENGTH_SHORT).show();
            return;
        }
        View view = LayoutInflater.from(this).inflate(R.layout.dialog_valor, null);
        TextInputEditText input = view.findViewById(R.id.inputValor);
        input.setText("0");
        new AlertDialog.Builder(this)
                .setTitle(R.string.abrir_caixa)
                .setView(view)
                .setPositiveButton(R.string.abrir_caixa, (d, w) -> {
                    String valor = input.getText() == null ? "0" : input.getText().toString().trim();
                    if (valor.isEmpty()) {
                        valor = "0";
                    }
                    abrirCaixa(valor.replace(",", "."));
                })
                .setNegativeButton(R.string.cancelar, null)
                .show();
    }

    private void dialogFecharCaixa() {
        if (prefs.isModoPdvLocal()) {
            Toast.makeText(this, R.string.caixa_somente_pdv, Toast.LENGTH_LONG).show();
            return;
        }
        if (caixaAberto == null || caixaAberto.id == null) {
            Toast.makeText(this, R.string.caixa_fechado, Toast.LENGTH_SHORT).show();
            return;
        }

        View view = LayoutInflater.from(this).inflate(R.layout.dialog_fechar_caixa, null);
        ProgressBar progress = view.findViewById(R.id.progressResumoCaixa);
        View blocoResumo = view.findViewById(R.id.blocoResumoCaixa);
        TextView txtErro = view.findViewById(R.id.txtErroResumoCaixa);
        TextView txtSuprimento = view.findViewById(R.id.txtResumoSuprimento);
        TextView txtTotalVendas = view.findViewById(R.id.txtResumoTotalVendas);
        TextView txtQtdVendas = view.findViewById(R.id.txtResumoQtdVendas);
        TextView txtDinheiro = view.findViewById(R.id.txtResumoDinheiro);
        TextView txtCartao = view.findViewById(R.id.txtResumoCartao);
        TextView txtPix = view.findViewById(R.id.txtResumoPix);
        TextView txtPrepago = view.findViewById(R.id.txtResumoPrepago);
        TextView txtSaldoGaveta = view.findViewById(R.id.txtResumoSaldoGaveta);
        TextView txtDiferenca = view.findViewById(R.id.txtDiferencaCaixa);
        TextInputEditText inputSaldo = view.findViewById(R.id.inputSaldoInformado);
        TextInputEditText inputObs = view.findViewById(R.id.inputObservacaoFechamento);

        inputSaldo.setText("0");
        progress.setVisibility(View.VISIBLE);
        blocoResumo.setVisibility(View.GONE);
        txtErro.setVisibility(View.GONE);

        final FechamentoCaixaDto caixa = caixaAberto;
        final ResumoTurnoCaixa[] resumoRef = new ResumoTurnoCaixa[1];

        AlertDialog dialog = new AlertDialog.Builder(this)
                .setTitle(R.string.fechar_caixa)
                .setView(view)
                .setPositiveButton(R.string.fechar_caixa, null)
                .setNeutralButton(R.string.imprimir_fechamento, null)
                .setNegativeButton(R.string.cancelar, null)
                .create();

        dialog.setOnShowListener(d -> {
            dialog.getButton(AlertDialog.BUTTON_POSITIVE).setEnabled(false);
            dialog.getButton(AlertDialog.BUTTON_NEUTRAL).setEnabled(false);

            dialog.getButton(AlertDialog.BUTTON_NEUTRAL).setOnClickListener(v -> {
                ResumoTurnoCaixa resumo = resumoRef[0];
                if (resumo == null) {
                    return;
                }
                String saldoStr = inputSaldo.getText() == null
                        ? "0"
                        : inputSaldo.getText().toString().trim();
                BigDecimal saldoInformado = MoneyFormat.parse(saldoStr.replace(",", "."));
                String obs = inputObs.getText() == null ? null : inputObs.getText().toString();
                imprimirFechamento(resumo, saldoInformado, obs);
            });

            dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v -> {
                ResumoTurnoCaixa resumo = resumoRef[0];
                if (resumo == null) {
                    return;
                }
                String saldoStr = inputSaldo.getText() == null
                        ? "0"
                        : inputSaldo.getText().toString().trim();
                if (saldoStr.isEmpty()) {
                    saldoStr = "0";
                }
                BigDecimal saldoInformado = MoneyFormat.parse(saldoStr.replace(",", "."));
                BigDecimal diferenca = saldoInformado.subtract(resumo.saldoCaixaFisico);
                BigDecimal sobra = diferenca.max(BigDecimal.ZERO);
                BigDecimal falta = diferenca.negate().max(BigDecimal.ZERO);
                String obs = inputObs.getText() == null ? null : inputObs.getText().toString();
                dialog.dismiss();
                fecharCaixa(
                        caixa.id,
                        MoneyFormat.toApi(saldoInformado),
                        MoneyFormat.toApi(resumo.saldoapurado),
                        MoneyFormat.toApi(sobra),
                        MoneyFormat.toApi(falta),
                        obs);
            });
        });
        dialog.show();

        TextWatcher diferencaWatcher = new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {}

            @Override
            public void afterTextChanged(Editable s) {
                atualizarDiferencaUi(resumoRef[0], s == null ? "" : s.toString(), txtDiferenca);
            }
        };
        inputSaldo.addTextChangedListener(diferencaWatcher);

        executor.execute(() -> {
            try {
                ResumoTurnoCaixa resumo = api.calcularResumoTurno(caixa);
                runOnUiThread(() -> {
                    if (isFinishing()) {
                        return;
                    }
                    resumoRef[0] = resumo;
                    progress.setVisibility(View.GONE);
                    blocoResumo.setVisibility(View.VISIBLE);
                    txtErro.setVisibility(View.GONE);

                    txtSuprimento.setText(MoneyFormat.format(resumo.suprimento));
                    txtTotalVendas.setText(MoneyFormat.format(resumo.totalVendas));
                    String labelQtd = resumo.qtdVendas == 1
                            ? getString(R.string.venda_singular)
                            : getString(R.string.venda_plural);
                    txtQtdVendas.setText(getString(R.string.qtd_vendas_turno, resumo.qtdVendas, labelQtd));
                    txtDinheiro.setText(MoneyFormat.format(resumo.pagamentos.dinheiro));
                    txtCartao.setText(MoneyFormat.format(resumo.pagamentos.cartao));
                    txtPix.setText(MoneyFormat.format(resumo.pagamentos.pix));
                    txtPrepago.setText(MoneyFormat.format(resumo.pagamentos.prepago));
                    txtSaldoGaveta.setText(MoneyFormat.format(resumo.saldoCaixaFisico));

                    if (dialog.isShowing()) {
                        dialog.getButton(AlertDialog.BUTTON_POSITIVE).setEnabled(true);
                        dialog.getButton(AlertDialog.BUTTON_NEUTRAL).setEnabled(true);
                    }
                    atualizarDiferencaUi(
                            resumo,
                            inputSaldo.getText() == null ? "" : inputSaldo.getText().toString(),
                            txtDiferenca);
                });
            } catch (ApiException e) {
                runOnUiThread(() -> {
                    if (isFinishing()) {
                        return;
                    }
                    progress.setVisibility(View.GONE);
                    blocoResumo.setVisibility(View.GONE);
                    txtErro.setVisibility(View.VISIBLE);
                    txtErro.setText(e.getMessage() != null
                            ? e.getMessage()
                            : getString(R.string.erro_resumo_caixa));
                    if (dialog.isShowing()) {
                        dialog.getButton(AlertDialog.BUTTON_POSITIVE).setEnabled(false);
                        dialog.getButton(AlertDialog.BUTTON_NEUTRAL).setEnabled(false);
                    }
                });
            }
        });
    }

    private void imprimirFechamento(ResumoTurnoCaixa resumo, BigDecimal saldoInformado, String observacao) {
        String texto = FechamentoCaixaTexto.montar(
                prefs.getEmpresaNome(),
                prefs.getNumeroPdv(),
                resumo,
                saldoInformado,
                observacao);
        try {
            ImpressoraPos impressora = ((PosApplication) getApplication()).getImpressoraPos();
            impressora.imprimirTexto(texto);
            Toast.makeText(this, R.string.fechamento_enviado, Toast.LENGTH_SHORT).show();
        } catch (Exception e) {
            Toast.makeText(
                            this,
                            e.getMessage() != null ? e.getMessage() : getString(R.string.erro_imprimir_fechamento),
                            Toast.LENGTH_LONG)
                    .show();
        }
    }

    private void atualizarDiferencaUi(ResumoTurnoCaixa resumo, String saldoTexto, TextView txtDiferenca) {
        if (resumo == null || saldoTexto == null || saldoTexto.trim().isEmpty()) {
            txtDiferenca.setVisibility(View.GONE);
            return;
        }
        BigDecimal saldoInformado = MoneyFormat.parse(saldoTexto.replace(",", "."));
        BigDecimal diferenca = saldoInformado.subtract(resumo.saldoCaixaFisico);
        txtDiferenca.setVisibility(View.VISIBLE);
        if (diferenca.compareTo(BigDecimal.ZERO) == 0) {
            txtDiferenca.setText(R.string.caixa_conferido);
            txtDiferenca.setTextColor(getResources().getColor(R.color.dinheiro, getTheme()));
        } else if (diferenca.compareTo(BigDecimal.ZERO) > 0) {
            txtDiferenca.setText(getString(R.string.caixa_sobra, MoneyFormat.format(diferenca)));
            txtDiferenca.setTextColor(getResources().getColor(R.color.pix, getTheme()));
        } else {
            txtDiferenca.setText(getString(R.string.caixa_falta, MoneyFormat.format(diferenca.negate())));
            txtDiferenca.setTextColor(getResources().getColor(R.color.danger, getTheme()));
        }
    }

    private void abrirCaixa(String suprimento) {
        executor.execute(() -> {
            try {
                FechamentoCaixaDto caixa = api.abrirCaixa(suprimento);
                runOnUiThread(() -> {
                    caixaAberto = caixa;
                    atualizarStatusCaixaUi();
                    Toast.makeText(this, R.string.caixa_aberto, Toast.LENGTH_SHORT).show();
                });
            } catch (ApiException e) {
                runOnUiThread(() -> Toast.makeText(this, e.getMessage(), Toast.LENGTH_LONG).show());
            }
        });
    }

    private void fecharCaixa(
            long id,
            String saldoInformado,
            String saldoApurado,
            String sobra,
            String falta,
            String observacao) {
        executor.execute(() -> {
            try {
                api.fecharCaixa(id, saldoInformado, saldoApurado, sobra, falta, observacao);
                runOnUiThread(() -> {
                    caixaAberto = null;
                    atualizarStatusCaixaUi();
                    Toast.makeText(this, R.string.caixa_fechado, Toast.LENGTH_SHORT).show();
                });
            } catch (ApiException e) {
                runOnUiThread(() -> Toast.makeText(this, e.getMessage(), Toast.LENGTH_LONG).show());
            }
        });
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        getMenuInflater().inflate(R.menu.menu_home, menu);
        return true;
    }

    @Override
    public boolean onPrepareOptionsMenu(Menu menu) {
        boolean local = prefs.isModoPdvLocal();
        boolean aberto = caixaAberto != null;
        MenuItem abrir = menu.findItem(R.id.action_abrir_caixa);
        MenuItem fechar = menu.findItem(R.id.action_fechar_caixa);
        if (abrir != null) {
            abrir.setVisible(!local && !aberto);
        }
        if (fechar != null) {
            fechar.setVisible(!local && aberto);
        }
        return super.onPrepareOptionsMenu(menu);
    }

    @Override
    public boolean onOptionsItemSelected(@NonNull MenuItem item) {
        int id = item.getItemId();
        if (id == R.id.action_abrir_caixa) {
            dialogAbrirCaixa();
            return true;
        }
        if (id == R.id.action_fechar_caixa) {
            dialogFecharCaixa();
            return true;
        }
        if (id == R.id.action_atalhos) {
            startActivity(new Intent(this, AtalhosActivity.class));
            return true;
        }
        if (id == R.id.action_config) {
            startActivity(new Intent(this, ConfigActivity.class));
            return true;
        }
        if (id == R.id.action_trocar_empresa) {
            Carrinho.getInstance().limpar();
            prefs.clearEmpresa();
            Intent intent = new Intent(this, EmpresaActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
            startActivity(intent);
            finish();
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
    }
}
