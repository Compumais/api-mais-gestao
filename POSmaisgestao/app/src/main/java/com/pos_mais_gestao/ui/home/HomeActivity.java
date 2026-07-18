package com.pos_mais_gestao.ui.home;

import android.content.Intent;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
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
import com.pos_mais_gestao.ui.atalhos.AtalhosActivity;
import com.pos_mais_gestao.ui.config.ConfigActivity;
import com.pos_mais_gestao.ui.login.LoginActivity;
import com.pos_mais_gestao.ui.mesas.MesasActivity;
import com.pos_mais_gestao.ui.venda.VendaActivity;
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

        btnVenda.setOnClickListener(v -> {
            if (caixaAberto == null) {
                Toast.makeText(this, R.string.abra_caixa_para_vender, Toast.LENGTH_SHORT).show();
                dialogAbrirCaixa();
                return;
            }
            startActivity(new Intent(this, VendaActivity.class));
        });
        btnMesas.setOnClickListener(v -> startActivity(new Intent(this, MesasActivity.class)));
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
                outboxSync.processarPendentes();
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
                });
            }
        });
    }

    private void atualizarStatusCaixaUi() {
        if (caixaAberto != null) {
            txtStatusCaixa.setText(getString(R.string.caixa_aberto) + " · PDV " + prefs.getNumeroPdv());
            btnVenda.setEnabled(true);
            btnMesas.setEnabled(true);
        } else {
            txtStatusCaixa.setText(getString(R.string.caixa_fechado) + " — " + getString(R.string.abra_caixa_para_vender));
            btnVenda.setEnabled(true);
            btnMesas.setEnabled(true);
        }
    }

    private void dialogAbrirCaixa() {
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
        if (caixaAberto == null || caixaAberto.id == null) {
            Toast.makeText(this, R.string.caixa_fechado, Toast.LENGTH_SHORT).show();
            return;
        }
        View view = LayoutInflater.from(this).inflate(R.layout.dialog_valor, null);
        com.google.android.material.textfield.TextInputLayout layout = view.findViewById(R.id.layoutValor);
        layout.setHint(getString(R.string.saldo_informado));
        TextInputEditText input = view.findViewById(R.id.inputValor);
        input.setText("0");
        final long idCaixa = caixaAberto.id;
        new AlertDialog.Builder(this)
                .setTitle(R.string.fechar_caixa)
                .setView(view)
                .setPositiveButton(R.string.fechar_caixa, (d, w) -> {
                    String valor = input.getText() == null ? "0" : input.getText().toString().trim();
                    if (valor.isEmpty()) {
                        valor = "0";
                    }
                    fecharCaixa(idCaixa, valor.replace(",", "."));
                })
                .setNegativeButton(R.string.cancelar, null)
                .show();
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

    private void fecharCaixa(long id, String saldo) {
        executor.execute(() -> {
            try {
                api.fecharCaixa(id, saldo, null);
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
