package com.pos_mais_gestao;

import android.app.Application;
import com.pos_mais_gestao.data.api.ApiClient;
import com.pos_mais_gestao.data.local.PrefsStore;
import com.pos_mais_gestao.data.sync.OutboxSync;
import com.pos_mais_gestao.hardware.EscPosPrinter;
import com.pos_mais_gestao.hardware.ImpressoraPos;
import com.pos_mais_gestao.hardware.PagamentoHardware;
import com.pos_mais_gestao.hardware.StubPagamentoHardware;

public class PosApplication extends Application {
    private PrefsStore prefsStore;
    private ApiClient apiClient;
    private OutboxSync outboxSync;
    private ImpressoraPos impressoraPos;
    private PagamentoHardware pagamentoHardware;

    @Override
    public void onCreate() {
        super.onCreate();
        prefsStore = new PrefsStore(this);
        apiClient = new ApiClient(prefsStore);
        outboxSync = new OutboxSync(this, apiClient);
        impressoraPos = new EscPosPrinter(this);
        pagamentoHardware = new StubPagamentoHardware();
    }

    public PrefsStore getPrefsStore() {
        return prefsStore;
    }

    public ApiClient getApiClient() {
        return apiClient;
    }

    public OutboxSync getOutboxSync() {
        return outboxSync;
    }

    public ImpressoraPos getImpressoraPos() {
        return impressoraPos;
    }

    public PagamentoHardware getPagamentoHardware() {
        return pagamentoHardware;
    }
}
