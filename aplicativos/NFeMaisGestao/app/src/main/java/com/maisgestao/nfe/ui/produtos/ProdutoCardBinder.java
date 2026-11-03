package com.maisgestao.nfe.ui.produtos;

import android.view.View;
import android.widget.TextView;
import com.maisgestao.nfe.R;
import com.maisgestao.nfe.data.api.dto.ProdutoDto;

public final class ProdutoCardBinder {
    private ProdutoCardBinder() {}

    public static void bind(View card, ProdutoDto produto) {
        TextView nome = card.findViewById(R.id.textNome);
        TextView documento = card.findViewById(R.id.textDocumento);
        TextView contato = card.findViewById(R.id.textContato);
        TextView endereco = card.findViewById(R.id.textEndereco);
        nome.setText(produto.nomeExibicao());
        linha(documento, produto.codigoExibicao());
        linha(contato, produto.precoExibicao());
        linha(endereco, produto.detalheExibicao());
    }

    private static void linha(TextView view, String texto) {
        if (texto == null || texto.isEmpty()) {
            view.setVisibility(View.GONE);
            return;
        }
        view.setVisibility(View.VISIBLE);
        view.setText(texto);
    }
}
