// swift-tools-version: 5.9
// Reader UI Contract + executable runtime — Swift Package
//
// 暴露 generated/swift/ 作为 ReaderUIContract library target，
// 供 iOS / macOS / iPadOS 平台仓库通过 .package(path:) 引用。
//
// 用法（在平台仓库的 Package.swift 中）：
//   .package(path: "../Reader UI")
//   .product(name: "ReaderUIContract", package: "Reader UI")
//   .product(name: "ReaderUIRuntime", package: "Reader UI")
//
// 规则：
// - ReaderUIContract 暴露 generated/swift/ 契约类型。
// - ReaderUIRuntime 暴露由 ui-spec/runtime-actions.json 驱动的纯状态机与 effects。
// - 平台仓库仍负责 native renderer 与 HostRequest 的真实执行。
// - generated/swift/ 由 tools/codegen/generate.mjs 自动生成，禁止手写覆盖。
// - schema 变更后必须重新生成 generated，否则 tools/codegen/check-drift.mjs 会失败。
// - 平台仓库不得复制 generated 文件，必须通过本 Package 引用。

import PackageDescription

let package = Package(
    name: "Reader UI",
    platforms: [
        .iOS(.v17),
        .macOS(.v13)
    ],
    products: [
        .library(name: "ReaderUIContract", targets: ["ReaderUIContract"]),
        .library(name: "ReaderUIRuntime", targets: ["ReaderUIRuntime"])
    ],
    targets: [
        .target(
            name: "ReaderUIContract",
            path: "generated/swift",
            exclude: ["README.md"]
        ),
        .target(
            name: "ReaderUIRuntime",
            path: "packages/swift/ReaderUIRuntime/Sources/ReaderUIRuntime"
        ),
        .testTarget(
            name: "ReaderUIRuntimeTests",
            dependencies: ["ReaderUIRuntime"],
            path: "packages/swift/ReaderUIRuntime/Tests/ReaderUIRuntimeTests"
        )
    ]
)
