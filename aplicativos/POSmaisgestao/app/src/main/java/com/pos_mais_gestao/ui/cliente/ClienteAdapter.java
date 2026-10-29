package com.pos_mais_gestao.ui.cliente;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.pos_mais_gestao.R;
import com.pos_mais_gestao.data.api.ClienteDto;
import java.util.ArrayList;
import java.util.List;

public class ClienteAdapter extends RecyclerView.Adapter<ClienteAdapter.VH> {
    public interface OnClienteClick {
        void onClick(ClienteDto cliente);
    }

    private final List<ClienteDto> itens = new ArrayList<>();
    private final OnClienteClick listener;

    public ClienteAdapter(OnClienteClick listener) {
        this.listener = listener;
    }

    public void setItens(List<ClienteDto> clientes) {
        itens.clear();
        if (clientes != null) {
            itens.addAll(clientes);
        }
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_cliente, parent, false);
        return new VH(view);
    }

    @Override
    public void onBindViewHolder(@NonNull VH holder, int position) {
        ClienteDto cliente = itens.get(position);
        holder.txtNome.setText(cliente.nomeExibicao());
        String doc = cliente.documentoExibicao();
        if (doc.isEmpty()) {
            holder.txtDoc.setVisibility(View.GONE);
        } else {
            holder.txtDoc.setVisibility(View.VISIBLE);
            holder.txtDoc.setText(doc);
        }
        holder.itemView.setOnClickListener(v -> listener.onClick(cliente));
    }

    @Override
    public int getItemCount() {
        return itens.size();
    }

    static class VH extends RecyclerView.ViewHolder {
        final TextView txtNome;
        final TextView txtDoc;

        VH(@NonNull View itemView) {
            super(itemView);
            txtNome = itemView.findViewById(R.id.txtNomeCliente);
            txtDoc = itemView.findViewById(R.id.txtDocCliente);
        }
    }
}
