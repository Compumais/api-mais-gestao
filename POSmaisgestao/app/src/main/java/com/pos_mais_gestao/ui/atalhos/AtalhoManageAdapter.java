package com.pos_mais_gestao.ui.atalhos;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.google.android.material.button.MaterialButton;
import com.pos_mais_gestao.R;
import com.pos_mais_gestao.domain.Produto;
import com.pos_mais_gestao.util.MoneyFormat;
import java.util.ArrayList;
import java.util.List;

public class AtalhoManageAdapter extends RecyclerView.Adapter<AtalhoManageAdapter.VH> {
    public interface Listener {
        void onAcao(Produto produto);
    }

    private final List<Produto> itens = new ArrayList<>();
    private final Listener listener;
    private final boolean modoRemover;

    public AtalhoManageAdapter(boolean modoRemover, Listener listener) {
        this.modoRemover = modoRemover;
        this.listener = listener;
    }

    public void setItens(List<Produto> produtos) {
        itens.clear();
        if (produtos != null) {
            itens.addAll(produtos);
        }
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext())
                .inflate(R.layout.item_atalho_manage, parent, false);
        return new VH(view);
    }

    @Override
    public void onBindViewHolder(@NonNull VH holder, int position) {
        Produto produto = itens.get(position);
        holder.txtNome.setText(produto.getDescricao());
        holder.txtPreco.setText(MoneyFormat.format(produto.getPreco()));
        holder.btnAcao.setText(modoRemover ? R.string.remover : R.string.adicionar_atalho);
        if (modoRemover) {
            holder.btnAcao.setBackgroundTintList(
                    holder.itemView.getContext().getColorStateList(R.color.danger));
        }
        holder.btnAcao.setOnClickListener(v -> listener.onAcao(produto));
    }

    @Override
    public int getItemCount() {
        return itens.size();
    }

    static class VH extends RecyclerView.ViewHolder {
        final TextView txtNome;
        final TextView txtPreco;
        final MaterialButton btnAcao;

        VH(@NonNull View itemView) {
            super(itemView);
            txtNome = itemView.findViewById(R.id.txtNome);
            txtPreco = itemView.findViewById(R.id.txtPreco);
            btnAcao = itemView.findViewById(R.id.btnAcao);
        }
    }
}
