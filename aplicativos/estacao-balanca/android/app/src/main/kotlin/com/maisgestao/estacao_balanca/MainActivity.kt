package com.maisgestao.estacao_balanca

import android.content.ClipData
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.FileProvider
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.io.File
import java.security.MessageDigest

class MainActivity : FlutterActivity() {
    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CANAL_IMPRESSORA)
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
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CANAL_ATUALIZACAO)
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    "config" -> result.success(
                        mapOf(
                            "base" to BuildConfig.UTILITY_UPDATE_BASE,
                            "hash" to BuildConfig.UTILITY_UPDATE_HASH,
                        ),
                    )
                    "sha256Instalado" -> {
                        try {
                            result.success(sha256(File(applicationInfo.sourceDir)))
                        } catch (e: Exception) {
                            result.error("sha256", e.message, null)
                        }
                    }
                    "podeInstalar" -> result.success(podeInstalar())
                    "abrirPermissaoInstalacao" -> {
                        val destino = Intent(
                            Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                            Uri.parse("package:$packageName"),
                        )
                        startActivity(destino)
                        result.success(null)
                    }
                    "instalar" -> {
                        val caminho = call.argument<String>("caminho")
                        if (caminho.isNullOrBlank()) {
                            result.error("caminho", "APK ausente", null)
                            return@setMethodCallHandler
                        }
                        try {
                            instalar(File(caminho))
                            result.success(null)
                        } catch (e: Exception) {
                            result.error("instalar", e.message, null)
                        }
                    }
                    else -> result.notImplemented()
                }
            }
    }

    private fun podeInstalar(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return true
        return packageManager.canRequestPackageInstalls()
    }

    private fun instalar(arquivo: File) {
        val raiz = filesDir.canonicalFile
        val alvo = arquivo.canonicalFile
        val prefixo = raiz.path.trimEnd('/', '\\') + File.separator
        if (!alvo.path.startsWith(prefixo) || !alvo.isFile) {
            error("APK fora da pasta do aplicativo")
        }
        val uri = FileProvider.getUriForFile(this, "$packageName.fileprovider", alvo)
        val intent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, MIME_APK)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            clipData = ClipData.newRawUri("", uri)
        }
        startActivity(intent)
    }

    private fun sha256(arquivo: File): String {
        val digest = MessageDigest.getInstance("SHA-256")
        arquivo.inputStream().use { entrada ->
            val buffer = ByteArray(8192)
            while (true) {
                val lido = entrada.read(buffer)
                if (lido < 0) break
                digest.update(buffer, 0, lido)
            }
        }
        return digest.digest().joinToString("") { "%02x".format(it.toInt() and 0xff) }
    }

    companion object {
        private const val CANAL_IMPRESSORA = "estacao_balanca/impressora"
        private const val CANAL_ATUALIZACAO = "estacao_balanca/atualizacao"
        private const val MIME_APK = "application/vnd.android.package-archive"
    }
}
