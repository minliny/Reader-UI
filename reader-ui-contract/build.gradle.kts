plugins {
    id("org.jetbrains.kotlin.jvm")
    id("org.jetbrains.kotlin.plugin.serialization")
}

group = "io.reader.ui"
version = "3.0.0"

java {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
}

kotlin {
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
    }
}

dependencies {
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.3")
}

// Expose the AUTO-GENERATED contract sources from /generated/kotlin as this module's main source set.
// This keeps Reader UI as the single source of truth; the module only wraps the generated files
// for Gradle consumption by platform repos (Android via composite build, others as needed).
sourceSets {
    getByName("main") {
        kotlin.srcDir("../generated/kotlin")
    }
}
