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
import com.google.android.material.textfield.TextInputEditText;
import com.maisgestao.nfe.NfeApplication;
import com.maisgestao.nfe.R;
import com.maisgestao.nfe.data.api.ApiClient;
import com.maisgestao.nfe.data.api.dto.ProdutoDto;
import com.maisgestao.nfe.data.local.PrefsStore;
import com.maisgestao.nfe.ui.produtos.ProdutoFormActivity;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class ProdutosFragment extends Fragment {
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private ProdutoAdapter adapter;
    private ProgressBar progress;
    private TextInputEditText inputBusca;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        return inflater.inflate(R.layout.fragment_lista_busca, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        progress = view.findViewById(R.id.progress);
        inputBusca = view.findViewById(R.id.inputBusca);
        RecyclerView list = view.findViewById(R.id.recycler);
        list.setLayoutManager(new LinearLayoutManager(requireContext()));
        adapter = new ProdutoAdapter(produto -> {
            Intent intent = new Intent(requireContext(), ProdutoFormActivity.class);
            intent.putExtra(ProdutoFormActivity.EXTRA_PRODUTO_ID, produto.id);
            startActivity(intent);
        });
        list.setAdapter(adapter);

        view.findViewById(R.id.btnBuscar).setOnClickListener(v -> carregar());
        FloatingActionButton fab = view.findViewById(R.id.fabNova);
        fab.setOnClickListener(v ->
                startActivity(new Intent(requireContext(), ProdutoFormActivity.class)));

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
        String q = inputBusca.getText() == null ? "" : inputBusca.getText().toString().trim();
        progress.setVisibility(View.VISIBLE);
        ApiClient api = ((NfeApplication) requireActivity().getApplication()).getApiClient();
        executor.execute(() -> {
            try {
                ApiClient.Pagina<ProdutoDto> pagina = api.listarProdutos(idempresa, 1, 50, q.isEmpty() ? null : q);
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

    static final class ProdutoAdapter extends RecyclerView.Adapter<ProdutoViewHolder> {
        interface OnClick {
            void onClick(ProdutoDto produto);
        }

        private final OnClick onClick;
        private final List<ProdutoDto> items = new ArrayList<>();

        ProdutoAdapter(OnClick onClick) {
            this.onClick = onClick;
        }

        void setItems(List<ProdutoDto> produtos) {
            items.clear();
            if (produtos != null) {
                items.addAll(produtos);
            }
            notifyDataSetChanged();
        }

        @NonNull
        @Override
        public ProdutoViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_simples, parent, false);
            return new ProdutoViewHolder(view);
        }

        @Override
        public void onBindViewHolder(@NonNull ProdutoViewHolder holder, int position) {
            ProdutoDto produto = items.get(position);
            holder.bind(produto, () -> onClick.onClick(produto));
        }

        @Override
        public int getItemCount() {
            return items.size();
        }
    }

    static final class ProdutoViewHolder extends RecyclerView.ViewHolder {
        private final android.widget.TextView title;
        private final android.widget.TextView subtitle;

        ProdutoViewHolder(@NonNull View itemView) {
            super(itemView);
            title = itemView.findViewById(R.id.textTitle);
            subtitle = itemView.findViewById(R.id.textSubtitle);
        }

        void bind(ProdutoDto produto, Runnable click) {
            title.setText(produto.nome);
            subtitle.setText(produto.preco == null ? "" : "R$ " + produto.preco);
            itemView.setOnClickListener(v -> click.run());
        }
    }
}
