package com.pos_mais_gestao.ui.mesas;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import androidx.recyclerview.widget.RecyclerView;
import com.pos_mais_gestao.R;
import java.util.ArrayList;
import java.util.List;

public class MesaAdapter extends RecyclerView.Adapter<MesaAdapter.VH> {
    public interface OnMesaClick {
        void onClick(MesaGradeItem mesa);
    }

    private final List<MesaGradeItem> itens = new ArrayList<>();
    private final OnMesaClick listener;

    public MesaAdapter(OnMesaClick listener) {
        this.listener = listener;
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
        holder.txtNumero.setText(holder.itemView.getContext().getString(R.string.mesa_n, mesa.numero));
        boolean ocupada = mesa.isOcupada();
        holder.txtStatus.setText(ocupada ? R.string.mesa_ocupada : R.string.mesa_livre);
        holder.txtStatus.setTextColor(
                ContextCompat.getColor(
                        holder.itemView.getContext(),
                        ocupada ? R.color.danger : R.color.primary));
        holder.itemView.setOnClickListener(v -> listener.onClick(mesa));
    }

    @Override
    public int getItemCount() {
        return itens.size();
    }

    static class VH extends RecyclerView.ViewHolder {
        final TextView txtNumero;
        final TextView txtStatus;

        VH(@NonNull View itemView) {
            super(itemView);
            txtNumero = itemView.findViewById(R.id.txtNumeroMesa);
            txtStatus = itemView.findViewById(R.id.txtStatusMesa);
        }
    }
}
