package com.pos_mais_gestao.ui.venda;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageButton;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.pos_mais_gestao.R;
import com.pos_mais_gestao.domain.ItemCarrinho;
import com.pos_mais_gestao.util.MoneyFormat;
import java.util.ArrayList;
import java.util.List;

public class CarrinhoAdapter extends RecyclerView.Adapter<CarrinhoAdapter.VH> {
    public interface Listener {
        void onMais(ItemCarrinho item);
        void onMenos(ItemCarrinho item);
    }

    private final List<ItemCarrinho> itens = new ArrayList<>();
    private final Listener listener;

    public CarrinhoAdapter(Listener listener) {
        this.listener = listener;
    }

    public void setItens(List<ItemCarrinho> novos) {
        itens.clear();
        if (novos != null) {
            itens.addAll(novos);
        }
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_carrinho, parent, false);
        return new VH(view);
    }

    @Override
    public void onBindViewHolder(@NonNull VH holder, int position) {
        ItemCarrinho item = itens.get(position);
        holder.txtNome.setText(item.getProduto().getDescricao());
        holder.txtQtd.setText(item.getQuantidade().stripTrailingZeros().toPlainString());
        holder.txtTotal.setText(MoneyFormat.format(item.getSubtotal()));
        holder.btnMais.setOnClickListener(v -> listener.onMais(item));
        holder.btnMenos.setOnClickListener(v -> listener.onMenos(item));
    }

    @Override
    public int getItemCount() {
        return itens.size();
    }

    static class VH extends RecyclerView.ViewHolder {
        final TextView txtNome;
        final TextView txtQtd;
        final TextView txtTotal;
        final ImageButton btnMais;
        final ImageButton btnMenos;

        VH(@NonNull View itemView) {
            super(itemView);
            txtNome = itemView.findViewById(R.id.txtItemNome);
            txtQtd = itemView.findViewById(R.id.txtQtd);
            txtTotal = itemView.findViewById(R.id.txtItemTotal);
            btnMais = itemView.findViewById(R.id.btnMais);
            btnMenos = itemView.findViewById(R.id.btnMenos);
        }
    }
}
