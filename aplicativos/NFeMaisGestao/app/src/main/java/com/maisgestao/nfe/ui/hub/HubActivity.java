package com.maisgestao.nfe.ui.hub;

import android.os.Bundle;
import android.widget.TextView;
import androidx.fragment.app.Fragment;
import com.google.android.material.bottomnavigation.BottomNavigationView;
import com.maisgestao.nfe.NfeApplication;
import com.maisgestao.nfe.R;
import com.maisgestao.nfe.ui.NfeAppCompatActivity;

public class HubActivity extends NfeAppCompatActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_hub);

        TextView subtitle = findViewById(R.id.textHubSubtitle);
        String empresa = ((NfeApplication) getApplication()).getPrefsStore().getEmpresaNome();
        if (empresa != null && !empresa.isEmpty()) {
            subtitle.setText(getString(R.string.empresa_atual, empresa));
        }

        BottomNavigationView bottomNav = findViewById(R.id.bottomNav);
        if (savedInstanceState == null) {
            showFragment(new InicioFragment());
            bottomNav.setSelectedItemId(R.id.nav_inicio);
        }

        bottomNav.setOnItemSelectedListener(item -> {
            Fragment fragment;
            int id = item.getItemId();
            if (id == R.id.nav_inicio) {
                fragment = new InicioFragment();
            } else if (id == R.id.nav_nfe) {
                fragment = new NfeFragment();
            } else if (id == R.id.nav_produtos) {
                fragment = new ProdutosFragment();
            } else if (id == R.id.nav_clientes) {
                fragment = new ClientesFragment();
            } else if (id == R.id.nav_mais) {
                fragment = new MaisFragment();
            } else {
                return false;
            }
            showFragment(fragment);
            return true;
        });
    }

    private void showFragment(Fragment fragment) {
        getSupportFragmentManager()
                .beginTransaction()
                .replace(R.id.hubContainer, fragment)
                .commit();
    }

    @Override
    protected int getBottomBarId() {
        return R.id.bottomNav;
    }
}
