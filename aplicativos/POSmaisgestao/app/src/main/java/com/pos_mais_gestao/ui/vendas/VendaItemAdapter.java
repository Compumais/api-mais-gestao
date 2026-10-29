package com.pos_mais_gestao.ui.vendas;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.pos_mais_gestao.R;
import com.pos_mais_gestao.data.api.VendaItemDetalheDto;
import com.pos_mais_gestao.util.MoneyFormat;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class VendaItemAdapter extends RecyclerView.Adapter<VendaItemAdapter.VH> {
    private final List<VendaItemDetalheDto> itens = new ArrayList<>();

    public void setItens(List<VendaItemDetalheDto> novos) {
        itens.clear();
        if (novos != null) {
            itens.addAll(novos);
        }
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext())
                .inflate(R.layout.item_venda_detalhe, parent, false);
        return new VH(view);
    }

    @Override
    public void onBindViewHolder(@NonNull VH holder, int position) {
        VendaItemDetalheDto item = itens.get(position);
        holder.txtNome.setText(item.nome != null ? item.nome : "Item");
        holder.txtQtd.setText(item.quantidade != null ? item.quantidade + "x" : "1x");
        String total = item.precototal;
        if (total == null || total.isEmpty()) {
            total = item.precounitario;
        }
        holder.txtTotal.setText(formatar(total));
    }

    @Override
    public int getItemCount() {
        return itens.size();
    }

    private static String formatar(String valor) {
        try {
            if (valor == null || valor.isEmpty()) {
                return MoneyFormat.format(BigDecimal.ZERO);
            }
            return MoneyFormat.format(new BigDecimal(valor.replace(",", ".")));
        } catch (Exception e) {
            return valor;
        }
    }

    static class VH extends RecyclerView.ViewHolder {
        final TextView txtNome;
        final TextView txtQtd;
        final TextView txtTotal;

        VH(@NonNull View itemView) {
            super(itemView);
            txtNome = itemView.findViewById(R.id.txtItemVendaNome);
            txtQtd = itemView.findViewById(R.id.txtItemVendaQtd);
            txtTotal = itemView.findViewById(R.id.txtItemVendaTotal);
        }
    }
}
