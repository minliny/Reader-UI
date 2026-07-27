import Foundation

@main
enum ScreenGraphRegistrySmoke {
    static func main() throws {
        let registry = try ScreenGraphRegistry.loadCanonical()
        precondition(registry.document.routes.count == ScreenGraphCanonicalAsset.routeCount)
        precondition(registry.document.routes.flatMap(\.variants).count == ScreenGraphCanonicalAsset.variantCount)

        var componentCount = 0
        var bindingCount = 0
        var stateEventEvidenceCount = 0
        func walk(_ components: [ScreenGraphComponentNode]) {
            for component in components {
                componentCount += 1
                bindingCount += component.bindings.count
                stateEventEvidenceCount += component.stateEventEvidence.count
                walk(component.children)
            }
        }
        for route in registry.document.routes {
            for variant in route.variants {
                walk(variant.components)
            }
        }
        precondition(componentCount == ScreenGraphCanonicalAsset.componentCount)
        precondition(bindingCount == ScreenGraphCanonicalAsset.bindingCount)
        precondition(stateEventEvidenceCount == ScreenGraphCanonicalAsset.stateEventEvidenceCount)

        let alias = try registry.document.routes.first { $0.status == .alias }.unwrap()
        let resolvedAlias = try registry.resolve(alias.routeId)
        precondition(resolvedAlias.status == .direct)
        let direct = try registry.document.routes.first { $0.status == .direct }.unwrap()
        let variant = try direct.variants.first.unwrap()
        let resolvedVariant = try registry.variant(for: direct.routeId, variantId: variant.variantId)
        precondition(resolvedVariant == variant)
    }
}

private extension Optional {
    func unwrap() throws -> Wrapped {
        guard let value = self else { throw ScreenGraphRegistryError.invalid("smoke fixture missing") }
        return value
    }
}
