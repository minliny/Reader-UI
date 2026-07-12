import io.reader.ui.contract.ScreenGraphCanonicalAsset;
import io.reader.ui.contract.ScreenGraphComponentNode;
import io.reader.ui.contract.ScreenGraphRegistry;
import io.reader.ui.contract.ScreenGraphRouteNode;
import io.reader.ui.contract.ScreenGraphRouteStatus;
import io.reader.ui.contract.ScreenGraphVariant;

public final class KotlinScreenGraphRegistrySmoke {
    public static void main(String[] args) {
        ScreenGraphRegistry registry = ScreenGraphRegistry.Companion.loadCanonical();
        require(registry.getDocument().getRoutes().size() == ScreenGraphCanonicalAsset.routeCount, "route count");

        int variants = 0;
        int components = 0;
        int bindings = 0;
        int stateEventEvidence = 0;
        ScreenGraphRouteNode alias = null;
        ScreenGraphRouteNode direct = null;
        for (ScreenGraphRouteNode route : registry.getDocument().getRoutes()) {
            variants += route.getVariants().size();
            if (alias == null && route.getStatus() == ScreenGraphRouteStatus.Alias) alias = route;
            if (direct == null && route.getStatus() == ScreenGraphRouteStatus.Direct) direct = route;
            for (ScreenGraphVariant variant : route.getVariants()) {
                int[] counts = walk(variant);
                components += counts[0];
                bindings += counts[1];
                stateEventEvidence += counts[2];
            }
        }
        require(variants == ScreenGraphCanonicalAsset.variantCount, "variant count");
        require(components == ScreenGraphCanonicalAsset.componentCount, "component count");
        require(bindings == ScreenGraphCanonicalAsset.bindingCount, "binding count");
        require(stateEventEvidence == ScreenGraphCanonicalAsset.stateEventEvidenceCount, "state event evidence count");
        require(alias != null && registry.resolve(alias.getRouteId()).getStatus() == ScreenGraphRouteStatus.Direct, "alias resolution");
        require(direct != null && !direct.getVariants().isEmpty(), "direct variant");
        ScreenGraphVariant variant = direct.getVariants().get(0);
        require(registry.variant(direct.getRouteId(), variant.getVariantId(), true).equals(variant), "variant lookup");
    }

    private static int[] walk(ScreenGraphVariant variant) {
        int[] counts = new int[] {0, 0, 0};
        for (ScreenGraphComponentNode component : variant.getComponents()) walk(component, counts);
        return counts;
    }

    private static void walk(ScreenGraphComponentNode component, int[] counts) {
        counts[0] += 1;
        counts[1] += component.getBindings().size();
        counts[2] += component.getStateEventEvidence().size();
        for (ScreenGraphComponentNode child : component.getChildren()) walk(child, counts);
    }

    private static void require(boolean condition, String label) {
        if (!condition) throw new IllegalStateException("Kotlin ScreenGraph smoke failed: " + label);
    }
}
