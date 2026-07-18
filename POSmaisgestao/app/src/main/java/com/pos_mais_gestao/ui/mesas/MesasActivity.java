package com.pos_mais_gestao.ui.mesas;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.GridLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.google.android.material.appbar.MaterialToolbar;
import com.google.android.material.floatingactionbutton.FloatingActionButton;
import com.pos_mais_gestao.PosApplication;
import com.pos_mais_gestao.R;
import com.pos_mais_gestao.data.api.ApiClient;
import com.pos_mais_gestao.data.api.ApiException;
import com.pos_mais_gestao.data.api.ContaMesaDto;
import com.pos_mais_gestao.data.local.PrefsStore;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MesasActivity extends AppCompatActivity {
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private PrefsStore prefs;
    private ApiClient api;
    private MesaAdapter adapter;
    private ProgressBar progress;
    private TextView txtSemMesas;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_mesas);

        PosApplication app = (PosApplication) getApplication();
        prefs = app.getPrefsStore();
        api = app.getApiClient();

        MaterialToolbar toolbar = findViewById(R.id.toolbarMesas);
        setSupportActionBar(toolbar);
        toolbar.setNavigationOnClickListener(v -> finish());

        progress = findViewById(R.id.progressMesas);
        txtSemMesas = findViewById(R.id.txtSemMesas);
        txtSemMesas.setText(R.string.mesas);

        adapter = new MesaAdapter(this::aoClicarMesa);
        RecyclerView lista = findViewById(R.id.listaMesas);
        lista.setLayoutManager(new GridLayoutManager(this, 3));
        lista.setAdapter(adapter);

        FloatingActionButton fab = findViewById(R.id.fabNovaMesa);
        fab.setVisibility(View.GONE);
    }

    @Override
    protected void onResume() {
        super.onResume();
        carregar();
    }

    private void carregar() {
        progress.setVisibility(View.VISIBLE);
        executor.execute(() -> {
            try {
                List<ContaMesaDto> abertas = api.listarMesasAbertas();
                Map<Integer, ContaMesaDto> porNumero = new HashMap<>();
                for (ContaMesaDto mesa : abertas) {
                    if (mesa.numeromesa != null) {
                        porNumero.put(mesa.numeromesa, mesa);
                    }
                }
                int qtd = prefs.getQuantidadeMesas();
                List<MesaGradeItem> grade = new ArrayList<>();
                for (int i = 1; i <= qtd; i++) {
                    grade.add(new MesaGradeItem(i, porNumero.get(i)));
                }
                runOnUiThread(() -> {
                    progress.setVisibility(View.GONE);
                    adapter.setItens(grade);
                    txtSemMesas.setVisibility(View.GONE);
                });
            } catch (ApiException e) {
                runOnUiThread(() -> {
                    progress.setVisibility(View.GONE);
                    Toast.makeText(this, e.getMessage(), Toast.LENGTH_LONG).show();
                });
            }
        });
    }

    private void aoClicarMesa(MesaGradeItem item) {
        if (item.isOcupada()) {
            abrirConta(item.conta);
            return;
        }
        progress.setVisibility(View.VISIBLE);
        executor.execute(() -> {
            try {
                ContaMesaDto mesa = api.abrirMesa(item.numero);
                runOnUiThread(() -> {
                    progress.setVisibility(View.GONE);
                    abrirConta(mesa);
                });
            } catch (ApiException e) {
                runOnUiThread(() -> {
                    progress.setVisibility(View.GONE);
                    Toast.makeText(this, e.getMessage(), Toast.LENGTH_LONG).show();
                });
            }
        });
    }

    private void abrirConta(ContaMesaDto mesa) {
        Intent intent = new Intent(this, ContaMesaActivity.class);
        intent.putExtra(ContaMesaActivity.EXTRA_ID_CONTA, mesa.id);
        intent.putExtra(ContaMesaActivity.EXTRA_NUMERO_MESA, mesa.numeromesa != null ? mesa.numeromesa : 0);
        startActivity(intent);
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        executor.shutdownNow();
    }
}
