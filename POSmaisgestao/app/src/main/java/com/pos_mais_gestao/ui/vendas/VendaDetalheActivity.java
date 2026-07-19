package com.pos_mais_gestao.ui.vendas;

import android.os.Bundle;
import android.view.View;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.google.android.material.appbar.MaterialToolbar;
import com.google.android.material.button.MaterialButton;
import com.pos_mais_gestao.PosApplication;
import com.pos_mais_gestao.R;
import com.pos_mais_gestao.data.api.ApiClient;
import com.pos_mais_gestao.data.api.ApiException;
import com.pos_mais_gestao.data.api.VendaItemDetalheDto;
import com.pos_mais_gestao.data.api.VendaResumoDto;
import com.pos_mais_gestao.hardware.ImpressoraPos;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class VendaDetalheActivity extends AppCompatActivity {
    public static final String EXTRA_VENDA = "venda";

    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private ApiClient api;
    private ImpressoraPos impressora;
    private VendaResumoDto venda;
    private VendaItemAdapter adapter;
    private List<VendaItemDetalheDto> itensCarregados;

    private ProgressBar progress;
    private TextView txtSemItens;
    private MaterialButton btnReimprimir;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_venda_detalhe);

        PosApplication app = (PosApplication) getApplication();
        api = app.getApiClient();
        impressora = app.getImpressoraPos();

        Object raw = getIntent().getSerializableExtra(EXTRA_VENDA);
        if (!(raw instanceof VendaResumoDto)) {
            Toast.makeText(this, R.string.venda_invalida, Toast.LENGTH_SHORT).show();
            finish();
            return;
        }
        venda = (VendaResumoDto) raw;

        MaterialToolbar toolbar = findViewById(R.id.toolbarVendaDetalhe);
        setSupportActionBar(toolbar);
        toolbar.setNavigationOnClickListener(v -> finish());

        progress = findViewById(R.id.progressDetalhe);
        txtSemItens = findViewById(R.id.txtSemItensDetalhe);
        btnReimprimir = findViewById(R.id.btnReimprimirCupom);

        TextView txtTipo = findViewById(R.id.txtDetalheTipo);
        TextView txtCodigo = findViewById(R.id.txtDetalheCodigo);
        TextView txtData = findViewById(R.id.txtDetalheData);
        TextView txtPagamento = findViewById(R.id.txtDetalhePagamento);
        TextView txtTotal = findViewById(R.id.txtDetalheTotal);

        boolean pdv = venda.tipo == VendaResumoDto.Tipo.PDV;
        if (pdv) {
            String tipo = venda.mesa
                    ? getString(R.string.tipo_venda_mesa)
                    : getString(R.string.tipo_venda_balcao);
            if (venda.numeropdv != null) {
                tipo = tipo + " · PDV " + venda.numeropdv;
            }
            txtTipo.setText(tipo);
        } else {
            txtTipo.setText(R.string.tipo_pedido_pos);
        }
        txtCodigo.setText(getString(R.string.codigo_pedido, venda.codigo != null ? venda.codigo : "—"));
        txtData.setText(VendaAdapter.formatarData(venda.dataHora));
        txtPagamento.setText(venda.pagamentosResumo != null ? venda.pagamentosResumo : "—");
        txtTotal.setText(getString(R.string.total, VendaAdapter.formatarValor(venda.valorTotal)));

        adapter = new VendaItemAdapter();
        RecyclerView lista = findViewById(R.id.listaItensVenda);
        lista.setLayoutManager(new LinearLayoutManager(this));
        lista.setAdapter(adapter);

        boolean podeCupom = venda.idNotaFiscal != null && !venda.idNotaFiscal.isEmpty();
        btnReimprimir.setVisibility(View.VISIBLE);
        btnReimprimir.setText(podeCupom ? R.string.reimprimir_danfce : R.string.reimprimir_comprovante);
        btnReimprimir.setOnClickListener(v -> reimprimir());

        carregarItens();
    }

    private void carregarItens() {
        progress.setVisibility(View.VISIBLE);
        executor.execute(() -> {
            try {
                List<VendaItemDetalheDto> itens = venda.tipo == VendaResumoDto.Tipo.PDV
                        ? api.listarItensVendaPdv(venda.id)
                        : api.listarItensDav(venda.id);
                runOnUiThread(() -> {
                    progress.setVisibility(View.GONE);
                    itensCarregados = itens;
                    adapter.setItens(itens);
                    txtSemItens.setVisibility(itens == null || itens.isEmpty() ? View.VISIBLE : View.GONE);
                });
            } catch (ApiException e) {
                runOnUiThread(() -> {
                    progress.setVisibility(View.GONE);
                    Toast.makeText(this, e.getMessage(), Toast.LENGTH_LONG).show();
                });
            }
        });
    }

    private void reimprimir() {
        btnReimprimir.setEnabled(false);
        executor.execute(() -> {
            try {
                String texto;
                if (venda.idNotaFiscal != null && !venda.idNotaFiscal.isEmpty()) {
                    texto = api.buscarTextoCupomNfce(venda.idNotaFiscal);
                } else {
                    texto = montarComprovanteSimples();
                }
                impressora.imprimirTexto(texto);
                runOnUiThread(() -> {
                    btnReimprimir.setEnabled(true);
                    Toast.makeText(this, R.string.comprovante_enviado, Toast.LENGTH_SHORT).show();
                });
            } catch (Exception e) {
                runOnUiThread(() -> {
                    btnReimprimir.setEnabled(true);
                    Toast.makeText(this, e.getMessage(), Toast.LENGTH_LONG).show();
                });
            }
        });
    }

    private String montarComprovanteSimples() {
        StringBuilder sb = new StringBuilder();
        sb.append("MAIS GESTAO - POS\n");
        sb.append("COMPROVANTE NAO FISCAL\n");
        sb.append("--------------------------------\n");
        if (venda.codigo != null) {
            sb.append("Codigo: ").append(venda.codigo).append("\n");
        }
        if (venda.dataHora != null) {
            sb.append(VendaAdapter.formatarData(venda.dataHora)).append("\n");
        }
        sb.append("--------------------------------\n");
        if (itensCarregados != null) {
            for (VendaItemDetalheDto item : itensCarregados) {
                sb.append(item.quantidade != null ? item.quantidade : "1")
                        .append("x ")
                        .append(item.nome != null ? item.nome : "Item")
                        .append("\n");
            }
        }
        sb.append("--------------------------------\n");
        sb.append("TOTAL ").append(VendaAdapter.formatarValor(venda.valorTotal)).append("\n");
        if (venda.pagamentosResumo != null) {
            sb.append(venda.pagamentosResumo).append("\n");
        }
        sb.append("--------------------------------\n");
        return sb.toString();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        executor.shutdownNow();
    }
}
