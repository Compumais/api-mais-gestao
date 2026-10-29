package com.pos_mais_gestao.ui.vendas;

import android.app.DatePickerDialog;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.google.android.material.appbar.MaterialToolbar;
import com.google.android.material.button.MaterialButton;
import com.google.android.material.button.MaterialButtonToggleGroup;
import com.google.android.material.switchmaterial.SwitchMaterial;
import com.pos_mais_gestao.PosApplication;
import com.pos_mais_gestao.R;
import com.pos_mais_gestao.data.api.ApiClient;
import com.pos_mais_gestao.data.api.ApiException;
import com.pos_mais_gestao.data.api.PaginaVendas;
import com.pos_mais_gestao.data.api.VendaResumoDto;
import com.pos_mais_gestao.data.local.PrefsStore;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Locale;
import java.util.TimeZone;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class VendasActivity extends AppCompatActivity {
    private static final int LIMIT = 20;
    private static final TimeZone TZ_BR = TimeZone.getTimeZone("America/Sao_Paulo");

    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private PrefsStore prefs;
    private ApiClient api;
    private VendaAdapter adapter;

    private ProgressBar progress;
    private TextView txtSemVendas;
    private MaterialButton btnDataInicio;
    private MaterialButton btnDataFim;
    private MaterialButton btnCarregarMais;
    private MaterialButtonToggleGroup grupoTipo;
    private SwitchMaterial switchSomentePdv;

    private String dataInicio;
    private String dataFim;
    private int paginaAtual = 1;
    private boolean temMais;
    private boolean carregando;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_vendas);

        PosApplication app = (PosApplication) getApplication();
        prefs = app.getPrefsStore();
        api = app.getApiClient();

        MaterialToolbar toolbar = findViewById(R.id.toolbarVendas);
        setSupportActionBar(toolbar);
        toolbar.setNavigationOnClickListener(v -> finish());

        progress = findViewById(R.id.progressVendas);
        txtSemVendas = findViewById(R.id.txtSemVendas);
        btnDataInicio = findViewById(R.id.btnDataInicio);
        btnDataFim = findViewById(R.id.btnDataFim);
        btnCarregarMais = findViewById(R.id.btnCarregarMaisVendas);
        grupoTipo = findViewById(R.id.grupoTipoVenda);
        switchSomentePdv = findViewById(R.id.switchSomentePdv);

        adapter = new VendaAdapter(this::abrirDetalhe);
        RecyclerView lista = findViewById(R.id.listaVendas);
        lista.setLayoutManager(new LinearLayoutManager(this));
        lista.setAdapter(adapter);

        Calendar hoje = Calendar.getInstance(TZ_BR);
        dataInicio = formatarIso(hoje);
        dataFim = dataInicio;
        atualizarBotoesData();

        if (!prefs.isEmitirNfcePos()) {
            grupoTipo.check(R.id.chipTipoDav);
        }

        switchSomentePdv.setChecked(true);
        atualizarVisibilidadePdv();

        grupoTipo.addOnButtonCheckedListener((group, checkedId, isChecked) -> {
            if (isChecked) {
                atualizarVisibilidadePdv();
            }
        });

        btnDataInicio.setOnClickListener(v -> escolherData(true));
        btnDataFim.setOnClickListener(v -> escolherData(false));
        findViewById(R.id.btnHoje).setOnClickListener(v -> {
            Calendar c = Calendar.getInstance(TZ_BR);
            dataInicio = formatarIso(c);
            dataFim = dataInicio;
            atualizarBotoesData();
            carregar(true);
        });
        findViewById(R.id.btnOntem).setOnClickListener(v -> {
            Calendar c = Calendar.getInstance(TZ_BR);
            c.add(Calendar.DAY_OF_MONTH, -1);
            dataInicio = formatarIso(c);
            dataFim = dataInicio;
            atualizarBotoesData();
            carregar(true);
        });
        findViewById(R.id.btnFiltrarVendas).setOnClickListener(v -> carregar(true));
        btnCarregarMais.setOnClickListener(v -> carregar(false));

        carregar(true);
    }

    private void atualizarVisibilidadePdv() {
        boolean pdv = grupoTipo.getCheckedButtonId() == R.id.chipTipoPdv;
        switchSomentePdv.setVisibility(pdv ? View.VISIBLE : View.GONE);
    }

    private void escolherData(boolean inicio) {
        Calendar base = Calendar.getInstance(TZ_BR);
        try {
            String ref = inicio ? dataInicio : dataFim;
            String[] partes = ref.split("-");
            base.set(Integer.parseInt(partes[0]), Integer.parseInt(partes[1]) - 1, Integer.parseInt(partes[2]));
        } catch (Exception ignored) {
        }
        new DatePickerDialog(
                        this,
                        (view, year, month, dayOfMonth) -> {
                            Calendar c = Calendar.getInstance(TZ_BR);
                            c.set(year, month, dayOfMonth);
                            String iso = formatarIso(c);
                            if (inicio) {
                                dataInicio = iso;
                            } else {
                                dataFim = iso;
                            }
                            atualizarBotoesData();
                        },
                        base.get(Calendar.YEAR),
                        base.get(Calendar.MONTH),
                        base.get(Calendar.DAY_OF_MONTH))
                .show();
    }

    private void atualizarBotoesData() {
        btnDataInicio.setText(getString(R.string.data_inicio_label, formatarExibicao(dataInicio)));
        btnDataFim.setText(getString(R.string.data_fim_label, formatarExibicao(dataFim)));
    }

    private void carregar(boolean reset) {
        if (carregando) {
            return;
        }
        carregando = true;
        if (reset) {
            paginaAtual = 1;
            temMais = false;
        }
        progress.setVisibility(View.VISIBLE);
        btnCarregarMais.setEnabled(false);

        final boolean tipoPdv = grupoTipo.getCheckedButtonId() == R.id.chipTipoPdv;
        final Integer numeropdv = (tipoPdv && switchSomentePdv.isChecked())
                ? prefs.getNumeroPdv()
                : null;
        final int pagina = paginaAtual;
        final String di = dataInicio;
        final String df = dataFim;

        executor.execute(() -> {
            try {
                PaginaVendas paginaVendas = tipoPdv
                        ? api.listarVendasPdv(di, df, numeropdv, pagina, LIMIT)
                        : api.listarDavsPos(di, df, null, pagina, LIMIT);
                runOnUiThread(() -> {
                    carregando = false;
                    progress.setVisibility(View.GONE);
                    if (reset) {
                        adapter.setItens(paginaVendas.vendas);
                    } else {
                        adapter.adicionar(paginaVendas.vendas);
                    }
                    temMais = paginaVendas.temMais();
                    if (temMais) {
                        paginaAtual = pagina + 1;
                    }
                    boolean vazio = adapter.getItemCount() == 0;
                    txtSemVendas.setVisibility(vazio ? View.VISIBLE : View.GONE);
                    btnCarregarMais.setVisibility(temMais ? View.VISIBLE : View.GONE);
                    btnCarregarMais.setEnabled(temMais);
                });
            } catch (ApiException e) {
                runOnUiThread(() -> {
                    carregando = false;
                    progress.setVisibility(View.GONE);
                    btnCarregarMais.setEnabled(temMais);
                    Toast.makeText(this, e.getMessage(), Toast.LENGTH_LONG).show();
                });
            }
        });
    }

    private void abrirDetalhe(VendaResumoDto venda) {
        Intent intent = new Intent(this, VendaDetalheActivity.class);
        intent.putExtra(VendaDetalheActivity.EXTRA_VENDA, venda);
        startActivity(intent);
    }

    private static String formatarIso(Calendar c) {
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
        sdf.setTimeZone(TZ_BR);
        return sdf.format(c.getTime());
    }

    private static String formatarExibicao(String iso) {
        if (iso == null || iso.length() < 10) {
            return "—";
        }
        return iso.substring(8, 10) + "/" + iso.substring(5, 7) + "/" + iso.substring(0, 4);
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        executor.shutdownNow();
    }
}
