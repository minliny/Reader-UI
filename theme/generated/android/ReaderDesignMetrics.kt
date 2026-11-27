// GENERATED FILE — DO NOT EDIT.
// Generator: scripts/generate-m1-ui.mjs
// Input: theme/design-metrics.json  625cd2861d568f1f8ebd63c1a58a46cf677d43dbfd8cbcf4b6d71ef33d1502ae
package com.reader.core.theme

public enum class ReaderTypographyFamily { UI, LITERARY }
public data class ReaderTypographyMetric(
    public val fontSize: Double,
    public val lineHeight: Double,
    public val weight: Int,
    public val family: ReaderTypographyFamily,
)

public object ReaderDesignMetrics {
    public const val pillRadius: Int = 999
    public const val cardRadius: Int = 14
    public const val inputRadius: Int = 10
    public const val segmentedTrackRadius: Int = 12
    public const val badgeRadius: Int = 6
    public const val screenInset: Int = 19
    public const val spaceExtraSmall: Int = 8
    public const val spaceSmall: Int = 12
    public const val spaceMedium: Int = 16
    public const val spaceLarge: Int = 24
    public const val spaceExtraLarge: Int = 48
    public const val cardPadding: Int = 14
    public const val controlInlineSpacing: Int = 10
    public const val rowBlockSpacing: Int = 4
    public const val pressDayOpacity: Double = 0.08
    public const val pressNightOpacity: Double = 0.1
    public const val navigationPushMillis: Int = 260
    public const val navigationPopMillis: Int = 240
    public const val reducedMotionFadeMillis: Int = 120
    public const val shortFeedbackMillis: Int = 2000
    public const val wideBreakpoint: Int = 600
    public const val narrowBreakpoint: Int = 360
    public const val shelfCoverWidth: Int = 62
    public const val shelfCoverHeight: Int = 88
    public const val shelfCardPadding: Int = 12
    public const val shelfListColumnSpacing: Int = 10
    public const val shelfTitleMaxLines: Int = 2
    public const val shelfProgressStroke: Int = 3
    public const val readerParagraphSpacing: Int = 16
    public val appTitle = ReaderTypographyMetric(24.0, 32.0, 700, ReaderTypographyFamily.UI)
    public val pageTitle = ReaderTypographyMetric(17.0, 24.0, 700, ReaderTypographyFamily.UI)
    public val sectionHeading = ReaderTypographyMetric(13.0, 18.0, 500, ReaderTypographyFamily.UI)
    public val rowLabel = ReaderTypographyMetric(15.0, 21.0, 500, ReaderTypographyFamily.UI)
    public val rowDetail = ReaderTypographyMetric(12.0, 18.0, 400, ReaderTypographyFamily.UI)
    public val mainTabLabel = ReaderTypographyMetric(11.0, 18.0, 700, ReaderTypographyFamily.UI)
    public val shelfTitle = ReaderTypographyMetric(15.0, 20.0, 700, ReaderTypographyFamily.UI)
    public val shelfAuthor = ReaderTypographyMetric(12.0, 16.0, 400, ReaderTypographyFamily.UI)
    public val shelfChapter = ReaderTypographyMetric(12.0, 16.0, 400, ReaderTypographyFamily.UI)
    public val shelfProgress = ReaderTypographyMetric(11.0, 14.0, 400, ReaderTypographyFamily.UI)
    public val readerBody = ReaderTypographyMetric(18.0, 35.28, 400, ReaderTypographyFamily.LITERARY)
    public val readerControlBookTitle = ReaderTypographyMetric(16.0, 19.2, 700, ReaderTypographyFamily.UI)
    public val readerControlChapterTitle = ReaderTypographyMetric(13.0, 16.25, 700, ReaderTypographyFamily.UI)
    public val readerControlChapterSource = ReaderTypographyMetric(12.0, 14.4, 400, ReaderTypographyFamily.UI)
}
