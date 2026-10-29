package com.pos_mais_gestao.ui;

import android.content.Context;
import android.content.Intent;
import com.pos_mais_gestao.data.local.PrefsStore;
import com.pos_mais_gestao.ui.home.HomeActivity;
import com.pos_mais_gestao.ui.mesas.MesasActivity;

public final class PosDestino {
    private PosDestino() {}

    public static Class<?> hub(PrefsStore prefs) {
        return prefs != null && prefs.isModoPdvLocal() ? MesasActivity.class : HomeActivity.class;
    }

    public static Intent intentHub(Context context, PrefsStore prefs) {
        Intent intent = new Intent(context, hub(prefs));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        return intent;
    }
}
