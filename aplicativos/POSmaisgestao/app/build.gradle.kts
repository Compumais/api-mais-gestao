import org.gradle.api.tasks.testing.Test
import org.gradle.api.tasks.Sync
import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
}

val atualizacaoProperties = Properties().apply {
    val arquivo = rootProject.file("atualizacao.properties")
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
    namespace = "com.pos_mais_gestao"
    compileSdk {
        version = release(36) {
            minorApiLevel = 1
        }
    }

    defaultConfig {
        applicationId = "com.pos_mais_gestao"
        minSdk = 24
        targetSdk = 36
        versionCode = 14
        versionName = "1.12"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"

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

    buildTypes {
        release {
            optimization {
                enable = false
            }
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
    buildFeatures {
        buildConfig = true
    }
}

dependencies {
    implementation(libs.activity.ktx)
    implementation(libs.appcompat)
    implementation(libs.constraintlayout)
    implementation(libs.material)
    implementation(libs.okhttp)
    implementation(libs.gson)
    implementation(libs.recyclerview)
    implementation(libs.zxing.android.embedded)
    implementation(libs.coil)
    implementation(libs.usb.serial)
    implementation(libs.security.crypto)
    testImplementation(libs.junit)
    testImplementation(libs.mockwebserver)
    testRuntimeOnly(libs.junit)
    androidTestImplementation(libs.espresso.core)
    androidTestImplementation(libs.ext.junit)
}

afterEvaluate {
    val androidUnitTest = tasks.named<Test>("testDebugUnitTest")
    val stagedClasses = File(
        System.getProperty("java.io.tmpdir"),
        "pos-mais-gestao-unit-classes"
    )
    val stageUnitTests = tasks.register<Sync>("stagePosDebugUnitTests") {
        dependsOn("compileDebugUnitTestJavaWithJavac")
        from(
            layout.buildDirectory.dir(
                "intermediates/javac/debugUnitTest/compileDebugUnitTestJavaWithJavac/classes"
            ),
            layout.buildDirectory.dir(
                "intermediates/javac/debug/compileDebugJavaWithJavac/classes"
            )
        )
        into(stagedClasses)
    }
    val runPosUnitTests = tasks.register<Test>("runPosDebugUnitTests") {
        group = "verification"
        description = "Executa os testes JVM do POS com classpath explícito."
        dependsOn(
            stageUnitTests,
            "processDebugUnitTestJavaRes",
            "bundleDebugClassesToRuntimeJar",
            "processDebugJavaRes"
        )
        testClassesDirs = files(stagedClasses)
        classpath = files(stagedClasses, androidUnitTest.get().classpath.files)
        useJUnit()
    }
    androidUnitTest.configure {
        dependsOn(runPosUnitTests)
        filter {
            excludeTestsMatching("*")
            isFailOnNoMatchingTests = false
        }
    }
}
