package com.maisgestao.estacao_balanca

import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CANAL)
            .setMethodCallHandler { call, result ->
                if (call.method != "imprimir") {
                    result.notImplemented()
                    return@setMethodCallHandler
                }
                val texto = call.argument<String>("texto") ?: ""
                try {
                    ImpressoraInterna(this).imprimir(texto)
                    result.success(null)
                } catch (e: Exception) {
                    result.error("impressora", e.message ?: "Falha na impressora", null)
                }
            }
    }

    companion object {
        private const val CANAL = "estacao_balanca/impressora"
    }
}
