package com.maisgestao.nfe.ui;

import android.os.Bundle;
import android.widget.TextView;
import androidx.annotation.IdRes;
import androidx.annotation.StringRes;
import androidx.appcompat.app.AppCompatActivity;
import com.maisgestao.nfe.R;
import com.maisgestao.nfe.util.UiInsets;

public abstract class NfeAppCompatActivity extends AppCompatActivity {

    @Override
    public void setTitle(CharSequence title) {
        super.setTitle(title);
        TextView headerTitle = findViewById(R.id.textHeaderTitle);
        if (headerTitle != null) {
            headerTitle.setText(title);
        }
    }

    @Override
    public void setTitle(@StringRes int titleId) {
        super.setTitle(titleId);
        TextView headerTitle = findViewById(R.id.textHeaderTitle);
        if (headerTitle != null) {
            headerTitle.setText(titleId);
        }
    }

    @Override
    protected void onPostCreate(Bundle savedInstanceState) {
        super.onPostCreate(savedInstanceState);
        if (getInsetsRootId() != 0) {
            UiInsets.setup(
                    this,
                    getInsetsRootId(),
                    getHeaderBleedId(),
                    getHeaderContentId(),
                    getBottomBarId());
        }
    }

    @IdRes
    protected int getInsetsRootId() {
        return R.id.screenRoot;
    }

    @IdRes
    protected int getHeaderBleedId() {
        return R.id.headerBleed;
    }

    @IdRes
    protected int getHeaderContentId() {
        return R.id.headerContent;
    }

    @IdRes
    protected int getBottomBarId() {
        return 0;
    }
}
