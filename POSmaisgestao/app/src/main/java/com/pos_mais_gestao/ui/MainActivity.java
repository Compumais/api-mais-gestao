package com.pos_mais_gestao.ui;

import android.content.Intent;
import android.os.Bundle;
import androidx.appcompat.app.AppCompatActivity;
import com.pos_mais_gestao.PosApplication;
import com.pos_mais_gestao.data.local.PrefsStore;
import com.pos_mais_gestao.ui.empresa.EmpresaActivity;
import com.pos_mais_gestao.ui.home.HomeActivity;
import com.pos_mais_gestao.ui.login.LoginActivity;

public class MainActivity extends AppCompatActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        PrefsStore prefs = ((PosApplication) getApplication()).getPrefsStore();
        Intent intent;
        if (!prefs.isLoggedIn()) {
            intent = new Intent(this, LoginActivity.class);
        } else if (!prefs.hasEmpresa()) {
            intent = new Intent(this, EmpresaActivity.class);
        } else {
            intent = new Intent(this, HomeActivity.class);
        }
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        startActivity(intent);
        finish();
    }
}
