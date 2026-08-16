package com.pos_mais_gestao.ui.mesas;

import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.LayoutInflater;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
import android.widget.RadioGroup;
import android.widget.TextView;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.GridLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.google.android.material.appbar.MaterialToolbar;
import com.google.android.material.textfield.TextInputEditText;
import com.pos_mais_gestao.PosApplication;
import com.pos_mais_gestao.R;
import com.pos_mais_gestao.data.api.ApiClient;
import com.pos_mais_gestao.data.api.ApiException;
import com.pos_mais_gestao.data.api.ContaMesaDto;
import com.pos_mais_gestao.data.local.PrefsStore;
import com.pos_mais_gestao.ui.OfflineBanner;
import com.pos_mais_gestao.ui.config.ConfigActivity;
import com.pos_mais_gestao.ui.pedido.PedidoActivity;
import com.pos_mais_gestao.ui.pedido.PedidosActivity;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MesasActivity extends AppCompatActivity {
    private static final long POLL_MS = 4000;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final Handler pollHandler = new Handler(Looper.getMainLooper());
    private final Runnable pollTick = this::pollOnce;
    private final List<MesaGradeItem> todas = new ArrayList<>();
    private PrefsStore prefs;
    private ApiClient api;
    private MesaAdapter adapter;
    private TextView txtSemMesas;
    private View blocoAcoesLocal;
    private String filtro = "all";
    private String busca = "";
    private boolean online = true;
    private volatile boolean syncing;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_mesas);

        PosApplication app = (PosApplication) getApplication();
        prefs = app.getPrefsStore();
        api = app.getApiClient();

        MaterialToolbar toolbar = findViewById(R.id.toolbarMesas);
        setSupportActionBar(toolbar);
        String nome = prefs.getUserName();
        toolbar.setTitle(getString(R.string.ola_usuario, nome != null && !nome.isEmpty() ? nome : "Operador"));

        blocoAcoesLocal = findViewById(R.id.blocoAcoesLocal);
        blocoAcoesLocal.setVisibility(prefs.isModoPdvLocal() ? View.VISIBLE : View.GONE);
        findViewById(R.id.btnCardapio).setOnClickListener(v -> {
            Intent i = new Intent(this, PedidoActivity.class);
            i.putExtra(PedidoActivity.EXTRA_BROWSE_ONLY, true);
            startActivity(i);
        });
        findViewById(R.id.btnPedidos).setOnClickListener(v ->
                startActivity(new Intent(this, PedidosActivity.class)));

        txtSemMesas = findViewById(R.id.txtSemMesas);
        adapter = new MesaAdapter(new MesaAdapter.OnMesaClick() {
            @Override
            public void onClick(MesaGradeItem mesa) {
                aoClicarMesa(mesa);
            }

            @Override
            public void onLongClick(MesaGradeItem mesa) {
                dialogTrocarNome(mesa);
            }
        }, prefs.isModeloComanda());
        RecyclerView lista = findViewById(R.id.listaMesas);
        lista.setLayoutManager(new GridLayoutManager(this, 3));
        lista.setAdapter(adapter);

        TextInputEditText search = findViewById(R.id.inputSearch);
        search.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                busca = s == null ? "" : s.toString();
                aplicarFiltro();
            }

            @Override public void afterTextChanged(Editable s) {}
        });
        RadioGroup rg = findViewById(R.id.filterStatus);
        rg.setOnCheckedChangeListener((g, id) -> {
            if (id == R.id.filterLivre) {
                filtro = "livre";
            } else if (id == R.id.filterOcupada) {
                filtro = "ocupada";
            } else {
                filtro = "all";
            }
            aplicarFiltro();
        });
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        getMenuInflater().inflate(R.menu.menu_mesas, menu);
        return true;
    }

    @Override
    public boolean onOptionsItemSelected(@NonNull MenuItem item) {
        if (item.getItemId() == R.id.action_config) {
            startActivity(new Intent(this, ConfigActivity.class));
            return true;
        }
        return super.onOptionsItemSelected(item);
    }

    @Override
    protected void onResume() {
        super.onResume();
        adapter.setModeloComanda(prefs.isModeloComanda());
        carregar(false);
        if (prefs.isModoPdvLocal()) {
            pollHandler.removeCallbacks(pollTick);
            pollHandler.postDelayed(pollTick, POLL_MS);
        }
    }

    @Override
    protected void onPause() {
        pollHandler.removeCallbacks(pollTick);
        super.onPause();
    }

    private void pollOnce() {
        carregar(false);
        pollHandler.postDelayed(pollTick, POLL_MS);
    }

    private void carregar(boolean showError) {
        if (syncing) {
            return;
        }
        syncing = true;
        executor.execute(() -> {
            try {
                if (prefs.isModoPdvLocal()) {
                    try {
                        api.buscarCaixaAberto();
                    } catch (ApiException ignored) {
                    }
                }
                List<ContaMesaDto> gradeDto = api.listarMesasGrade();
                List<MesaGradeItem> grade = new ArrayList<>();
                for (ContaMesaDto mesa : gradeDto) {
                    if (mesa.numeromesa == null) {
                        continue;
                    }
                    grade.add(new MesaGradeItem(mesa.numeromesa, mesa.id != null ? mesa : null));
                }
                runOnUiThread(() -> {
                    syncing = false;
                    online = true;
                    OfflineBanner.bind(this, true, null);
                    todas.clear();
                    todas.addAll(grade);
                    aplicarFiltro();
                });
            } catch (ApiException e) {
                runOnUiThread(() -> {
                    syncing = false;
                    online = false;
                    OfflineBanner.bind(this, false, e.getMessage());
                    if (showError) {
                        Toast.makeText(this, e.getMessage(), Toast.LENGTH_LONG).show();
                    }
                });
            }
        });
    }

    private void aplicarFiltro() {
        List<MesaGradeItem> shown = new ArrayList<>();
        String q = busca.toLowerCase(Locale.ROOT).trim();
        for (MesaGradeItem item : todas) {
            boolean ocupada = item.isOcupada();
            if ("livre".equals(filtro) && ocupada) {
                continue;
            }
            if ("ocupada".equals(filtro) && !ocupada) {
                continue;
            }
            String hay = String.valueOf(item.numero);
            if (item.conta != null && item.conta.observacao != null) {
                hay = hay + " " + item.conta.observacao;
            }
            if (!q.isEmpty() && !hay.toLowerCase(Locale.ROOT).contains(q)) {
                continue;
            }
            shown.add(item);
        }
        adapter.setItens(shown);
        txtSemMesas.setVisibility(shown.isEmpty() ? View.VISIBLE : View.GONE);
    }

    private void aoClicarMesa(MesaGradeItem item) {
        if (prefs.isModoPdvLocal() && !online) {
            Toast.makeText(this, R.string.sem_conexao_servidor, Toast.LENGTH_SHORT).show();
            return;
        }
        if (item.isOcupada()) {
            if (prefs.isModoPdvLocal()) {
                abrirPedido(item.conta, false);
            } else {
                abrirContaCloud(item.conta);
            }
            return;
        }
        if (prefs.isModoPdvLocal()) {
            Intent intent = new Intent(this, OccupyActivity.class);
            intent.putExtra(OccupyActivity.EXTRA_NUMERO, item.numero);
            startActivity(intent);
        } else {
            dialogAbrirMesaCloud(item.numero);
        }
    }

    private void abrirPedido(ContaMesaDto mesa, boolean browse) {
        Intent intent = new Intent(this, PedidoActivity.class);
        intent.putExtra(PedidoActivity.EXTRA_ID_CONTA, mesa.id);
        intent.putExtra(PedidoActivity.EXTRA_NUMERO, mesa.numeromesa != null ? mesa.numeromesa : 0);
        intent.putExtra(PedidoActivity.EXTRA_NOME, mesa.observacao);
        intent.putExtra(PedidoActivity.EXTRA_BROWSE_ONLY, browse);
        startActivity(intent);
    }

    private void abrirContaCloud(ContaMesaDto mesa) {
        Intent intent = new Intent(this, ContaMesaActivity.class);
        intent.putExtra(ContaMesaActivity.EXTRA_ID_CONTA, mesa.id);
        intent.putExtra(ContaMesaActivity.EXTRA_NUMERO_MESA, mesa.numeromesa != null ? mesa.numeromesa : 0);
        if (mesa.observacao != null && !mesa.observacao.trim().isEmpty()) {
            intent.putExtra(ContaMesaActivity.EXTRA_NOME_CLIENTE, mesa.observacao.trim());
        }
        startActivity(intent);
    }

    private void dialogAbrirMesaCloud(int numeroMesa) {
        View view = LayoutInflater.from(this).inflate(R.layout.dialog_nome_cliente_mesa, null);
        TextView txtMesa = view.findViewById(R.id.txtMesaDialog);
        TextInputEditText inputNome = view.findViewById(R.id.inputNomeClienteMesa);
        txtMesa.setText(getString(prefs.isModeloComanda() ? R.string.comanda_n : R.string.mesa_n, numeroMesa));
        new AlertDialog.Builder(this)
                .setTitle(prefs.isModeloComanda() ? R.string.abrir_comanda : R.string.abrir_mesa)
                .setView(view)
                .setPositiveButton(prefs.isModeloComanda() ? R.string.abrir_comanda : R.string.abrir_mesa, (d, w) -> {
                    String nome = inputNome.getText() == null ? "" : inputNome.getText().toString().trim();
                    executor.execute(() -> {
                        try {
                            ContaMesaDto mesa = api.abrirMesa(numeroMesa, nome);
                            runOnUiThread(() -> abrirContaCloud(mesa));
                        } catch (ApiException e) {
                            runOnUiThread(() ->
                                    Toast.makeText(this, e.getMessage(), Toast.LENGTH_LONG).show());
                        }
                    });
                })
                .setNegativeButton(R.string.cancelar, null)
                .show();
    }

    private void dialogTrocarNome(MesaGradeItem item) {
        if (!item.isOcupada()) {
            return;
        }
        if (prefs.isModoPdvLocal() && !online) {
            Toast.makeText(this, R.string.sem_conexao_servidor, Toast.LENGTH_SHORT).show();
            return;
        }
        View dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_trocar_nome, null);
        TextInputEditText input = dialogView.findViewById(R.id.inputName);
        String current = item.conta.observacao == null || item.conta.observacao.isEmpty()
                ? "Cliente"
                : item.conta.observacao;
        input.setText(current);
        if (input.getText() != null) {
            input.setSelection(input.getText().length());
        }
        String rotulo = getString(prefs.isModeloComanda() ? R.string.comanda_n : R.string.mesa_n, item.numero);
        new AlertDialog.Builder(this)
                .setTitle(getString(R.string.trocar_nome) + " — " + rotulo)
                .setView(dialogView)
                .setNegativeButton(R.string.cancelar, null)
                .setPositiveButton(R.string.salvar, (d, w) -> {
                    String name = input.getText() == null ? "" : input.getText().toString().trim();
                    if (name.isEmpty()) {
                        Toast.makeText(this, R.string.informe_nome_cliente, Toast.LENGTH_SHORT).show();
                        return;
                    }
                    executor.execute(() -> {
                        try {
                            api.atualizarNomeClienteMesa(item.conta.id, name);
                            runOnUiThread(() -> {
                                Toast.makeText(this, R.string.nome_atualizado, Toast.LENGTH_SHORT).show();
                                carregar(false);
                            });
                        } catch (ApiException e) {
                            runOnUiThread(() ->
                                    Toast.makeText(this, e.getMessage(), Toast.LENGTH_LONG).show());
                        }
                    });
                })
                .show();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        pollHandler.removeCallbacks(pollTick);
        executor.shutdownNow();
    }
}
