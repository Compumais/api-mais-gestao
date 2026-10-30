package com.maisgestao.nfe.util;

import android.app.Activity;
import android.widget.Toast;
import java.util.concurrent.ExecutorService;

public final class UiExecutor {
    private UiExecutor() {}

    public interface Task {
        void run() throws Exception;
    }

    public static void run(Activity activity, ExecutorService executor, Task task, Runnable onSuccess, OnError onError) {
        executor.execute(() -> {
            try {
                task.run();
                if (onSuccess != null) {
                    activity.runOnUiThread(() -> {
                        if (!activity.isFinishing() && !activity.isDestroyed()) {
                            onSuccess.run();
                        }
                    });
                }
            } catch (Exception error) {
                activity.runOnUiThread(() -> {
                    if (!activity.isFinishing() && !activity.isDestroyed()) {
                        if (onError != null) {
                            onError.onError(error);
                        } else {
                            Toast.makeText(activity, error.getMessage(), Toast.LENGTH_LONG).show();
                        }
                    }
                });
            }
        });
    }

    public interface OnError {
        void onError(Exception error);
    }
}
