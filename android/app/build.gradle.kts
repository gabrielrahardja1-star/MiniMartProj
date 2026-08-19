import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("com.google.devtools.ksp")
}

val keystorePropertiesFile = rootProject.file("keystore.properties")
val keystoreProperties = Properties()
val hasSigningConfig = keystorePropertiesFile.exists()
if (hasSigningConfig) {
    keystoreProperties.load(keystorePropertiesFile.inputStream())
}

android {
    namespace = "com.minimart.field"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.minimart.field"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"

        // Only a cashier ever touches this tablet, so there's no login
        // screen - the app signs itself in with this fixed identity
        // silently in the background whenever there's connectivity (see
        // Repository.ensureLoggedIn()). The UI never waits on this: cached
        // products/workers from the last successful sync show immediately
        // regardless. Change these if the tablet should use a different
        // account.
        buildConfigField("String", "TABLET_EMPLOYEE_ID", "\"ADMIN001\"")
        buildConfigField("String", "TABLET_PIN", "\"0000\"")

        // Base URL is build-type specific (see below). Keeping it out of
        // source lets office staff repoint the app at a new server without
        // a code change — just a different build.
        buildConfigField("boolean", "CLEARTEXT_ALLOWED", "false")
    }

    signingConfigs {
        if (hasSigningConfig) {
            create("release") {
                storeFile = file(keystoreProperties.getProperty("storeFile"))
                storePassword = keystoreProperties.getProperty("storePassword")
                keyAlias = keystoreProperties.getProperty("keyAlias")
                keyPassword = keystoreProperties.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        debug {
            // Debug builds only: allows HTTP (cleartext) so the app can be
            // tested against a local/dev backend that isn't on HTTPS yet.
            // NEVER enable this for release builds against production.
            buildConfigField("String", "API_BASE_URL", "\"http://76.13.19.246:8000/\"")
            buildConfigField("boolean", "CLEARTEXT_ALLOWED", "true")
            manifestPlaceholders["cleartextAllowed"] = "true"
            applicationIdSuffix = ".debug"
        }
        release {
            // TEMPORARY: Hostinger VPS is plain HTTP (no TLS provisioned
            // yet), so cleartext is allowed here so the app works today.
            // Switch this to https:// and flip CLEARTEXT_ALLOWED back to
            // false once HTTPS is set up on the server — see android/README.md.
            buildConfigField("String", "API_BASE_URL", "\"http://76.13.19.246:8000/\"")
            buildConfigField("boolean", "CLEARTEXT_ALLOWED", "true")
            manifestPlaceholders["cleartextAllowed"] = "true"
            isMinifyEnabled = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            if (hasSigningConfig) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
    implementation("androidx.activity:activity-compose:1.9.3")

    implementation(platform("androidx.compose:compose-bom:2024.12.01"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-core")
    implementation("androidx.navigation:navigation-compose:2.8.5")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")

    // Local offline-first storage
    implementation("androidx.room:room-runtime:2.6.1")
    implementation("androidx.room:room-ktx:2.6.1")
    ksp("androidx.room:room-compiler:2.6.1")

    // Background sync, survives process death / reboot
    implementation("androidx.work:work-runtime-ktx:2.10.0")

    // API client
    implementation("com.squareup.retrofit2:retrofit:2.11.0")
    implementation("com.squareup.retrofit2:converter-gson:2.11.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")

    // Encrypted token storage (Android Keystore-backed)
    implementation("androidx.security:security-crypto:1.1.0-alpha06")

    testImplementation("junit:junit:4.13.2")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.9.0")
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.6.1")
    androidTestImplementation(platform("androidx.compose:compose-bom:2024.12.01"))
    androidTestImplementation("androidx.compose.ui:ui-test-junit4")
    androidTestImplementation("androidx.work:work-testing:2.10.0")
    androidTestImplementation("androidx.room:room-testing:2.6.1")
}
