package com.pos_mais_gestao.ui.venda;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.pos_mais_gestao.R;
import com.pos_mais_gestao.domain.Produto;
import com.pos_mais_gestao.util.MoneyFormat;
import java.util.ArrayList;
import java.util.List;

public class ProdutoAdapter extends RecyclerView.Adapter<ProdutoAdapter.VH> {
    public interface OnProdutoClick {
        void onClick(Produto produto);
    }

    private final List<Produto> itens = new ArrayList<>();
    private final OnProdutoClick listener;

    public ProdutoAdapter(OnProdutoClick listener) {
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
                .inflate(R.layout.item_produto_atalho, parent, false);
        return new VH(view);
    }

    @Override
    public void onBindViewHolder(@NonNull VH holder, int position) {
        Produto produto = itens.get(position);
        holder.txtNome.setText(produto.getDescricao());
        holder.txtPreco.setText(MoneyFormat.format(produto.getPreco()));
        holder.itemView.setOnClickListener(v -> listener.onClick(produto));
    }

    @Override
    public int getItemCount() {
        return itens.size();
    }

    static class VH extends RecyclerView.ViewHolder {
        final TextView txtNome;
        final TextView txtPreco;

        VH(@NonNull View itemView) {
            super(itemView);
            txtNome = itemView.findViewById(R.id.txtNomeProduto);
            txtPreco = itemView.findViewById(R.id.txtPrecoProduto);
        }
    }
}
