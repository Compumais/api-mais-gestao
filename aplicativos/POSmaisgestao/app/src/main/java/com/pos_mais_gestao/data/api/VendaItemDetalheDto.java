package com.pos_mais_gestao.data.api;

import java.io.Serializable;

public class VendaItemDetalheDto implements Serializable {
    public String id;
    public String idproduto;
    public String nome;
    public String quantidade;
    public String precounitario;
    public String precototal;
}
