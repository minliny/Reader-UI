pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "Reader-UI"

include(":reader-ui-contract")
include(":reader-ui-runtime")
project(":reader-ui-runtime").projectDir = file("packages/kotlin/reader-ui-runtime")
