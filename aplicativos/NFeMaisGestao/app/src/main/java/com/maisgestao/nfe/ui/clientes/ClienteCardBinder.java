package com.maisgestao.nfe.ui.clientes;

import android.view.View;
import android.widget.TextView;
import com.maisgestao.nfe.R;
import com.maisgestao.nfe.data.api.dto.EntidadeDto;

public final class ClienteCardBinder {
    private ClienteCardBinder() {}

    public static void bind(View card, EntidadeDto cliente) {
        TextView nome = card.findViewById(R.id.textNome);
        TextView documento = card.findViewById(R.id.textDocumento);
        TextView contato = card.findViewById(R.id.textContato);
        TextView endereco = card.findViewById(R.id.textEndereco);
        nome.setText(cliente.nomeExibicao());
        linha(documento, cliente.documentoExibicao());
        linha(contato, cliente.contatoExibicao());
        linha(endereco, cliente.enderecoExibicao());
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
