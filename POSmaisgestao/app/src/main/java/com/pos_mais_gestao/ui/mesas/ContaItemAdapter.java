package com.pos_mais_gestao.ui.mesas;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageButton;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.pos_mais_gestao.R;
import com.pos_mais_gestao.data.api.ContaMesaItemDto;
import com.pos_mais_gestao.util.MoneyFormat;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class ContaItemAdapter extends RecyclerView.Adapter<ContaItemAdapter.VH> {
    public interface Listener {
        void onRemover(ContaMesaItemDto item);
    }

    private final List<ContaMesaItemDto> itens = new ArrayList<>();
    private final Listener listener;

    public ContaItemAdapter(Listener listener) {
        this.listener = listener;
    }

    public void setItens(List<ContaMesaItemDto> novos) {
        itens.clear();
        if (novos != null) {
            itens.addAll(novos);
        }
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_conta_mesa, parent, false);
        return new VH(view);
    }

    @Override
    public void onBindViewHolder(@NonNull VH holder, int position) {
        ContaMesaItemDto item = itens.get(position);
        holder.txtNome.setText(item.nomeproduto != null ? item.nomeproduto : "—");
        holder.txtQtd.setText(item.quantidade != null ? item.quantidade : "1");
        BigDecimal preco = BigDecimal.ZERO;
        try {
            if (item.precounitario != null) {
                preco = new BigDecimal(item.precounitario);
            }
        } catch (Exception ignored) {
        }
        holder.txtPreco.setText(MoneyFormat.format(preco));
        holder.btnRemover.setOnClickListener(v -> listener.onRemover(item));
    }

    @Override
    public int getItemCount() {
        return itens.size();
    }

    static class VH extends RecyclerView.ViewHolder {
        final TextView txtNome;
        final TextView txtQtd;
        final TextView txtPreco;
        final ImageButton btnRemover;

        VH(@NonNull View itemView) {
            super(itemView);
            txtNome = itemView.findViewById(R.id.txtItemContaNome);
            txtQtd = itemView.findViewById(R.id.txtItemContaQtd);
            txtPreco = itemView.findViewById(R.id.txtItemContaPreco);
            btnRemover = itemView.findViewById(R.id.btnRemoverItem);
        }
    }
}
