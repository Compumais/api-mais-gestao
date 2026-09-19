package com.pos_mais_gestao.ui.pedido;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.pos_mais_gestao.R;
import com.pos_mais_gestao.data.local.CatalogDb;
import com.pos_mais_gestao.util.ProdutoImagemHelper;
import java.util.ArrayList;
import java.util.List;

final class GrupoGourmetAdapter extends RecyclerView.Adapter<GrupoGourmetAdapter.VH> {
    interface Listener {
        void onClick(CatalogDb.GrupoRow grupo);
    }

    private final List<CatalogDb.GrupoRow> grupos = new ArrayList<>();
    private final Listener listener;

    GrupoGourmetAdapter(Listener listener) {
        this.listener = listener;
    }

    void setGrupos(List<CatalogDb.GrupoRow> novosGrupos) {
        grupos.clear();
        if (novosGrupos != null) {
            grupos.addAll(novosGrupos);
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
        CatalogDb.GrupoRow grupo = grupos.get(position);
        holder.nome.setText(grupo.nome);
        holder.preco.setVisibility(View.GONE);
        ProdutoImagemHelper.carregar(holder.imagem, grupo.imagem, grupo.caminhoimagem);
        holder.itemView.setOnClickListener(v -> listener.onClick(grupo));
    }

    @Override
    public int getItemCount() {
        return grupos.size();
    }

    static final class VH extends RecyclerView.ViewHolder {
        final ImageView imagem;
        final TextView nome;
        final TextView preco;

        VH(@NonNull View itemView) {
            super(itemView);
            imagem = itemView.findViewById(R.id.imgProduto);
            nome = itemView.findViewById(R.id.txtNomeProduto);
            preco = itemView.findViewById(R.id.txtPrecoProduto);
        }
    }
}
