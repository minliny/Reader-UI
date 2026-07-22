plugins {
    id("org.jetbrains.kotlin.jvm")
}

group = "io.reader.ui"
version = "3.1.0"

java {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
}

kotlin {
    // Compile with the host JDK (Android Studio ships JBR 21) while preserving
    // the Android/host bytecode baseline. Requiring an installed JDK 17 here
    // made local composite builds fail before Kotlin compilation even started.
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
    }
}

dependencies {
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.3")
    testImplementation(kotlin("test"))
}

tasks.test {
    useJUnitPlatform()
}
