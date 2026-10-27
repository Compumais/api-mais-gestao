import java.util.Properties

plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

val atualizacaoProperties = Properties().apply {
    val arquivo = rootProject.file("../atualizacao.properties")
    if (arquivo.exists()) {
        arquivo.inputStream().use { load(it) }
    }
}

fun atualizacao(nome: String, padrao: String): String {
    val ambiente = System.getenv(nome)?.trim().orEmpty()
    if (ambiente.isNotEmpty()) return ambiente
    return atualizacaoProperties.getProperty(nome)?.trim()?.takeIf { it.isNotEmpty() } ?: padrao
}

fun asBuildConfigString(valor: String): String =
    "\"" + valor.replace("\\", "\\\\").replace("\"", "\\\"") + "\""

android {
    namespace = "com.maisgestao.estacao_balanca"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        // TODO: Specify your own unique Application ID (https://developer.android.com/studio/build/application-id.html).
        applicationId = "com.maisgestao.estacao_balanca"
        minSdk = 24
        targetSdk = flutter.targetSdkVersion
        // Uses the version code from pubspec.yaml. When using split APKs, 1000 * ABI_VERSION
        // is added automatically by Flutter. (https://developer.android.com/studio/build/configure-apk-splits#configure-APK-versions)
        // You can force using the value of versionCode by specifying the `-P force-version-code-ignoring-abi=true`
        // flag during build.
        versionCode = flutter.versionCode
        versionName = flutter.versionName

        buildConfigField(
            "String",
            "UTILITY_UPDATE_BASE",
            asBuildConfigString(atualizacao("COMPUTICKET_UPDATE_BASE", "https://www.computicket.space")),
        )
        buildConfigField(
            "String",
            "UTILITY_UPDATE_HASH",
            asBuildConfigString(atualizacao("COMPUTICKET_UPDATE_HASH", "")),
        )
    }

    buildFeatures {
        buildConfig = true
    }

    buildTypes {
        release {
            // TODO: Add your own signing config for the release build.
            // Signing with the debug keys for now, so `flutter run --release` works.
            signingConfig = signingConfigs.getByName("debug")
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}
