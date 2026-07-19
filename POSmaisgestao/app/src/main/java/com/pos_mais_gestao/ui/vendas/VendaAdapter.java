package com.pos_mais_gestao.ui.vendas;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.pos_mais_gestao.R;
import com.pos_mais_gestao.data.api.VendaResumoDto;
import com.pos_mais_gestao.util.MoneyFormat;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class VendaAdapter extends RecyclerView.Adapter<VendaAdapter.VH> {
    public interface OnVendaClick {
        void onClick(VendaResumoDto venda);
    }

    private final List<VendaResumoDto> itens = new ArrayList<>();
    private final OnVendaClick listener;

    public VendaAdapter(OnVendaClick listener) {
        this.listener = listener;
    }

    public void setItens(List<VendaResumoDto> novos) {
        itens.clear();
        if (novos != null) {
            itens.addAll(novos);
        }
        notifyDataSetChanged();
    }

    public void adicionar(List<VendaResumoDto> mais) {
        if (mais == null || mais.isEmpty()) {
            return;
        }
        int inicio = itens.size();
        itens.addAll(mais);
        notifyItemRangeInserted(inicio, mais.size());
    }

    @NonNull
    @Override
    public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_venda, parent, false);
        return new VH(view);
    }

    @Override
    public void onBindViewHolder(@NonNull VH holder, int position) {
        VendaResumoDto venda = itens.get(position);
        boolean pdv = venda.tipo == VendaResumoDto.Tipo.PDV;
        String tipo;
        if (pdv) {
            tipo = venda.mesa
                    ? holder.itemView.getContext().getString(R.string.tipo_venda_mesa)
                    : holder.itemView.getContext().getString(R.string.tipo_venda_balcao);
            if (venda.numeropdv != null) {
                tipo = tipo + " · PDV " + venda.numeropdv;
            }
        } else {
            tipo = holder.itemView.getContext().getString(R.string.tipo_pedido_pos);
        }
        holder.txtTipo.setText(tipo);
        holder.txtCodigo.setText(holder.itemView.getContext().getString(
                R.string.codigo_pedido, venda.codigo != null ? venda.codigo : "—"));
        holder.txtData.setText(formatarData(venda.dataHora));
        holder.txtPagamento.setText(venda.pagamentosResumo != null ? venda.pagamentosResumo : "—");
        holder.txtTotal.setText(formatarValor(venda.valorTotal));
        holder.itemView.setOnClickListener(v -> listener.onClick(venda));
    }

    @Override
    public int getItemCount() {
        return itens.size();
    }

    static String formatarValor(String valor) {
        try {
            if (valor == null || valor.isEmpty()) {
                return MoneyFormat.format(BigDecimal.ZERO);
            }
            return MoneyFormat.format(new BigDecimal(valor.replace(",", ".")));
        } catch (Exception e) {
            return valor;
        }
    }

    static String formatarData(String raw) {
        if (raw == null || raw.isEmpty()) {
            return "—";
        }
        // ISO: 2026-07-18T22:10:00.000Z ou 2026-07-18 22:10:00
        String limpo = raw.replace('T', ' ');
        if (limpo.length() >= 16) {
            return limpo.substring(0, 16).replace('-', '/');
        }
        return limpo;
    }

    static class VH extends RecyclerView.ViewHolder {
        final TextView txtTipo;
        final TextView txtCodigo;
        final TextView txtData;
        final TextView txtPagamento;
        final TextView txtTotal;

        VH(@NonNull View itemView) {
            super(itemView);
            txtTipo = itemView.findViewById(R.id.txtVendaTipo);
            txtCodigo = itemView.findViewById(R.id.txtVendaCodigo);
            txtData = itemView.findViewById(R.id.txtVendaData);
            txtPagamento = itemView.findViewById(R.id.txtVendaPagamento);
            txtTotal = itemView.findViewById(R.id.txtVendaTotal);
        }
    }
}
