package com.pos_mais_gestao.ui;

import android.app.Activity;
import android.view.View;
import android.widget.TextView;
import com.pos_mais_gestao.R;

public final class OfflineBanner {
    private OfflineBanner() {}

    public static void bind(Activity activity, boolean online, String mensagem) {
        if (activity == null) {
            return;
        }
        View banner = activity.findViewById(R.id.bannerOffline);
        TextView txt = activity.findViewById(R.id.txtOffline);
        if (banner == null) {
            return;
        }
        banner.setVisibility(online ? View.GONE : View.VISIBLE);
        if (txt != null && !online) {
            txt.setText(mensagem == null || mensagem.trim().isEmpty()
                    ? activity.getString(R.string.sem_conexao_servidor)
                    : mensagem);
        }
    }
}
