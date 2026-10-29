package com.pos_mais_gestao.ui.mesas;

import com.pos_mais_gestao.data.api.ContaMesaDto;

public class MesaGradeItem {
    public final int numero;
    public final ContaMesaDto conta;

    public MesaGradeItem(int numero, ContaMesaDto conta) {
        this.numero = numero;
        this.conta = conta;
    }

    public boolean isOcupada() {
        return conta != null && conta.id != null;
    }
}
