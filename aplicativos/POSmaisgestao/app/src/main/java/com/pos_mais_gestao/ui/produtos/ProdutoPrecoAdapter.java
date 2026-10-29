package com.pos_mais_gestao.ui.produtos;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.pos_mais_gestao.R;
import com.pos_mais_gestao.domain.Produto;
import com.pos_mais_gestao.util.MoneyFormat;
import com.pos_mais_gestao.util.ProdutoImagemHelper;
import java.util.ArrayList;
import java.util.List;

public class ProdutoPrecoAdapter extends RecyclerView.Adapter<ProdutoPrecoAdapter.VH> {
    public interface OnProdutoClick {
        void onClick(Produto produto);
    }

    private final List<Produto> itens = new ArrayList<>();
    private final OnProdutoClick listener;

    public ProdutoPrecoAdapter(OnProdutoClick listener) {
        this.listener = listener;
    }

    public void setItens(List<Produto> produtos) {
        itens.clear();
        if (produtos != null) {
            itens.addAll(produtos);
        }
        notifyDataSetChanged();
    }

    public void atualizarProduto(Produto produto) {
        if (produto == null || produto.getId() == null) {
            return;
        }
        for (int i = 0; i < itens.size(); i++) {
            if (produto.getId().equals(itens.get(i).getId())) {
                itens.set(i, produto);
                notifyItemChanged(i);
                return;
            }
        }
    }

    @NonNull
    @Override
    public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext())
                .inflate(R.layout.item_produto_preco, parent, false);
        return new VH(view);
    }

    @Override
    public void onBindViewHolder(@NonNull VH holder, int position) {
        Produto produto = itens.get(position);
        holder.txtNome.setText(produto.getDescricao());
        if (produto.getCodigo() != null) {
            holder.txtCodigo.setText(
                    holder.itemView.getContext().getString(R.string.codigo_produto, produto.getCodigo()));
            holder.txtCodigo.setVisibility(View.VISIBLE);
        } else {
            holder.txtCodigo.setVisibility(View.GONE);
        }
        holder.txtPreco.setText(MoneyFormat.format(produto.getPreco()));
        ProdutoImagemHelper.carregar(holder.imgProduto, produto);
        holder.itemView.setOnClickListener(v -> listener.onClick(produto));
    }

    @Override
    public int getItemCount() {
        return itens.size();
    }

    static class VH extends RecyclerView.ViewHolder {
        final ImageView imgProduto;
        final TextView txtNome;
        final TextView txtCodigo;
        final TextView txtPreco;

        VH(@NonNull View itemView) {
            super(itemView);
            imgProduto = itemView.findViewById(R.id.imgProdutoPreco);
            txtNome = itemView.findViewById(R.id.txtNomeProdutoPreco);
            txtCodigo = itemView.findViewById(R.id.txtCodigoProdutoPreco);
            txtPreco = itemView.findViewById(R.id.txtPrecoProdutoPreco);
        }
    }
}
