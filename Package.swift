// swift-tools-version: 5.9
// Reader UI Contract — Swift Package
//
// 暴露 generated/swift/ 作为 ReaderUIContract library target，
// 供 iOS / macOS / iPadOS 平台仓库通过 .package(path:) 引用。
//
// 用法（在平台仓库的 Package.swift 中）：
//   .package(path: "../Reader UI")
//   .product(name: "ReaderUIContract", package: "Reader UI")
//
// 规则：
// - 本 Package 只暴露 generated/swift/ 类型，不包含任何业务实现。
// - generated/swift/ 由 tools/codegen/generate.mjs 自动生成，禁止手写覆盖。
// - schema 变更后必须重新生成 generated，否则 tools/codegen/check-drift.mjs 会失败。
// - 平台仓库不得复制 generated 文件，必须通过本 Package 引用。

import PackageDescription

let package = Package(
    name: "Reader UI",
    products: [
        .library(name: "ReaderUIContract", targets: ["ReaderUIContract"])
    ],
    targets: [
        .target(
            name: "ReaderUIContract",
            path: "generated/swift",
            exclude: ["README.md"]
        )
    ]
)
