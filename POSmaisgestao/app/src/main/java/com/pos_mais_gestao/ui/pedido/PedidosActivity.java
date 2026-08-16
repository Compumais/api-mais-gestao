package com.pos_mais_gestao.ui.pedido;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.CheckBox;
import android.widget.RadioGroup;
import android.widget.TextView;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.google.android.material.appbar.MaterialToolbar;
import com.google.android.material.button.MaterialButton;
import com.pos_mais_gestao.PosApplication;
import com.pos_mais_gestao.R;
import com.pos_mais_gestao.data.api.ApiClient;
import com.pos_mais_gestao.data.api.ApiException;
import com.pos_mais_gestao.data.api.PedidoFilaDto;
import com.pos_mais_gestao.data.local.PrefsStore;
import com.pos_mais_gestao.ui.OfflineBanner;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class PedidosActivity extends AppCompatActivity {
    private static final long POLL_MS = 5000;
    private static final int TYPE_HEADER = 0;
    private static final int TYPE_ITEM = 1;

    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final Handler pollHandler = new Handler(Looper.getMainLooper());
    private final Runnable pollTick = this::pollOnce;
    private final List<Row> rows = new ArrayList<>();
    private final List<PedidoFilaDto> all = new ArrayList<>();
    private PrefsStore prefs;
    private ApiClient api;
    private PedidoAdapter adapter;
    private TextView txtEmpty;
    private boolean groupByMesa;
    private boolean pendentes = true;
    private volatile boolean loading;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_pedidos);

        PosApplication app = (PosApplication) getApplication();
        prefs = app.getPrefsStore();
        api = app.getApiClient();
        MaterialToolbar toolbar = findViewById(R.id.toolbarPedidos);
        setSupportActionBar(toolbar);
        toolbar.setTitle(R.string.pedidos_do_dia);
        toolbar.setNavigationOnClickListener(v -> finish());
        txtEmpty = findViewById(R.id.txtPedidosEmpty);
        RecyclerView list = findViewById(R.id.listPedidos);
        list.setLayoutManager(new LinearLayoutManager(this));
        adapter = new PedidoAdapter();
        list.setAdapter(adapter);

        CheckBox chk = findViewById(R.id.chkAgruparMesa);
        chk.setOnCheckedChangeListener((b, checked) -> {
            groupByMesa = checked;
            rebuild();
        });
        RadioGroup rg = findViewById(R.id.filterPedidos);
        rg.setOnCheckedChangeListener((g, id) -> {
            pendentes = id != R.id.filterTodosPedidos;
            carregar();
        });
    }

    @Override
    protected void onResume() {
        super.onResume();
        carregar();
        pollHandler.removeCallbacks(pollTick);
        pollHandler.postDelayed(pollTick, POLL_MS);
    }

    @Override
    protected void onPause() {
        pollHandler.removeCallbacks(pollTick);
        super.onPause();
    }

    private void pollOnce() {
        carregar();
        pollHandler.postDelayed(pollTick, POLL_MS);
    }

    private void carregar() {
        if (loading) {
            return;
        }
        loading = true;
        executor.execute(() -> {
            try {
                List<PedidoFilaDto> lista = api.listarPedidosFila(pendentes);
                runOnUiThread(() -> {
                    loading = false;
                    OfflineBanner.bind(this, true, null);
                    all.clear();
                    all.addAll(lista);
                    rebuild();
                });
            } catch (ApiException e) {
                runOnUiThread(() -> {
                    loading = false;
                    OfflineBanner.bind(this, false, e.getMessage());
                });
            }
        });
    }

    private void rebuild() {
        rows.clear();
        if (all.isEmpty()) {
            txtEmpty.setVisibility(View.VISIBLE);
            txtEmpty.setText(pendentes ? R.string.nenhum_pedido_pendente : R.string.nenhum_pedido_dia);
            adapter.notifyDataSetChanged();
            return;
        }
        txtEmpty.setVisibility(View.GONE);
        Map<String, List<PedidoFilaDto>> grupos = new LinkedHashMap<>();
        for (PedidoFilaDto item : all) {
            String key;
            if (groupByMesa) {
                int n = item.numeroMesa != null ? item.numeroMesa : 0;
                key = getString(prefs.isModeloComanda() ? R.string.comanda_n : R.string.mesa_n, n);
            } else {
                key = getString(R.string.fila);
            }
            grupos.computeIfAbsent(key, k -> new ArrayList<>()).add(item);
        }
        boolean first = true;
        for (Map.Entry<String, List<PedidoFilaDto>> e : grupos.entrySet()) {
            rows.add(Row.header(e.getKey(), first));
            first = false;
            for (PedidoFilaDto item : e.getValue()) {
                rows.add(Row.item(item));
            }
        }
        adapter.notifyDataSetChanged();
    }

    private void entregar(PedidoFilaDto item) {
        executor.execute(() -> {
            try {
                api.marcarPedidoEntregue(item.id);
                runOnUiThread(this::carregar);
            } catch (ApiException e) {
                runOnUiThread(() -> Toast.makeText(this, e.getMessage(), Toast.LENGTH_LONG).show());
            }
        });
    }

    private void limparFila() {
        executor.execute(() -> {
            try {
                api.limparFilaPedidos();
                runOnUiThread(this::carregar);
            } catch (ApiException e) {
                runOnUiThread(() -> Toast.makeText(this, e.getMessage(), Toast.LENGTH_LONG).show());
            }
        });
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        pollHandler.removeCallbacks(pollTick);
        executor.shutdownNow();
    }

    static class Row {
        final int type;
        final String header;
        final boolean showLimpar;
        final PedidoFilaDto item;

        static Row header(String title, boolean showLimpar) {
            return new Row(TYPE_HEADER, title, showLimpar, null);
        }

        static Row item(PedidoFilaDto item) {
            return new Row(TYPE_ITEM, null, false, item);
        }

        private Row(int type, String header, boolean showLimpar, PedidoFilaDto item) {
            this.type = type;
            this.header = header;
            this.showLimpar = showLimpar;
            this.item = item;
        }
    }

    class PedidoAdapter extends RecyclerView.Adapter<RecyclerView.ViewHolder> {
        @Override
        public int getItemViewType(int position) {
            return rows.get(position).type;
        }

        @NonNull
        @Override
        public RecyclerView.ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            if (viewType == TYPE_HEADER) {
                return new HeaderVH(LayoutInflater.from(parent.getContext())
                        .inflate(R.layout.item_pedido_header, parent, false));
            }
            return new ItemVH(LayoutInflater.from(parent.getContext())
                    .inflate(R.layout.item_pedido, parent, false));
        }

        @Override
        public void onBindViewHolder(@NonNull RecyclerView.ViewHolder holder, int position) {
            Row row = rows.get(position);
            if (holder instanceof HeaderVH) {
                HeaderVH h = (HeaderVH) holder;
                h.txt.setText(row.header);
                h.btn.setVisibility(row.showLimpar ? View.VISIBLE : View.GONE);
                h.btn.setOnClickListener(v -> limparFila());
                return;
            }
            ItemVH h = (ItemVH) holder;
            PedidoFilaDto item = row.item;
            String qtd = item.quantidade != null ? item.quantidade : "1";
            h.txtNome.setText(qtd + "x  " + (item.descricao != null ? item.descricao : ""));
            int n = item.numeroMesa != null ? item.numeroMesa : 0;
            String hora = item.criadoem != null && item.criadoem.length() >= 16
                    ? item.criadoem.substring(11, 16)
                    : "";
            String cliente = item.nomecliente != null ? item.nomecliente : "";
            h.txtMeta.setText(String.format(Locale.getDefault(), "%s · %s · %s",
                    getString(prefs.isModeloComanda() ? R.string.comanda_n : R.string.mesa_n, n),
                    hora,
                    cliente));
            if (item.observacao != null && !item.observacao.trim().isEmpty()) {
                h.txtObs.setVisibility(View.VISIBLE);
                h.txtObs.setText(item.observacao);
            } else {
                h.txtObs.setVisibility(View.GONE);
            }
            boolean pendente = !"entregue".equals(item.status);
            h.btnEntregar.setVisibility(pendente ? View.VISIBLE : View.GONE);
            h.btnEntregar.setOnClickListener(v -> entregar(item));
        }

        @Override
        public int getItemCount() {
            return rows.size();
        }

        class HeaderVH extends RecyclerView.ViewHolder {
            final TextView txt;
            final MaterialButton btn;

            HeaderVH(View v) {
                super(v);
                txt = v.findViewById(R.id.txtPedidoHeader);
                btn = v.findViewById(R.id.btnCancelFila);
            }
        }

        class ItemVH extends RecyclerView.ViewHolder {
            final TextView txtNome;
            final TextView txtMeta;
            final TextView txtObs;
            final MaterialButton btnEntregar;

            ItemVH(View v) {
                super(v);
                txtNome = v.findViewById(R.id.txtPedidoNome);
                txtMeta = v.findViewById(R.id.txtPedidoMeta);
                txtObs = v.findViewById(R.id.txtPedidoObs);
                btnEntregar = v.findViewById(R.id.btnEntregar);
            }
        }
    }
}
