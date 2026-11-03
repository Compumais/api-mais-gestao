package com.pos_selfpay

import android.content.Intent
import android.content.pm.PackageManager
import androidx.activity.result.contract.ActivityResultContracts
import io.flutter.embedding.android.FlutterFragmentActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterFragmentActivity() {
    private var pendente: MethodChannel.Result? = null

    private val launcher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { resultado ->
            val callback = pendente
            pendente = null
            if (callback == null) {
                return@registerForActivityResult
            }
            val extras = HashMap<String, String?>()
            resultado.data?.extras?.let { bundle ->
                for (chave in bundle.keySet()) {
                    extras[chave] = bundle.get(chave)?.toString()
                }
            }
            callback.success(
                mapOf(
                    "resultCode" to resultado.resultCode,
                    "extras" to extras,
                ),
            )
        }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CANAL)
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    "disponivel" -> result.success(idhInstalado())
                    "transacionar" -> transacionar(extrasDe(call.argument<Map<*, *>>("extras")), result)
                    else -> result.notImplemented()
                }
            }
    }

    private fun extrasDe(bruto: Map<*, *>?): Map<String, String> {
        if (bruto == null) {
            return emptyMap()
        }
        val extras = HashMap<String, String>()
        for ((chave, valor) in bruto) {
            if (chave != null && valor != null) {
                extras[chave.toString()] = valor.toString()
            }
        }
        return extras
    }

    private fun transacionar(extras: Map<String, String>, result: MethodChannel.Result) {
        if (pendente != null) {
            result.error("ocupado", "Já existe uma transação TEF em andamento.", null)
            return
        }
        if (!idhInstalado()) {
            result.error("idh_ausente", "Intent Digital Hub não está instalado.", null)
            return
        }
        val intent = Intent(ACAO_TEF)
        extras.forEach { (chave, valor) -> intent.putExtra(chave, valor) }
        pendente = result
        try {
            launcher.launch(intent)
        } catch (erro: Exception) {
            pendente = null
            result.error("idh", erro.message ?: "Falha ao abrir o TEF.", null)
        }
    }

    @Suppress("DEPRECATION")
    private fun idhInstalado(): Boolean {
        val consulta = Intent(ACAO_TEF)
        return packageManager.resolveActivity(consulta, PackageManager.MATCH_DEFAULT_ONLY) != null
    }

    companion object {
        private const val CANAL = "com.pos_selfpay/tef"
        private const val ACAO_TEF = "com.elgin.e1.digitalhub.TEF"
    }
}
