import org.gradle.api.tasks.testing.Test
import org.gradle.api.tasks.Sync

plugins {
    alias(libs.plugins.android.application)
}

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
