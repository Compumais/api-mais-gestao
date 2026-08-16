package com.pos_mais_gestao.ui.mesas;

import android.content.res.ColorStateList;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import androidx.core.widget.ImageViewCompat;
import androidx.recyclerview.widget.RecyclerView;
import com.google.android.material.card.MaterialCardView;
import com.pos_mais_gestao.R;
import com.pos_mais_gestao.util.MoneyFormat;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class MesaAdapter extends RecyclerView.Adapter<MesaAdapter.VH> {
    public interface OnMesaClick {
        void onClick(MesaGradeItem mesa);

        void onLongClick(MesaGradeItem mesa);
    }

    private final List<MesaGradeItem> itens = new ArrayList<>();
    private final OnMesaClick listener;
    private boolean comanda;

    public MesaAdapter(OnMesaClick listener) {
        this(listener, false);
    }

    public MesaAdapter(OnMesaClick listener, boolean comanda) {
        this.listener = listener;
        this.comanda = comanda;
    }

    public void setModeloComanda(boolean comanda) {
        this.comanda = comanda;
        notifyDataSetChanged();
    }

    public void setItens(List<MesaGradeItem> mesas) {
        itens.clear();
        if (mesas != null) {
            itens.addAll(mesas);
        }
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_mesa, parent, false);
        return new VH(view);
    }

    @Override
    public void onBindViewHolder(@NonNull VH holder, int position) {
        MesaGradeItem mesa = itens.get(position);
        boolean ocupada = mesa.isOcupada();
        int stroke = Math.round(holder.itemView.getResources().getDisplayMetrics().density);
        holder.txtNumero.setText(String.valueOf(mesa.numero));
        if (!ocupada) {
            aplicarLivre(holder, stroke);
        } else {
            BigDecimal total = MoneyFormat.parse(mesa.conta != null ? mesa.conta.valortotal : null);
            if (total.compareTo(BigDecimal.ZERO) > 0) {
                aplicarConsumindo(holder);
            } else {
                aplicarOciosa(holder, stroke);
            }
            String nome = mesa.conta != null ? mesa.conta.observacao : null;
            holder.txtCliente.setText(nome == null || nome.trim().isEmpty() ? "Ocupada" : nome.trim());
            holder.txtCliente.setVisibility(View.VISIBLE);
            holder.txtTotal.setText(MoneyFormat.format(total));
            holder.txtTotal.setVisibility(View.VISIBLE);
        }
        holder.itemView.setOnClickListener(v -> listener.onClick(mesa));
        if (ocupada) {
            holder.itemView.setOnLongClickListener(v -> {
                listener.onLongClick(mesa);
                return true;
            });
        } else {
            holder.itemView.setOnLongClickListener(null);
        }
    }

    private void aplicarLivre(VH holder, int stroke) {
        holder.card.setCardBackgroundColor(cor(holder, R.color.card));
        holder.card.setStrokeColor(cor(holder, R.color.border));
        holder.card.setStrokeWidth(stroke);
        holder.imgStatus.setImageResource(R.drawable.ic_mesa);
        tint(holder.imgStatus, cor(holder, R.color.muted_foreground));
        holder.txtNumero.setTextColor(cor(holder, R.color.foreground));
        holder.txtCliente.setVisibility(View.GONE);
        holder.txtTotal.setVisibility(View.GONE);
    }

    private void aplicarConsumindo(VH holder) {
        int branco = cor(holder, R.color.primary_foreground);
        holder.card.setCardBackgroundColor(cor(holder, R.color.primary));
        holder.card.setStrokeWidth(0);
        holder.imgStatus.setImageResource(R.drawable.ic_talheres);
        tint(holder.imgStatus, branco);
        holder.txtNumero.setTextColor(branco);
        holder.txtCliente.setTextColor(branco);
        holder.txtTotal.setTextColor(branco);
    }

    private void aplicarOciosa(VH holder, int stroke) {
        int texto = cor(holder, R.color.foreground);
        holder.card.setCardBackgroundColor(cor(holder, R.color.accent));
        holder.card.setStrokeColor(cor(holder, R.color.border));
        holder.card.setStrokeWidth(stroke);
        holder.imgStatus.setImageResource(R.drawable.ic_relogio);
        tint(holder.imgStatus, texto);
        holder.txtNumero.setTextColor(texto);
        holder.txtCliente.setTextColor(texto);
        holder.txtTotal.setTextColor(texto);
    }

    private static int cor(VH holder, int res) {
        return ContextCompat.getColor(holder.itemView.getContext(), res);
    }

    private static void tint(ImageView view, int color) {
        ImageViewCompat.setImageTintList(view, ColorStateList.valueOf(color));
    }

    @Override
    public int getItemCount() {
        return itens.size();
    }

    static class VH extends RecyclerView.ViewHolder {
        final MaterialCardView card;
        final ImageView imgStatus;
        final TextView txtCliente;
        final TextView txtNumero;
        final TextView txtTotal;

        VH(@NonNull View itemView) {
            super(itemView);
            card = itemView.findViewById(R.id.cardMesa);
            imgStatus = itemView.findViewById(R.id.imgStatus);
            txtCliente = itemView.findViewById(R.id.txtCliente);
            txtNumero = itemView.findViewById(R.id.txtNumero);
            txtTotal = itemView.findViewById(R.id.txtTotal);
        }
    }
}
