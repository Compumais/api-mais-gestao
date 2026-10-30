package com.maisgestao.nfe.ui.empresa;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.ProgressBar;
import android.widget.Toast;
import com.maisgestao.nfe.ui.NfeAppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.maisgestao.nfe.NfeApplication;
import com.maisgestao.nfe.R;
import com.maisgestao.nfe.data.api.ApiClient;
import com.maisgestao.nfe.data.api.dto.EmpresaDto;
import com.maisgestao.nfe.data.local.PrefsStore;
import com.maisgestao.nfe.ui.hub.HubActivity;
import com.maisgestao.nfe.util.UiExecutor;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class EmpresaActivity extends NfeAppCompatActivity {
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private PrefsStore prefs;
    private ApiClient api;
    private ProgressBar progress;
    private EmpresaAdapter adapter;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_empresa);

        NfeApplication app = (NfeApplication) getApplication();
        prefs = app.getPrefsStore();
        api = app.getApiClient();

        progress = findViewById(R.id.progress);
        RecyclerView list = findViewById(R.id.listEmpresas);
        list.setLayoutManager(new LinearLayoutManager(this));
        adapter = new EmpresaAdapter(this::selecionar);
        list.setAdapter(adapter);

        carregar();
    }

    private void carregar() {
        progress.setVisibility(View.VISIBLE);
        executor.execute(() -> {
            try {
                List<EmpresaDto> empresas = api.listarEmpresas();
                runOnUiThread(() -> {
                    if (isFinishing()) {
                        return;
                    }
                    adapter.setItems(empresas);
                    progress.setVisibility(View.GONE);
                });
            } catch (Exception error) {
                runOnUiThread(() -> {
                    if (isFinishing()) {
                        return;
                    }
                    progress.setVisibility(View.GONE);
                    Toast.makeText(this, error.getMessage(), Toast.LENGTH_LONG).show();
                });
            }
        });
    }

    private void selecionar(EmpresaDto empresa) {
        prefs.setEmpresa(empresa.id, empresa.nome);
        startActivity(new Intent(this, HubActivity.class));
        finish();
    }

    @Override
    protected void onDestroy() {
        executor.shutdownNow();
        super.onDestroy();
    }

    static final class EmpresaAdapter extends RecyclerView.Adapter<EmpresaViewHolder> {
        interface OnSelect {
            void onSelect(EmpresaDto empresa);
        }

        private final OnSelect onSelect;
        private final List<EmpresaDto> items = new ArrayList<>();

        EmpresaAdapter(OnSelect onSelect) {
            this.onSelect = onSelect;
        }

        void setItems(List<EmpresaDto> empresas) {
            items.clear();
            if (empresas != null) {
                items.addAll(empresas);
            }
            notifyDataSetChanged();
        }

        @Override
        public EmpresaViewHolder onCreateViewHolder(android.view.ViewGroup parent, int viewType) {
            android.view.View view = android.view.LayoutInflater.from(parent.getContext())
                    .inflate(R.layout.item_empresa, parent, false);
            return new EmpresaViewHolder(view);
        }

        @Override
        public void onBindViewHolder(EmpresaViewHolder holder, int position) {
            EmpresaDto empresa = items.get(position);
            holder.bind(empresa, () -> onSelect.onSelect(empresa));
        }

        @Override
        public int getItemCount() {
            return items.size();
        }
    }

    static final class EmpresaViewHolder extends RecyclerView.ViewHolder {
        private final android.widget.TextView title;
        private final android.widget.TextView subtitle;

        EmpresaViewHolder(android.view.View itemView) {
            super(itemView);
            title = itemView.findViewById(R.id.textTitle);
            subtitle = itemView.findViewById(R.id.textSubtitle);
        }

        void bind(EmpresaDto empresa, Runnable onClick) {
            title.setText(empresa.nome);
            subtitle.setText(empresa.cnpj == null ? "" : empresa.cnpj);
            itemView.setOnClickListener(v -> onClick.run());
        }
    }
}
