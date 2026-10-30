package com.maisgestao.nfe.ui.nfe;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.CheckBox;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;
import com.maisgestao.nfe.ui.NfeAppCompatActivity;
import com.google.android.material.button.MaterialButton;
import com.google.android.material.textfield.TextInputEditText;
import com.google.gson.JsonObject;
import com.maisgestao.nfe.NfeApplication;
import com.maisgestao.nfe.R;
import com.maisgestao.nfe.data.api.ApiClient;
import com.maisgestao.nfe.data.api.dto.NotaFiscalDto;
import com.maisgestao.nfe.util.UiExecutor;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class NfeDetailActivity extends NfeAppCompatActivity {
    public static final String EXTRA_NOTA_ID = "nota_id";

    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private ApiClient api;
    private String notaId;
    private TextView textDetalhe;
    private ProgressBar progress;
    private TextInputEditText inputJustificativa;
    private CheckBox checkConfirmarProducao;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_nfe_detail);

        api = ((NfeApplication) getApplication()).getApiClient();
        notaId = getIntent().getStringExtra(EXTRA_NOTA_ID);
        textDetalhe = findViewById(R.id.textDetalhe);
        progress = findViewById(R.id.progress);
        inputJustificativa = findViewById(R.id.inputJustificativa);
        checkConfirmarProducao = findViewById(R.id.checkConfirmarProducao);

        findViewById(R.id.btnDanfe).setOnClickListener(v -> abrirDanfe());
        findViewById(R.id.btnTransmitir).setOnClickListener(v -> transmitir());
        findViewById(R.id.btnCancelar).setOnClickListener(v -> cancelar());
        findViewById(R.id.btnInutilizar).setOnClickListener(v -> inutilizar());

        carregar();
    }

    private void carregar() {
        if (notaId == null) {
            finish();
            return;
        }
        progress.setVisibility(View.VISIBLE);
        UiExecutor.run(
                this,
                executor,
                () -> {
                    JsonObject response = api.buscarNota(notaId);
                    NotaFiscalDto nota = null;
                    if (response.has("notaFiscal")) {
                        nota = new com.google.gson.Gson().fromJson(response.get("notaFiscal"), NotaFiscalDto.class);
                    }
                    final NotaFiscalDto finalNota = nota;
                    runOnUiThread(() -> {
                        progress.setVisibility(View.GONE);
                        if (finalNota != null) {
                            textDetalhe.setText(formatNota(finalNota));
                        }
                    });
                },
                null,
                error -> {
                    progress.setVisibility(View.GONE);
                    Toast.makeText(this, error.getMessage(), Toast.LENGTH_LONG).show();
                });
    }

    private static String formatNota(NotaFiscalDto nota) {
        StringBuilder sb = new StringBuilder();
        sb.append("Número: ").append(nota.numeronotafiscal).append("\n");
        sb.append("Série: ").append(nota.serie).append("\n");
        sb.append("Chave: ").append(nota.chavenfe).append("\n");
        sb.append("Destinatário: ").append(nota.razaosocial).append("\n");
        sb.append("Total: ").append(nota.valortotalnota).append("\n");
        sb.append("Status: ").append(nota.status).append("\n");
        sb.append("Emissão: ").append(nota.datahoraemissao).append("\n");
        if (nota.mensagemtransmissaonfe != null) {
            sb.append("SEFAZ: ").append(nota.mensagemtransmissaonfe).append("\n");
        }
        return sb.toString();
    }

    private void abrirDanfe() {
        Intent intent = new Intent(this, DanfeActivity.class);
        intent.putExtra(DanfeActivity.EXTRA_NOTA_ID, notaId);
        startActivity(intent);
    }

    private void transmitir() {
        boolean confirmar = checkConfirmarProducao.isChecked();
        UiExecutor.run(
                this,
                executor,
                () -> api.transmitir(notaId, confirmar),
                () -> Toast.makeText(this, R.string.transmissao_solicitada, Toast.LENGTH_SHORT).show(),
                error -> Toast.makeText(this, error.getMessage(), Toast.LENGTH_LONG).show());
    }

    private void cancelar() {
        String justificativa = text(inputJustificativa);
        if (justificativa.length() < 15) {
            Toast.makeText(this, R.string.justificativa_curta, Toast.LENGTH_SHORT).show();
            return;
        }
        UiExecutor.run(
                this,
                executor,
                () -> api.cancelar(notaId, justificativa),
                () -> Toast.makeText(this, R.string.cancelamento_registrado, Toast.LENGTH_SHORT).show(),
                error -> Toast.makeText(this, error.getMessage(), Toast.LENGTH_LONG).show());
    }

    private void inutilizar() {
        String justificativa = text(inputJustificativa);
        if (justificativa.length() < 15) {
            Toast.makeText(this, R.string.justificativa_curta, Toast.LENGTH_SHORT).show();
            return;
        }
        UiExecutor.run(
                this,
                executor,
                () -> api.inutilizar(notaId, justificativa),
                () -> Toast.makeText(this, R.string.inutilizacao_registrada, Toast.LENGTH_SHORT).show(),
                error -> Toast.makeText(this, error.getMessage(), Toast.LENGTH_LONG).show());
    }

    private static String text(TextInputEditText edit) {
        return edit.getText() == null ? "" : edit.getText().toString().trim();
    }

    @Override
    protected void onDestroy() {
        executor.shutdownNow();
        super.onDestroy();
    }
}
