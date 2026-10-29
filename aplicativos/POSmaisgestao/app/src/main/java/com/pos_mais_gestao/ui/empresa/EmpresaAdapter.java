package com.pos_mais_gestao.ui.empresa;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.pos_mais_gestao.R;
import com.pos_mais_gestao.data.api.EmpresaDto;
import java.util.ArrayList;
import java.util.List;

public class EmpresaAdapter extends RecyclerView.Adapter<EmpresaAdapter.VH> {
    public interface OnEmpresaClick {
        void onClick(EmpresaDto empresa);
    }

    private final List<EmpresaDto> itens = new ArrayList<>();
    private final OnEmpresaClick listener;

    public EmpresaAdapter(OnEmpresaClick listener) {
        this.listener = listener;
    }

    public void setItens(List<EmpresaDto> empresas) {
        itens.clear();
        if (empresas != null) {
            itens.addAll(empresas);
        }
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_empresa, parent, false);
        return new VH(view);
    }

    @Override
    public void onBindViewHolder(@NonNull VH holder, int position) {
        EmpresaDto empresa = itens.get(position);
        holder.txtNome.setText(empresa.nome != null ? empresa.nome : empresa.id);
        holder.itemView.setOnClickListener(v -> listener.onClick(empresa));
    }

    @Override
    public int getItemCount() {
        return itens.size();
    }

    static class VH extends RecyclerView.ViewHolder {
        final TextView txtNome;

        VH(@NonNull View itemView) {
            super(itemView);
            txtNome = itemView.findViewById(R.id.txtNomeEmpresa);
        }
    }
}
