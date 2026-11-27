// GENERATED FILE — DO NOT EDIT.
// Generator: scripts/generate-m1-ui.mjs
// Input: theme/design-metrics.json  ee9faa0aed4f7daab49744cacb248ebd1ecbc5c244bc553be95423990d5dbbfd
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
    public const val minimumActionTarget: Int = 44
    public const val compactControlHeight: Int = 32
    public const val searchResultOuterInset: Int = 20
    public const val searchResultCoverToContent: Double = 0.19142857142857142
    public const val searchResultCoverAspect: Double = 1.5
    public const val searchResultCoverCompactMaxWidth: Int = 67
    public const val searchResultCoverExpandedMaxWidth: Int = 80
    public const val searchFilterIconSize: Int = 20
    public const val onlineDetailCoverWidth: Int = 86
    public const val onlineDetailCoverHeight: Int = 118
    public const val onlineDetailCoverRadius: Int = 8
    public const val sourceRowIconSize: Int = 34
    public const val sourceStatusChipGap: Int = 5
    public const val sourceRowLoginStatusWidth: Int = 58
    public const val sourceRowLoginStatusHeight: Int = 26
    public const val sourceFormFieldHeight: Int = 40
    public const val sourceImportStepDiameter: Int = 20
    public const val sourceImportPasteHeight: Int = 168
    public const val sourceCheckActionSize: Int = 28
    public const val sourceCheckStageBadgeWidth: Int = 29
    public const val sourceCheckStageBadgeHeight: Int = 24
    public const val sourceCheckStatusDotSize: Int = 8
    public const val sourceTransferBadgeRadius: Int = 5
    public const val sourceTransferBadgeInlinePadding: Int = 6
    public const val sourceTransferBadgeBlockPadding: Int = 2
    public const val sourceLoginToolbarMinHeight: Int = 48
    public const val sourceLoginProgressHeight: Int = 2
    public const val sourceLoginLockSize: Int = 11
    public const val sourceLoginActionIconSize: Int = 16
    public const val downloadCoverWidth: Int = 54
    public const val downloadCoverHeight: Int = 80
    public const val downloadCoverRadius: Int = 5
    public const val downloadStatusHeight: Int = 28
    public const val downloadChapterRowHeight: Int = 53
    public const val sourceSwitchDrawerRadius: Int = 22
    public const val sourceSwitchDrawerMaxWidth: Int = 390
    public const val sourceSwitchRowHeight: Int = 50
    public const val sourceSwitchTimingColumnWidth: Int = 72
    public const val sourceSwitchNarrowTimingColumnWidth: Int = 64
    public const val downloadProgressTrackHeight: Int = 3
    public const val downloadProgressTrackRadius: Int = 3
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
    public val searchFieldText = ReaderTypographyMetric(14.0, 21.0, 400, ReaderTypographyFamily.UI)
    public val sourceFilterFieldText = ReaderTypographyMetric(13.0, 18.0, 400, ReaderTypographyFamily.UI)
    public val onlineBookResultTitle = ReaderTypographyMetric(16.0, 24.0, 700, ReaderTypographyFamily.UI)
    public val searchResultAuthor = ReaderTypographyMetric(10.5, 16.3, 400, ReaderTypographyFamily.UI)
    public val searchResultChapter = ReaderTypographyMetric(10.0, 16.0, 400, ReaderTypographyFamily.UI)
    public val searchResultIntro = ReaderTypographyMetric(11.0, 18.7, 400, ReaderTypographyFamily.UI)
    public val searchResultTag = ReaderTypographyMetric(9.5, 15.2, 400, ReaderTypographyFamily.UI)
    public val onlineDetailTitle = ReaderTypographyMetric(20.0, 26.0, 700, ReaderTypographyFamily.UI)
    public val onlineDetailWideTitle = ReaderTypographyMetric(18.0, 23.0, 700, ReaderTypographyFamily.UI)
    public val onlineReadingMetadata = ReaderTypographyMetric(13.0, 20.0, 400, ReaderTypographyFamily.UI)
    public val compactMetadata = ReaderTypographyMetric(11.0, 18.0, 400, ReaderTypographyFamily.UI)
    public val onlineDetailSummary = ReaderTypographyMetric(13.0, 24.0, 400, ReaderTypographyFamily.UI)
    public val onlineDetailAction = ReaderTypographyMetric(13.0, 14.3, 700, ReaderTypographyFamily.UI)
    public val sourceRowTitle = ReaderTypographyMetric(14.0, 22.0, 500, ReaderTypographyFamily.UI)
    public val sourceStatusText = ReaderTypographyMetric(11.0, 16.0, 400, ReaderTypographyFamily.UI)
    public val sourceTransferBadgeText = ReaderTypographyMetric(10.0, 16.0, 500, ReaderTypographyFamily.UI)
    public val sourceSwitchHeading = ReaderTypographyMetric(24.0, 32.4, 700, ReaderTypographyFamily.UI)
    public val sourceSwitchBookTitle = ReaderTypographyMetric(18.0, 25.2, 700, ReaderTypographyFamily.UI)
    public val sourceSwitchCandidateName = ReaderTypographyMetric(14.0, 20.0, 500, ReaderTypographyFamily.UI)
    public val sourceLoginTitle = ReaderTypographyMetric(14.5, 21.75, 700, ReaderTypographyFamily.UI)
    public val sourceLoginAddress = ReaderTypographyMetric(10.5, 15.75, 400, ReaderTypographyFamily.UI)
    public val sourceLoginControlLabel = ReaderTypographyMetric(12.0, 18.0, 500, ReaderTypographyFamily.UI)
    public val downloadControl = ReaderTypographyMetric(12.0, 21.0, 400, ReaderTypographyFamily.UI)
    public val downloadMetadata = ReaderTypographyMetric(11.0, 21.0, 400, ReaderTypographyFamily.UI)
    public val downloadSectionLabel = ReaderTypographyMetric(13.0, 21.0, 400, ReaderTypographyFamily.UI)
    public val downloadSheetTitle = ReaderTypographyMetric(18.0, 26.0, 700, ReaderTypographyFamily.UI)
    public val downloadChapterTitle = ReaderTypographyMetric(12.0, 21.0, 500, ReaderTypographyFamily.UI)
}
