package com.maisgestao.nfe.ui.hub;

import android.content.Intent;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ProgressBar;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.google.android.material.floatingactionbutton.FloatingActionButton;
import com.google.android.material.tabs.TabLayout;
import com.maisgestao.nfe.NfeApplication;
import com.maisgestao.nfe.R;
import com.maisgestao.nfe.data.api.ApiClient;
import com.maisgestao.nfe.data.api.dto.NotaFiscalDto;
import com.maisgestao.nfe.data.local.PrefsStore;
import com.maisgestao.nfe.ui.nfe.EmissaoWizardActivity;
import com.maisgestao.nfe.ui.nfe.NfeDetailActivity;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class NfeFragment extends Fragment {
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private NfeAdapter adapter;
    private ProgressBar progress;
    private boolean rascunhos;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        return inflater.inflate(R.layout.fragment_lista_nfe, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        progress = view.findViewById(R.id.progress);
        RecyclerView list = view.findViewById(R.id.recycler);
        list.setLayoutManager(new LinearLayoutManager(requireContext()));
        adapter = new NfeAdapter(nota -> {
            Intent intent = new Intent(requireContext(), NfeDetailActivity.class);
            intent.putExtra(NfeDetailActivity.EXTRA_NOTA_ID, nota.id);
            startActivity(intent);
        });
        list.setAdapter(adapter);

        TabLayout tabs = view.findViewById(R.id.tabsNfe);
        tabs.addTab(tabs.newTab().setText(R.string.nfe_emitidas));
        tabs.addTab(tabs.newTab().setText(R.string.nfe_rascunhos));
        tabs.addOnTabSelectedListener(new TabLayout.OnTabSelectedListener() {
            @Override
            public void onTabSelected(TabLayout.Tab tab) {
                rascunhos = tab.getPosition() == 1;
                carregar();
            }

            @Override
            public void onTabUnselected(TabLayout.Tab tab) {}

            @Override
            public void onTabReselected(TabLayout.Tab tab) {}
        });

        FloatingActionButton fab = view.findViewById(R.id.fabNova);
        fab.setOnClickListener(v ->
                startActivity(new Intent(requireContext(), EmissaoWizardActivity.class)));

        carregar();
    }

    @Override
    public void onResume() {
        super.onResume();
        carregar();
    }

    private void carregar() {
        PrefsStore prefs = ((NfeApplication) requireActivity().getApplication()).getPrefsStore();
        String idempresa = prefs.getEmpresaId();
        if (idempresa == null) {
            return;
        }
        progress.setVisibility(View.VISIBLE);
        ApiClient api = ((NfeApplication) requireActivity().getApplication()).getApiClient();
        executor.execute(() -> {
            try {
                ApiClient.Pagina<NotaFiscalDto> pagina = rascunhos
                        ? api.listarRascunhos(idempresa, 1, 50)
                        : api.listarNfes(idempresa, 1, 50);
                requireActivity().runOnUiThread(() -> {
                    if (!isAdded()) {
                        return;
                    }
                    progress.setVisibility(View.GONE);
                    adapter.setItems(pagina.data);
                });
            } catch (Exception error) {
                requireActivity().runOnUiThread(() -> {
                    if (!isAdded()) {
                        return;
                    }
                    progress.setVisibility(View.GONE);
                    Toast.makeText(requireContext(), error.getMessage(), Toast.LENGTH_LONG).show();
                });
            }
        });
    }

    @Override
    public void onDestroyView() {
        executor.shutdownNow();
        super.onDestroyView();
    }

    static final class NfeAdapter extends RecyclerView.Adapter<NfeViewHolder> {
        interface OnClick {
            void onClick(NotaFiscalDto nota);
        }

        private final OnClick onClick;
        private final List<NotaFiscalDto> items = new ArrayList<>();

        NfeAdapter(OnClick onClick) {
            this.onClick = onClick;
        }

        void setItems(List<NotaFiscalDto> notas) {
            items.clear();
            if (notas != null) {
                items.addAll(notas);
            }
            notifyDataSetChanged();
        }

        @NonNull
        @Override
        public NfeViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_nfe, parent, false);
            return new NfeViewHolder(view);
        }

        @Override
        public void onBindViewHolder(@NonNull NfeViewHolder holder, int position) {
            NotaFiscalDto nota = items.get(position);
            holder.bind(nota, () -> onClick.onClick(nota));
        }

        @Override
        public int getItemCount() {
            return items.size();
        }
    }

    static final class NfeViewHolder extends RecyclerView.ViewHolder {
        private final android.widget.TextView title;
        private final android.widget.TextView subtitle;

        NfeViewHolder(@NonNull View itemView) {
            super(itemView);
            title = itemView.findViewById(R.id.textTitle);
            subtitle = itemView.findViewById(R.id.textSubtitle);
        }

        void bind(NotaFiscalDto nota, Runnable click) {
            String numero = nota.numeronotafiscal == null ? "—" : nota.numeronotafiscal;
            title.setText(itemView.getContext().getString(R.string.nfe_item_titulo, numero));
            subtitle.setText((nota.razaosocial == null ? "" : nota.razaosocial)
                    + " · "
                    + (nota.valortotalnota == null ? "" : nota.valortotalnota));
            itemView.setOnClickListener(v -> click.run());
        }
    }
}
