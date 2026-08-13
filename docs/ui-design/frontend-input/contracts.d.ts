export type PercentValue = number;

export interface StatusBarInput {
  time: string;
  battery?: string;
}

export interface NavItemInput<TType extends string = string> {
  label: string;
  active: boolean;
  type?: TType;
}

export type MainNavType = "bookshelf" | "discover" | "rss" | "settings";
export type MainNavLabel = "书架" | "发现" | "RSS" | "设置";

export interface MainNavItemInput {
  label: MainNavLabel;
  active: boolean;
  type: MainNavType;
}

export interface BookshelfGroupInput {
  label: string;
  active: boolean;
}

export interface BookshelfBookInput {
  title: string;
  author: string;
  chapter: string;
  progress: PercentValue;
  cover: string;
}

export interface ContinueReadingInput extends BookshelfBookInput {
  progressLabel: string;
}

export interface RecentUpdateInput {
  title: string;
  chapter: string;
  cover: string;
  unread: boolean;
}

export interface BookshelfFixture {
  status: StatusBarInput;
  topBar: {
    title: string;
  };
  groups: BookshelfGroupInput[];
  continueReading: ContinueReadingInput | null;
  recentUpdates: RecentUpdateInput[];
  books: BookshelfBookInput[];
  bottomNav: MainNavItemInput[];
}

export type BookshelfState = "default" | "filtering" | "loading" | "empty";

export type BookshelfEvent =
  | { type: "search" }
  | { type: "more" }
  | { type: "groupChange"; label: string }
  | { type: "read"; book: BookshelfBookInput }
  | { type: "sortFilter" }
  | { type: "settings" }
  | { type: "openBook"; book: BookshelfBookInput }
  | { type: "navChange"; navType: "bookshelf" | "discover" | "rss" | "settings" };

export interface ReaderStatusInput {
  left: string;
  time: string;
}

export interface ReaderQuickActionInput {
  label: string;
  type: "search" | "auto-page" | "replace";
}

export interface ReaderChapterProgressInput {
  title: string;
  progressLabel: string;
  progress: PercentValue;
  previousLabel: string;
  nextLabel: string;
}

export interface ReaderModuleInput {
  label: string;
  type: "directory" | "tts" | "appearance" | "settings";
  active?: boolean;
}

export interface ReaderBrightnessInput {
  title: string;
  modeLabel: string;
  autoLabel: string;
  value: PercentValue;
}

export interface ReaderControlFixture {
  status: ReaderStatusInput;
  topControl: {
    bookTitle: string;
    sourceLine: string;
    sourceActionLabel: string;
  };
  readingText: string[];
  quickActions: ReaderQuickActionInput[];
  chapterProgress: ReaderChapterProgressInput;
  moduleNav: ReaderModuleInput[];
  brightness: ReaderBrightnessInput;
  bottomReadout: {
    progress: string;
    chapter: string;
  };
}

export type ReaderControlState = "default" | "directory" | "tts" | "appearance" | "settings";

export type ReaderControlEvent =
  | { type: "back" }
  | { type: "sourceChange" }
  | { type: "more" }
  | { type: "quickAction"; actionType: ReaderQuickActionInput["type"] }
  | { type: "chapterChange"; direction: "previous" | "next" }
  | { type: "progressChange"; value: PercentValue }
  | { type: "moduleChange"; moduleType: ReaderModuleInput["type"] }
  | { type: "brightnessChange"; value: PercentValue };

export type ReadingTocTabType = "directory" | "bookmark";

export interface ReadingSegmentTabInput {
  label: "目录" | "书签";
  type: ReadingTocTabType;
  active: boolean;
}

export interface ReadingChapterRowInput {
  title: string;
  status: string;
  current: boolean;
  read: boolean;
}

export interface BookmarkRowInput {
  chapter: string;
  excerpt: string;
  location: string;
  time: string;
}

export interface ReadingMoreMenuItemInput {
  label: "缓存当前卷" | "只看未读" | string;
  desc: string;
}

export interface ReadingTocBookmarkFixture {
  status: ReaderStatusInput;
  topControl: ReaderControlFixture["topControl"];
  readingText: string[];
  panel: {
    title: "目录";
    meta: string;
    fullDirectoryLabel: string;
    searchPlaceholder: "搜索章节";
    tabs: ReadingSegmentTabInput[];
    currentVolume: string;
    returnProgressLabel: string;
    filterLabel: string;
  };
  chapters: ReadingChapterRowInput[];
  bookmarks: BookmarkRowInput[];
  search: {
    query: string;
    resultsLabel: string;
    results: ReadingChapterRowInput[];
  };
  moreMenu: {
    title: "更多";
    items: ReadingMoreMenuItemInput[];
  };
  feedback: {
    loading: BookActionFeedbackInput;
    empty: Required<BookActionFeedbackInput>;
    searchEmpty: Required<BookActionFeedbackInput>;
    error: Required<BookActionFeedbackInput>;
  };
  moduleNav: ReaderModuleInput[];
  brightness: ReaderBrightnessInput;
  bottomReadout: ReaderControlFixture["bottomReadout"];
}

export type ReadingTocBookmarkState = "default" | "bookmark" | "search" | "empty" | "loading" | "error" | "more_menu";

export type ReadingTocBookmarkEvent =
  | { type: "back" }
  | { type: "sourceChange" }
  | { type: "moreOpen" }
  | { type: "tabChange"; tabType: ReadingTocTabType }
  | { type: "searchChange"; value: string }
  | { type: "openFullDirectory" }
  | { type: "openChapter"; chapter: ReadingChapterRowInput }
  | { type: "openBookmark"; bookmark: BookmarkRowInput }
  | { type: "moreAction"; item: ReadingMoreMenuItemInput }
  | { type: "moduleChange"; moduleType: ReaderModuleInput["type"] }
  | { type: "brightnessChange"; value: PercentValue }
  | { type: "retry" };

export interface SegmentControlOptionInput {
  label: string;
  type: string;
  active: boolean;
}

export interface ThemeSwatchInput {
  label: string;
  type: string;
  background: string;
  text: string;
  active: boolean;
}

export interface FontOptionInput {
  label: string;
  meta: string;
  preview: string;
  active: boolean;
}

export interface AppearanceStepperInput {
  title: "字号" | string;
  value: number;
  minLabel: "-";
  plusLabel: "+";
}

export interface ReadingAppearanceFixture {
  status: ReaderStatusInput;
  topControl: ReaderControlFixture["topControl"];
  readingText: string[];
  panel: {
    title: "界面";
    subtitle: "阅读外观";
    moreLabel: string;
    fontTitle: "字体";
    fontPreviewLabel: string;
    animationTitle: "翻页动画";
    animationPreview: string;
    resetLabel: "恢复默认";
    saveLabel: string;
    savingLabel: string;
  };
  fontSize: AppearanceStepperInput;
  lineSpacing: {
    title: "行距";
    options: SegmentControlOptionInput[];
  };
  themes: ThemeSwatchInput[];
  fonts: FontOptionInput[];
  animations: SegmentControlOptionInput[];
  editTheme: {
    title: string;
    backgroundLabel: "背景";
    textLabel: string;
    previewTitle: string;
    previewCopy: string;
    colors: Array<{ label: string; value: string; active: boolean }>;
  };
  feedback: {
    loading: BookActionFeedbackInput;
    error: Required<BookActionFeedbackInput>;
    offline: Required<BookActionFeedbackInput>;
    saved: Omit<BookActionFeedbackInput, "primaryAction" | "secondaryAction">;
    failed: Omit<BookActionFeedbackInput, "primaryAction" | "secondaryAction">;
  };
  moduleNav: ReaderModuleInput[];
  brightness: ReaderBrightnessInput;
  bottomReadout: ReaderControlFixture["bottomReadout"];
}

export type ReadingAppearanceState = "default" | "font" | "theme" | "edit" | "loading" | "error";

export type ReadingAppearanceEvent =
  | { type: "back" }
  | { type: "sourceChange" }
  | { type: "fontSizeDecrease" }
  | { type: "fontSizeIncrease" }
  | { type: "lineSpacingChange"; option: SegmentControlOptionInput }
  | { type: "themeChange"; theme: ThemeSwatchInput }
  | { type: "fontChange"; font: FontOptionInput }
  | { type: "animationChange"; animation: SegmentControlOptionInput }
  | { type: "editThemeOpen" }
  | { type: "resetAppearance" }
  | { type: "saveTheme" }
  | { type: "moduleChange"; moduleType: ReaderModuleInput["type"] }
  | { type: "brightnessChange"; value: PercentValue }
  | { type: "retry" };

export interface AloudControlItemInput {
  label: string;
  value: string;
}

export interface VoiceOptionInput {
  label: string;
  meta: string;
  active: boolean;
}

export interface SpeedOptionInput {
  label: string;
  value: number;
  active: boolean;
}

export interface RunningCapsuleInput {
  title: string;
  pausedTitle: string;
  sentence: string;
  actionLabel: "暂停";
  continueLabel: "继续";
  settingsLabel: "设置";
}

export interface ReadingAloudFixture {
  status: ReaderStatusInput;
  topControl: ReaderControlFixture["topControl"];
  readingText: string[];
  panel: {
    title: "朗读";
    subtitle: string;
    settingsLabel: string;
    previousLabel: string;
    nextLabel: string;
    startLabel: "开始";
    pauseLabel: "暂停";
    continueLabel: "继续";
    stopLabel: string;
  };
  currentSentence: {
    text: string;
    label: string;
    progressLabel: string;
  };
  controls: {
    speed: AloudControlItemInput;
    voice: AloudControlItemInput;
    range: AloudControlItemInput;
    timer: AloudControlItemInput;
  };
  voices: VoiceOptionInput[];
  speedOptions: SpeedOptionInput[];
  runningCapsule: RunningCapsuleInput;
  feedback: {
    error: Required<BookActionFeedbackInput>;
    offline: Required<BookActionFeedbackInput>;
  };
  moduleNav: ReaderModuleInput[];
  brightness: ReaderBrightnessInput;
  bottomReadout: ReaderControlFixture["bottomReadout"];
}

export type ReadingAloudState = "default" | "running" | "paused" | "error";

export type ReadingAloudEvent =
  | { type: "back" }
  | { type: "sourceChange" }
  | { type: "startReadAloud" }
  | { type: "pauseReadAloud" }
  | { type: "continueReadAloud" }
  | { type: "previousSentence" }
  | { type: "nextSentence" }
  | { type: "speedChange"; option: SpeedOptionInput }
  | { type: "voiceChange"; voice: VoiceOptionInput }
  | { type: "timerChange"; value: string }
  | { type: "rangeChange"; value: string }
  | { type: "openReadAloudSettings" }
  | { type: "moduleChange"; moduleType: ReaderModuleInput["type"] }
  | { type: "brightnessChange"; value: PercentValue }
  | { type: "retry" };

export interface AutoPageSpeedInput {
  title: "翻页速度";
  valueLabel: string;
  value: PercentValue;
  slowLabel: "慢";
  fastLabel: "快";
}

export interface AutoPageModeInput {
  label: "滚动" | "翻页" | "仿真翻页";
  active: boolean;
}

export interface AutoPageOptionInput {
  title: string;
  meta: string;
  icon: string;
  enabled: boolean;
}

export interface AutoPageRunningCapsuleInput {
  title: "正在自动翻页";
  pausedTitle: "自动翻页已暂停";
  sentence: string;
  actionLabel: "暂停";
  continueLabel: "继续";
  stopLabel: "停止";
  settingsLabel: "设置";
}

export interface AutoPageControlInput {
  speed: AutoPageSpeedInput;
  modes: AutoPageModeInput[];
  runningCapsule: AutoPageRunningCapsuleInput;
  startLabel: "开始自动翻页";
  stopLabel: "停止";
}

export interface AutoPageFixture {
  status: ReaderStatusInput;
  topControl: {
    title: "自动翻页";
    sourceLine: string;
  };
  readingText: string[];
  speed: AutoPageSpeedInput;
  modes: AutoPageModeInput[];
  optionsTitle: "更多选项";
  options: AutoPageOptionInput[];
  actions: {
    cancelLabel: "取消";
    startLabel: "开始自动翻页";
    stopLabel: "停止";
  };
  runningCapsule: AutoPageRunningCapsuleInput;
  feedback: {
    error: Required<BookActionFeedbackInput>;
  };
}

export type AutoPageState = "default" | "running" | "paused" | "error";

export type AutoPageEvent =
  | { type: "close" }
  | { type: "more" }
  | { type: "speedChange"; value: PercentValue }
  | { type: "modeChange"; mode: AutoPageModeInput }
  | { type: "toggleOption"; option: AutoPageOptionInput }
  | { type: "startAutoPage" }
  | { type: "pauseAutoPage" }
  | { type: "continueAutoPage" }
  | { type: "stopAutoPage" }
  | { type: "retry" };

export interface ContentSearchFilterInput {
  label: "全部" | "章节名" | "正文" | "书签";
  active: boolean;
}

export interface ContentSearchResultInput {
  title: string;
  meta: string;
  excerpt: string;
  progressLabel: string;
}

export interface ContentSearchFixture {
  status: ReaderStatusInput;
  search: {
    label: "搜索本书内容";
    query: string;
    placeholder: "输入关键词";
    resultCount: string;
    clearLabel: "清空";
  };
  readingText: string[];
  panel: {
    title: "本书内容搜索";
    bookTitle: string;
    resultCount: string;
    tip: string;
  };
  filters: ContentSearchFilterInput[];
  results: ContentSearchResultInput[];
  feedback: {
    loading: BookActionFeedbackInput;
    empty: Required<BookActionFeedbackInput>;
    error: Required<BookActionFeedbackInput>;
    offline: Required<BookActionFeedbackInput>;
  };
}

export type ContentSearchState = "default" | "loading" | "empty" | "error" | "offline";

export type ContentSearchEvent =
  | { type: "close" }
  | { type: "queryChange"; value: string }
  | { type: "clear" }
  | { type: "filterChange"; filter: ContentSearchFilterInput }
  | { type: "previousResult" }
  | { type: "nextResult" }
  | { type: "openResult"; result: ContentSearchResultInput }
  | { type: "retry" };

export interface ReplacementRuleInput {
  title: string;
  meta: string;
  icon: string;
  enabled: boolean;
}

export interface ReplacementPreviewInput {
  title: "替换预览";
  beforeLabel: "原文";
  beforeText: string;
  afterLabel: "显示";
  afterText: string;
}

export interface ReplacementFormInput {
  beforeLabel: "替换前";
  beforeValue: string;
  afterLabel: "替换后";
  afterValue: string;
  testLabel: "测试";
  saveLabel: "保存";
}

export interface ContentReplacementFixture {
  status: ReaderStatusInput;
  topControl: {
    title: "内容替换";
    bookTitle: string;
    settingsLabel: "设置";
  };
  readingText: string[];
  panel: {
    title: "当前书规则";
    allRulesLabel: "全部规则";
    enableTitle: "启用内容替换";
    enableCopy: string;
    tempCloseLabel: "临时关闭";
    addRuleLabel: "新增规则";
  };
  enabled: boolean;
  rules: ReplacementRuleInput[];
  preview: ReplacementPreviewInput;
  form: ReplacementFormInput;
  feedback: {
    loading: BookActionFeedbackInput;
    empty: Required<BookActionFeedbackInput>;
    error: Required<BookActionFeedbackInput>;
  };
}

export type ContentReplacementState = "default" | "edit" | "empty" | "loading" | "error";

export type ContentReplacementEvent =
  | { type: "close" }
  | { type: "openSettings" }
  | { type: "toggleReplacement"; enabled: boolean }
  | { type: "toggleRule"; rule: ReplacementRuleInput }
  | { type: "openRule"; rule: ReplacementRuleInput }
  | { type: "addRule" }
  | { type: "patternChange"; value: string }
  | { type: "replacementChange"; value: string }
  | { type: "testReplacement" }
  | { type: "saveRule" }
  | { type: "temporaryClose" }
  | { type: "retry" };

export interface SourceCandidateInput {
  name: string;
  badge: string;
  chapter: string;
  updated: string;
  latency: string;
  status: "可用" | "失效" | "检测中";
  current: boolean;
  checking: boolean;
}

export interface SourceCheckingInput {
  title: "正在检查";
  steps: Array<{
    label: string;
    done: boolean;
  }>;
  status: "检测中";
}

export interface SourceSwitchReaderInput {
  title: string;
  chapter: string;
  currentSource: string;
  switchedSource: string;
  lines: string[];
  progress: string;
  chapterProgress: string;
}

export interface SourceSwitchControlInput {
  quickActions: ["搜索", "自动翻页", "替换"];
  modules: ["目录", "朗读", "界面", "设置"];
  brightness: "亮度";
  system: "系统";
  previousChapter: "上一章";
}

export interface SourceSwitchSheetInput {
  title: "换源";
  filters: string[];
  detectHint: string;
  cancelDetect: "取消检测";
}

export interface SourceSwitchSuccessInput {
  title: string;
  closeLabel: string;
}

export interface SourceSwitchFeedbackInput {
  loading: BookActionFeedbackInput;
  empty: Required<BookActionFeedbackInput>;
  error: Required<BookActionFeedbackInput>;
  offline: Required<BookActionFeedbackInput>;
  permission: Required<BookActionFeedbackInput>;
}

export interface SourceSwitchFixture {
  status: ReaderStatusInput;
  reader: SourceSwitchReaderInput;
  controls: SourceSwitchControlInput;
  sheet: SourceSwitchSheetInput;
  sources: SourceCandidateInput[];
  checking: SourceCheckingInput;
  success: SourceSwitchSuccessInput;
  feedback: SourceSwitchFeedbackInput;
}

export type SourceSwitchState = "default" | "loading" | "empty" | "error" | "offline" | "permission";

export type SourceSwitchEvent =
  | { type: "backToReading" }
  | { type: "openSourceSheet" }
  | { type: "filterChange"; filter: string }
  | { type: "startDetect" }
  | { type: "cancelDetect" }
  | { type: "switchSource"; source: SourceCandidateInput }
  | { type: "retry" }
  | { type: "grantPermission" };

export interface TapZoneInput {
  type: "previous" | "menu" | "next";
  label: string;
}

export interface ImmersiveReadingFixture {
  info: {
    topLeft: string;
    time: string;
    progress: string;
    chapterOnly: string;
  };
  reading: {
    title: string;
    paragraphs: string[];
  };
  zones: TapZoneInput[];
  feedback: {
    loading: BookActionFeedbackInput;
    error: Required<BookActionFeedbackInput>;
    offline: Required<BookActionFeedbackInput>;
  };
  rules: {
    chapterOnlyNote: string;
  };
}

export type ImmersiveReadingState = "default" | "loading" | "error" | "offline";

export type ImmersiveReadingEvent =
  | { type: "tapPrevious" }
  | { type: "tapCenter" }
  | { type: "tapNext" }
  | { type: "retry" }
  | { type: "continueCached" }
  | { type: "backToSource" };

export interface SettingGroupCardInput {
  title: string;
  meta: string;
  icon: string;
  target: string;
}

export interface PresetRowInput {
  title: string;
  value?: string;
  meta?: string;
  active?: boolean;
  icon?: string;
}

export interface ReadingAdvancedSettingInput {
  title: string;
  meta: string;
  enabled: boolean;
}

export interface ReadingSettingsSubpageRowInput {
  title: string;
  meta: string;
  type?: "segment" | "switch" | "stepper";
  options?: string[];
  active?: string | boolean;
  enabled?: boolean;
  value?: number;
}

export interface ReadingSettingsFixture {
  topBar: {
    title: "阅读设置";
    presetLabel: "预设";
  };
  quickPresets: PresetRowInput[];
  groups: SettingGroupCardInput[];
  advancedTitle: "高级设置";
  advanced: ReadingAdvancedSettingInput[];
  restore: {
    title: "恢复默认阅读设置";
    confirmTitle: "恢复默认";
    copy: string;
    cancelLabel: "取消";
    confirmLabel: "恢复默认";
  };
  subpage: {
    title: "屏幕与显示";
    subtitle: string;
    sections: Array<{
      title: string;
      rows: ReadingSettingsSubpageRowInput[];
    }>;
  };
  feedback: {
    loading: BookActionFeedbackInput;
    error: Required<BookActionFeedbackInput>;
    offline: Required<BookActionFeedbackInput>;
  };
  toast: {
    saved: "保存成功";
  };
}

export type ReadingSettingsState = "default" | "subpage" | "loading" | "error";

export type ReadingSettingsEvent =
  | { type: "back" }
  | { type: "openPreset" }
  | { type: "openGroup"; group: SettingGroupCardInput }
  | { type: "toggleSetting"; setting: ReadingAdvancedSettingInput }
  | { type: "segmentChange"; row: ReadingSettingsSubpageRowInput; value: string }
  | { type: "stepperChange"; row: ReadingSettingsSubpageRowInput; value: number }
  | { type: "presetApply"; preset: PresetRowInput }
  | { type: "restoreDefault" }
  | { type: "retry" };

export interface GeneralSettingsTopBarInput {
  title: "通用设置";
  backLabel: "返回";
}

export type GeneralSettingsRowType = "segment" | "select" | "switch";

export interface GeneralSettingsRowInput {
  type: GeneralSettingsRowType;
  icon: string;
  title: string;
  meta?: string;
  value?: string;
  options?: string[];
  enabled?: boolean;
  permission?: "已开启" | "待授权";
}

export interface GeneralSettingsGroupInput {
  title: string;
  rows: GeneralSettingsRowInput[];
}

export interface RestoreGeneralSettingsInput {
  title: "恢复通用设置";
  confirmTitle: string;
  copy: string;
  cancelLabel: "取消";
  confirmLabel: "确认恢复";
}

export interface SettingsToastInput {
  success: "保存成功";
  error: "操作失败，请重试";
  permission: "需要系统权限";
}

export interface GeneralSettingsFeedbackInput {
  loading: BookActionFeedbackInput;
  error: Required<BookActionFeedbackInput>;
  permission: Required<BookActionFeedbackInput>;
}

export interface GeneralSettingsFixture {
  topBar: GeneralSettingsTopBarInput;
  groups: GeneralSettingsGroupInput[];
  restore: RestoreGeneralSettingsInput;
  toast: SettingsToastInput;
  feedback: GeneralSettingsFeedbackInput;
}

export type GeneralSettingsState = "default" | "option_sheet" | "loading" | "error" | "permission";

export type GeneralSettingsEvent =
  | { type: "back" }
  | { type: "themeChange"; value: string }
  | { type: "selectOpen"; row: GeneralSettingsRowInput }
  | { type: "selectOption"; row: GeneralSettingsRowInput; value: string }
  | { type: "switchChange"; row: GeneralSettingsRowInput; enabled: boolean }
  | { type: "restoreOpen" }
  | { type: "restoreConfirm" }
  | { type: "retry" }
  | { type: "openSystemSettings" };

export interface SettingsKitTopBarInput {
  title: string;
  backLabel: "返回";
}

export interface SettingsKitRowInput {
  type: "link" | "select" | "switch" | "danger";
  icon: string;
  title: string;
  meta?: string;
  value?: string;
  status?: string;
  statusTone?: "good" | "warn" | "danger" | "info" | "muted";
  actionLabel?: string;
  enabled?: boolean;
  tone?: "danger";
}

export interface SettingsKitSectionInput {
  title: string;
  rows: SettingsKitRowInput[];
}

export interface SettingsKitConfirmInput {
  title: string;
  copy: string;
  cancelLabel: "取消";
  confirmLabel: string;
}

export interface SettingsKitToastInput {
  success?: string;
  error?: string;
  offline?: string;
  permission?: string;
}

export interface SettingsKitStateInput {
  key: string;
  title: string;
  desc: string;
  toast?: keyof SettingsKitToastInput;
}

export interface BookshelfSearchSettingsFixture {
  topBar: SettingsKitTopBarInput;
  bookshelf: {
    title: "书架";
    rows: Array<{
      type: "segment" | "select" | "switch" | "stepper";
      icon: string;
      title: string;
      meta?: string;
      value?: string;
      options?: string[];
      enabled?: boolean;
      minLabel?: string;
      maxLabel?: string;
    }>;
    preview: {
      coverTitle: string;
      listTitle: string;
      books: Array<{ title: string; meta: string; update: string; badge: string; cover: string }>;
    };
  };
  search: {
    title: "搜索";
    rows: GeneralSettingsRowInput[];
    danger: SettingsKitConfirmInput & { title: "清空搜索历史"; confirmTitle: string };
  };
  toast: SettingsKitToastInput;
  feedback: GeneralSettingsFeedbackInput;
}

export interface PrivacyPermissionsFixture {
  topBar: SettingsKitTopBarInput;
  sections: SettingsKitSectionInput[];
  actions: SettingsKitRowInput[];
  confirm: SettingsKitConfirmInput;
  toast: SettingsKitToastInput;
  states: SettingsKitStateInput[];
}

export interface CacheManagementFixture {
  topBar: SettingsKitTopBarInput;
  storage: {
    title: "缓存占用";
    value: string;
    percent: string;
    copy: string;
  };
  sections: SettingsKitSectionInput[];
  actions: SettingsKitRowInput[];
  confirm: SettingsKitConfirmInput;
  empty: Required<BookActionFeedbackInput>;
  toast: SettingsKitToastInput;
  states: SettingsKitStateInput[];
}

export interface AboutFeedbackFixture {
  topBar: SettingsKitTopBarInput;
  metrics: Array<{ icon: string; label: string; value: string }>;
  sections: SettingsKitSectionInput[];
  confirm: SettingsKitConfirmInput;
  toast: SettingsKitToastInput;
  states: SettingsKitStateInput[];
}

export interface SyncBackupFixture {
  topBar: SettingsKitTopBarInput;
  sections: SettingsKitSectionInput[];
  records: Array<{ icon: string; title: string; meta: string; status: string; tone: "good" | "info" | "warn" }>;
  confirm: SettingsKitConfirmInput;
  empty: Required<BookActionFeedbackInput>;
  toast: SettingsKitToastInput;
  states: SettingsKitStateInput[];
}

export interface SourceManagementFixture {
  topBar: SettingsKitTopBarInput;
  metrics: Array<{ icon: string; label: string; value: string }>;
  searchBox: { placeholder: string };
  filters: Array<{ label: string; active: boolean }>;
  groups: Array<{ label: string; active: boolean }>;
  sections: SettingsKitSectionInput[];
  sources: Array<{ title: string; meta: string; status: "可用" | "异常" | "未检测"; tone: "good" | "warn" | "muted"; enabled: boolean }>;
  fab: { icon: "add"; label: "新增" };
  form: { title: string; fields: Array<{ label: string; value: string }>; saveLabel: "保存" };
  log: { title: string; items: Array<{ level: "ERROR" | "WARN"; copy: string }> };
  confirm: SettingsKitConfirmInput;
  empty: Required<BookActionFeedbackInput>;
  toast: SettingsKitToastInput;
  states: SettingsKitStateInput[];
}

export type BookshelfSearchSettingsState = "default" | "option_sheet" | "confirm" | "loading" | "error" | "permission";
export type PrivacyPermissionsState = "default" | "confirm" | "loading" | "error" | "permission";
export type CacheManagementState = "default" | "loading" | "empty" | "confirm" | "error";
export type AboutFeedbackState = "default" | "loading" | "error" | "confirm" | "offline";
export type SyncBackupState = "default" | "confirm" | "loading" | "empty" | "error" | "offline" | "permission";
export type SourceManagementState = "default" | "edit" | "log" | "loading" | "empty" | "error" | "offline" | "permission";

export type BookshelfSearchSettingsEvent =
  | { type: "back" }
  | { type: "layoutChange"; value: string }
  | { type: "columnCountChange"; value: number }
  | { type: "selectOpen"; key: string }
  | { type: "selectOption"; key: string; value: string }
  | { type: "switchChange"; key: string; enabled: boolean }
  | { type: "clearHistoryOpen" }
  | { type: "clearHistoryConfirm" }
  | { type: "retry" }
  | { type: "openSystemSettings" };

export type PrivacyPermissionsEvent =
  | { type: "back" }
  | { type: "openSystemSettings"; permission: string }
  | { type: "togglePrivacyOption"; key: string; enabled: boolean }
  | { type: "openPrivacyPolicy" }
  | { type: "clearPrivacyDataOpen" }
  | { type: "clearPrivacyDataCancel" }
  | { type: "clearPrivacyDataConfirm" }
  | { type: "retry" };

export type CacheManagementEvent =
  | { type: "back" }
  | { type: "calculateCache" }
  | { type: "openCleanupConfirm"; category: string }
  | { type: "cleanupCancel" }
  | { type: "cleanupConfirm"; category: string }
  | { type: "toggleCacheStrategy"; key: string; enabled: boolean }
  | { type: "openCacheLocation" }
  | { type: "retry" };

export type AboutFeedbackEvent =
  | { type: "back" }
  | { type: "checkUpdate" }
  | { type: "openFeedback" }
  | { type: "openSuggestion" }
  | { type: "openRepository" }
  | { type: "openLicense" }
  | { type: "exportDiagnosticLog" }
  | { type: "openHelp" }
  | { type: "retry" };

export type SyncBackupEvent =
  | { type: "back" }
  | { type: "selectBackupLocation" }
  | { type: "runBackupNow" }
  | { type: "exportBackup" }
  | { type: "restoreBackup"; record: SyncBackupFixture["records"][number] }
  | { type: "restoreCancel" }
  | { type: "restoreConfirm"; record: SyncBackupFixture["records"][number] }
  | { type: "toggleAutoBackup"; enabled: boolean }
  | { type: "openWebDavSettings" }
  | { type: "resolveConflict"; choice: string }
  | { type: "retry" }
  | { type: "grantPermission" };

export type SourceManagementEvent =
  | { type: "back" }
  | { type: "queryChange"; value: string }
  | { type: "groupFilterChange"; group: string }
  | { type: "toggleSource"; source: SourceManagementFixture["sources"][number]; enabled: boolean }
  | { type: "detectSource"; source: SourceManagementFixture["sources"][number] }
  | { type: "detectAll" }
  | { type: "openSourceDetail"; source: SourceManagementFixture["sources"][number] }
  | { type: "openSourceEdit"; source: SourceManagementFixture["sources"][number] }
  | { type: "addSource" }
  | { type: "saveSource"; source: SourceManagementFixture["sources"][number] }
  | { type: "openLog"; source: SourceManagementFixture["sources"][number] }
  | { type: "retry" };

export type SettingsTone = "blue" | "orange" | "green" | "purple";

export interface SettingsOverviewItemInput {
  label: string;
  value: string;
  icon: string;
  tone: SettingsTone;
}

export interface SettingsQuickEntryInput {
  title: string;
  meta: string;
  icon: string;
  tone: SettingsTone;
  target: string;
}

export interface SettingsListItemInput {
  title: string;
  meta: string;
  icon: string;
  tone: SettingsTone;
  state: "" | "可用" | "未设置" | "待授权" | "需要处理";
}

export interface SettingsSectionInput {
  title: string;
  items: SettingsListItemInput[];
}

export interface SettingsHomeFixture {
  status: StatusBarInput;
  topBar: {
    title: string;
  };
  overview: {
    title: string;
    items: SettingsOverviewItemInput[];
  };
  quickEntries: SettingsQuickEntryInput[];
  sections: SettingsSectionInput[];
  bottomNav: MainNavItemInput[];
}

export type SettingsHomeState = "default" | "loading-overview" | "no-backup" | "permission-needed";

export type SettingsHomeEvent =
  | { type: "search" }
  | { type: "more" }
  | { type: "quickEntry"; target: string }
  | { type: "openSetting"; section: string; item: string }
  | { type: "navChange"; navType: "bookshelf" | "discover" | "rss" | "settings" };

export interface BookshelfEmptyGroupInput {
  label: string;
  active: boolean;
}

export interface BookshelfEmptyStateInput {
  title: string;
  copy: string;
  illustrationLabel?: string;
  primaryAction: string;
  secondaryAction: string;
  hint: string;
}

export interface BookshelfEmptyFixture {
  status: {
    time: string;
  };
  topBar: {
    title: string;
  };
  groups: BookshelfEmptyGroupInput[];
  emptyState: BookshelfEmptyStateInput;
  variants: {
    allEmpty: BookshelfEmptyStateInput;
    loading: BookshelfEmptyStateInput;
    error: BookshelfEmptyStateInput;
    offline: BookshelfEmptyStateInput;
    permission: BookshelfEmptyStateInput;
  };
  bottomNav: MainNavItemInput[];
}

export type BookshelfEmptyState = "default" | "all-empty" | "loading" | "error" | "offline" | "permission";

export type BookshelfEmptyEvent =
  | { type: "search" }
  | { type: "more" }
  | { type: "groupChange"; label: string }
  | { type: "primaryAction"; state: BookshelfEmptyState }
  | { type: "secondaryAction"; state: BookshelfEmptyState }
  | { type: "navChange"; navType: "bookshelf" | "discover" | "rss" | "settings" };

export type BookSearchScopeType = "local" | "network" | "global" | "group";

export interface BookSearchScopeInput {
  label: "本地" | "网络" | "全局" | "分组";
  type: BookSearchScopeType;
  active: boolean;
}

export interface BookSearchGroupInput {
  label: string;
  active: boolean;
}

export interface BookSearchResultInput {
  title: string;
  author: string;
  source: string;
  latest: string;
  meta: string;
  cover: string;
  inBookshelf: boolean;
}

export interface BookSearchFeedbackInput {
  title: string;
  copy: string;
  primaryAction: string;
}

export interface BookSearchFixture {
  status: StatusBarInput;
  topBar: {
    title: string;
  };
  search: {
    query: string;
    placeholder: string;
    clearLabel: string;
  };
  scopes: BookSearchScopeInput[];
  groupPanel: {
    title: string;
    copy: string;
    manageLabel: string;
    groups: BookSearchGroupInput[];
  };
  history: {
    title: string;
    clearLabel: string;
    items: string[];
  };
  results: BookSearchResultInput[];
  feedback: {
    loading: BookSearchFeedbackInput;
    empty: BookSearchFeedbackInput;
    error: BookSearchFeedbackInput;
    offline: BookSearchFeedbackInput;
    permission: BookSearchFeedbackInput;
  };
  primaryAction: string;
}

export type BookSearchState = "default" | "results" | "loading" | "empty" | "error" | "offline" | "permission";

export type BookSearchEvent =
  | { type: "back" }
  | { type: "more" }
  | { type: "queryChange"; value: string }
  | { type: "clearQuery" }
  | { type: "scopeChange"; scopeType: BookSearchScopeType }
  | { type: "groupChange"; label: string }
  | { type: "historySelect"; label: string }
  | { type: "clearHistory" }
  | { type: "submitSearch" }
  | { type: "openDetail"; result: BookSearchResultInput }
  | { type: "addToBookshelf"; result: BookSearchResultInput }
  | { type: "read"; result: BookSearchResultInput }
  | { type: "retry" }
  | { type: "requestPermission" };

export type DiscoverySourceType = "all" | "book-source" | "subscription";

export interface DiscoverySourceTypeInput {
  label: "全部" | "书源" | "订阅";
  type: DiscoverySourceType;
  active: boolean;
}

export interface DiscoveryCategoryInput {
  label: string;
  active: boolean;
}

export interface DiscoveryBookInput {
  title: string;
  author: string;
  source: string;
  desc: string;
  cover: string;
  actionLabel: "阅读" | "加入书架";
  inBookshelf: boolean;
}

export interface DiscoveryRankingItemInput {
  rank: number;
  title: string;
  author: string;
  source: string;
  cover: string;
  state: string;
  tone: "orange" | "green" | "muted";
}

export interface DiscoveryFeedbackInput {
  title: string;
  copy: string;
  primaryAction: string;
  secondaryAction: string;
}

export interface DiscoveryHomeFixture {
  status: StatusBarInput;
  topBar: {
    title: string;
  };
  search: {
    placeholder: string;
  };
  sourceTypes: DiscoverySourceTypeInput[];
  currentSource: {
    title: string;
    meta: string;
    status: string;
    actionLabel: string;
    iconLabel: string;
  };
  categories: DiscoveryCategoryInput[];
  categoryMoreLabel: string;
  content: {
    title: string;
    refreshLabel: string;
    featured: DiscoveryBookInput[];
  };
  statusBar: {
    sourceCount: string;
    availableCount: string;
    updatedAt: string;
    actionLabel: string;
  };
  ranking: {
    title: string;
    moreLabel: string;
    items: DiscoveryRankingItemInput[];
  };
  feedback: {
    loading: Omit<DiscoveryFeedbackInput, "primaryAction" | "secondaryAction">;
    empty: DiscoveryFeedbackInput;
    error: DiscoveryFeedbackInput;
    offline: DiscoveryFeedbackInput;
  };
  bottomNav: MainNavItemInput[];
}

export type DiscoveryHomeState = "default" | "subscription" | "loading" | "empty" | "error" | "offline";

export type DiscoveryHomeEvent =
  | { type: "searchOpen" }
  | { type: "moreOpen" }
  | { type: "sourceTypeChange"; sourceType: DiscoverySourceType }
  | { type: "sourceSwitchOpen" }
  | { type: "categoryChange"; label: string }
  | { type: "moreCategoryOpen" }
  | { type: "refresh" }
  | { type: "openBookDetail"; item: DiscoveryBookInput | DiscoveryRankingItemInput }
  | { type: "addToBookshelf"; item: DiscoveryBookInput }
  | { type: "read"; item: DiscoveryBookInput }
  | { type: "sourceDetect" }
  | { type: "rankingMore" }
  | { type: "navChange"; navType: "bookshelf" | "discover" | "rss" | "settings" };

export type RssStatusFilterType = "all" | "unread" | "favorite" | "later" | "booklist";
export type RssSourceFilterType = "all" | "novel" | "tech" | "booklist";

export interface RssFilterInput<TType extends string = string> {
  label: string;
  type: TType;
  active: boolean;
}

export interface RssSummaryItemInput {
  label: string;
  value: string;
  meta?: string;
  icon: "book" | "mail" | "clock";
}

export interface RssEntryInput {
  title: string;
  source: string;
  excerpt: string;
  time: string;
  cover: string;
  unread: boolean;
  menuLabel: string;
}

export interface RssFeedbackInput {
  title: string;
  copy: string;
  primaryAction: string;
  secondaryAction: string;
}

export interface RssHomeFixture {
  status: StatusBarInput;
  topBar: {
    title: "RSS";
  };
  summary: {
    title: string;
    refreshLabel: string;
    items: RssSummaryItemInput[];
  };
  statusFilters: RssFilterInput<RssStatusFilterType>[];
  sourceFilters: RssFilterInput<RssSourceFilterType>[];
  entriesTitle: string;
  entries: RssEntryInput[];
  footer: string;
  feedback: {
    loading: Omit<RssFeedbackInput, "primaryAction" | "secondaryAction">;
    empty: RssFeedbackInput;
    unreadEmpty: RssFeedbackInput;
    error: RssFeedbackInput;
  };
  bottomNav: MainNavItemInput[];
}

export type RssHomeState = "default" | "loading" | "empty" | "unreadEmpty" | "error";

export type RssHomeEvent =
  | { type: "searchOpen" }
  | { type: "moreOpen" }
  | { type: "refresh" }
  | { type: "statusFilterChange"; filterType: RssStatusFilterType }
  | { type: "sourceFilterChange"; filterType: RssSourceFilterType }
  | { type: "openEntry"; entry: RssEntryInput }
  | { type: "entryMoreOpen"; entry: RssEntryInput }
  | { type: "addSubscription" }
  | { type: "retry" }
  | { type: "navChange"; navType: "bookshelf" | "discover" | "rss" | "settings" };

export interface BookDetailBookInput {
  title: string;
  author: string;
  source: string;
  latest: string;
  cover: string;
  inBookshelf: boolean;
  readAction: string;
  bookshelfAction: string;
}

export interface BookDetailProgressInput {
  current: string;
  label: string;
  percent: PercentValue;
}

export interface BookDetailChapterInput {
  title: string;
  state: "未读" | "已读";
  isNew: boolean;
}

export interface BookDetailFeedbackInput {
  title: string;
  copy: string;
  primaryAction: string;
  secondaryAction: string;
}

export interface BookDetailSourceInput {
  title: string;
  meta: string;
  current: boolean;
  available: boolean;
}

export interface BookDetailFixture {
  status: {
    time: string;
  };
  topBar: {
    title: string;
  };
  book: BookDetailBookInput;
  progress: BookDetailProgressInput;
  chapters: BookDetailChapterInput[];
  chapterFooter: string;
  intro: {
    title: string;
    actionLabel: string;
    copy: string;
  };
  feedback: {
    loading: Omit<BookDetailFeedbackInput, "primaryAction" | "secondaryAction">;
    empty: BookDetailFeedbackInput;
    error: BookDetailFeedbackInput;
    offline: BookDetailFeedbackInput;
    permission: BookDetailFeedbackInput;
  };
  sourceSheet: {
    title: string;
    subtitle: string;
    refreshLabel: string;
    cancelLabel: string;
    confirmLabel: string;
    sources: BookDetailSourceInput[];
  };
}

export type BookDetailState = "default" | "loading" | "empty" | "error" | "offline" | "permission" | "source_sheet";

export type BookDetailEvent =
  | { type: "back" }
  | { type: "more" }
  | { type: "sourceSheetOpen" }
  | { type: "sourceRefresh" }
  | { type: "sourceSelect"; source: BookDetailSourceInput }
  | { type: "sourceConfirm"; source: BookDetailSourceInput }
  | { type: "sourceCancel" }
  | { type: "read"; book: BookDetailBookInput }
  | { type: "addToBookshelf"; book: BookDetailBookInput }
  | { type: "openDirectory"; book: BookDetailBookInput }
  | { type: "openChapter"; chapter: BookDetailChapterInput }
  | { type: "introExpand" }
  | { type: "retry" }
  | { type: "requestPermission" };

export interface BookDirectorySummaryInput {
  title: string;
  sourceLabel: string;
  chapterCount: string;
}

export interface BookDirectoryCurrentChapterInput {
  title: string;
  status: "当前阅读";
  progress: PercentValue;
}

export interface ChapterRowInput {
  title: string;
  status: "未读" | "已读";
  isNew: boolean;
}

export interface BookDirectoryFeedbackInput {
  title: string;
  copy: string;
  primaryAction: string;
  secondaryAction: string;
}

export interface BookDirectoryFixture {
  status: StatusBarInput;
  topBar: {
    title: "目录";
  };
  summary: BookDirectorySummaryInput;
  currentChapter: BookDirectoryCurrentChapterInput;
  chapters: ChapterRowInput[];
  footer: string;
  feedback: {
    loading: Omit<BookDirectoryFeedbackInput, "primaryAction" | "secondaryAction">;
    empty: BookDirectoryFeedbackInput;
    error: BookDirectoryFeedbackInput;
  };
}

export type BookDirectoryState = "default" | "loading" | "empty" | "error";

export type BookDirectoryEvent =
  | { type: "back" }
  | { type: "openCurrentChapter"; chapter: BookDirectoryCurrentChapterInput }
  | { type: "openChapter"; chapter: ChapterRowInput }
  | { type: "retry" }
  | { type: "backToDetail" };

export interface SortFilterBackdropBookInput {
  title: string;
  meta: string;
  cover: string;
}

export interface SortFilterOptionInput {
  label: string;
  type: string;
  active: boolean;
}

export interface SortFilterSectionInput {
  title: string;
  mode: "single" | "multi";
  options: SortFilterOptionInput[];
}

export interface SortFilterFeedbackInput {
  title: string;
  copy: string;
  primaryAction: string;
  secondaryAction: string;
}

export interface SortFilterFixture {
  status: {
    time: string;
  };
  backdrop: {
    title: string;
    groups: BookshelfGroupInput[];
    books: SortFilterBackdropBookInput[];
  };
  sheet: {
    title: string;
    sections: SortFilterSectionInput[];
    resetLabel: string;
    applyLabel: string;
  };
  feedback: {
    empty: SortFilterFeedbackInput;
    error: SortFilterFeedbackInput;
  };
  toast: {
    success: string;
  };
}

export type SortFilterState = "default" | "selected" | "empty" | "error";

export type SortFilterEvent =
  | { type: "dismiss" }
  | { type: "sortSelect"; option: SortFilterOptionInput }
  | { type: "orderSelect"; option: SortFilterOptionInput }
  | { type: "filterToggle"; option: SortFilterOptionInput }
  | { type: "reset" }
  | { type: "apply" }
  | { type: "retry" };

export type BookActionCoverTone = "blue" | "brown" | "green";

export interface BookActionBookInput {
  title: string;
  author: string;
  chapter: string;
  progress: PercentValue;
  coverLabel: string;
  coverTone: BookActionCoverTone;
  selected?: boolean;
}

export interface BookActionInput {
  type: "edit" | "delete";
  title: "修改" | "删除";
  copy: string;
  tone: "normal" | "danger";
}

export interface ConfirmDialogInput {
  title: "删除书架记录？";
  copy: string;
  cancelLabel: "取消";
  confirmLabel: "确认移除";
  loadingLabel: string;
}

export interface BookActionFeedbackInput {
  title: string;
  copy: string;
  primaryAction?: string;
  secondaryAction?: string;
}

export interface BookActionSheetFixture {
  status: {
    time: string;
  };
  backdrop: {
    title: string;
    groups: BookshelfGroupInput[];
    books: BookActionBookInput[];
  };
  selectedBook: BookActionBookInput;
  actions: BookActionInput[];
  confirm: ConfirmDialogInput;
  sheet: {
    closeHint: string;
  };
  feedback: {
    loading: BookActionFeedbackInput;
    error: Required<BookActionFeedbackInput>;
  };
}

export type BookActionSheetState = "default" | "danger" | "loading" | "error";

export type BookActionSheetEvent =
  | { type: "dismiss" }
  | { type: "edit"; book: BookActionBookInput }
  | { type: "deleteRequest"; book: BookActionBookInput }
  | { type: "deleteCancel"; book: BookActionBookInput }
  | { type: "deleteConfirm"; book: BookActionBookInput }
  | { type: "deleteRetry"; book: BookActionBookInput };

export interface GroupRowInput {
  id: string;
  title: string;
  count: number;
  meta: string;
  system: boolean;
  canRename: boolean;
  canDelete: boolean;
  canReorder: boolean;
}

export interface GroupManagementDialogInput {
  newTitle: "新建分组";
  renameTitle: "重命名";
  inputPlaceholder: "输入分组名称";
  helper: string;
  cancelLabel: "取消";
  saveLabel: "保存";
  savingLabel: string;
  renameValue: string;
}

export interface GroupDeleteConfirmInput {
  title: "删除分组";
  copy: string;
  cancelLabel: "取消";
  confirmLabel: "删除分组";
  loadingLabel: string;
}

export interface GroupManagementFixture {
  status: StatusBarInput;
  topBar: {
    title: "分组管理";
    backLabel: string;
    addLabel: string;
  };
  groups: GroupRowInput[];
  dialog: GroupManagementDialogInput;
  deleteConfirm: GroupDeleteConfirmInput;
  feedback: {
    empty: BookActionFeedbackInput;
    loading: BookActionFeedbackInput;
    error: Required<BookActionFeedbackInput>;
  };
  toast: {
    success: string;
  };
}

export type GroupManagementState = "default" | "new" | "rename" | "delete" | "empty" | "loading" | "error";

export type GroupManagementEvent =
  | { type: "back" }
  | { type: "addGroupOpen" }
  | { type: "groupRenameOpen"; group: GroupRowInput }
  | { type: "groupDeleteOpen"; group: GroupRowInput }
  | { type: "groupReorder"; fromIndex: number; toIndex: number }
  | { type: "dialogCancel" }
  | { type: "dialogSave"; value: string }
  | { type: "deleteConfirm"; group: GroupRowInput }
  | { type: "retry" };

export interface ImportIntroInput {
  title: string;
  copy: string;
  formats: string[];
  primaryAction: "选择文件";
}

export interface SupportedFormatInput {
  label: "TXT" | "EPUB";
  copy: string;
  tone: "blue" | "green";
}

export interface ImportProgressInput {
  title: "正在导入";
  copy: string;
  currentFile: string;
  progress: PercentValue;
}

export interface ImportResultCountInput {
  label: "已导入" | "跳过" | "失败";
  value: number;
  tone: "success" | "skip" | "failed" | "muted";
}

export interface ImportResultRowInput {
  fileName: string;
  status: "已导入" | "已存在，已跳过" | "格式不支持" | "解析失败";
  reason: string;
  tone: "success" | "skip" | "failed";
}

export interface LocalImportFixture {
  status: StatusBarInput;
  topBar: {
    title: "导入本地书";
    backLabel: string;
  };
  intro: ImportIntroInput;
  permission: {
    title: string;
    copy: string;
    footnote: string;
  };
  supportedFormats: SupportedFormatInput[];
  flow: Array<{ step: string; label: string }>;
  reminder: {
    title: string;
    copy: string;
  };
  importing: ImportProgressInput;
  resultSummary: {
    successTitle: "导入完成";
    successCopy: string;
    partialTitle: "部分文件导入失败";
    partialCopy: string;
    failedTitle: "导入失败";
    failedCopy: string;
    counts: ImportResultCountInput[];
  };
  results: ImportResultRowInput[];
  actions: {
    chooseAgain: "重新选择";
    done: "完成";
    backToBookshelf: "返回书架";
  };
  cancelState: {
    title: string;
    copy: string;
  };
}

export type LocalImportState = "default" | "importing" | "success" | "partial_failed" | "failed" | "picker_cancelled";

export type LocalImportEvent =
  | { type: "back" }
  | { type: "openSystemFilePicker" }
  | { type: "pickerCancelled" }
  | { type: "importProgress"; progress: PercentValue; currentFile: string }
  | { type: "resultRowOpen"; result: ImportResultRowInput }
  | { type: "chooseAgain" }
  | { type: "done" }
  | { type: "backToBookshelf" };

export type ReaderLibraryIconType =
  | "search"
  | "more"
  | "back"
  | "sort"
  | "settings"
  | "bookshelf"
  | "discover"
  | "rss"
  | "auto-page"
  | "replace"
  | "directory"
  | "tts"
  | "appearance"
  | "bookmark"
  | "source"
  | "storage"
  | "sync";

export interface ReaderLibraryColorToken {
  name: string;
  value: string;
}

export interface ReaderLibraryRowInput {
  title: string;
  meta: string;
  value: string;
  icon: ReaderLibraryIconType;
}

export interface ReaderLibraryActionInput {
  label: string;
  type: ReaderLibraryIconType;
  active?: boolean;
}

export interface ReaderLibraryBadgeInput {
  label: string;
  tone: "info" | "warning" | "muted";
}

export interface ReaderLibraryStateInput {
  title: string;
  copy: string;
}

export interface ReaderLibrarySourceCandidateInput {
  name: string;
  chapter: string;
  meta: string;
  status: "当前" | "检测中" | "可用" | "失效";
  current: boolean;
  checking: boolean;
  disabled: boolean;
}

export interface ReaderComponentLibraryFixture {
  meta: {
    title: string;
    summary: string;
    version: string;
  };
  colors: ReaderLibraryColorToken[];
  chips: string[];
  bottomNav: MainNavItemInput[];
  book: BookshelfBookInput;
  rows: ReaderLibraryRowInput[];
  searchResults: BookSearchResultInput[];
  sourceTypes: DiscoverySourceTypeInput[];
  currentSource: DiscoveryHomeFixture["currentSource"];
  discoveryCategories: DiscoveryCategoryInput[];
  discoveryContent: DiscoveryHomeFixture["content"];
  sourceStatus: DiscoveryHomeFixture["statusBar"];
  ranking: DiscoveryHomeFixture["ranking"];
  rssSummary: RssHomeFixture["summary"];
  rssStatusFilters: RssFilterInput<RssStatusFilterType>[];
  rssSourceFilters: RssFilterInput<RssSourceFilterType>[];
  rssEntries: RssEntryInput[];
  bookDetail: BookDetailBookInput;
  bookDetailProgress: BookDetailProgressInput;
  bookDetailChapters: BookDetailChapterInput[];
  bookDetailIntro: BookDetailFixture["intro"];
  bookDetailSources: BookDetailSourceInput[];
  directorySummary: BookDirectorySummaryInput;
  directoryCurrentChapter: BookDirectoryCurrentChapterInput;
  directoryChapters: ChapterRowInput[];
  sortFilterSections: SortFilterSectionInput[];
  bookActionBook: BookActionBookInput;
  bookActionActions: BookActionInput[];
  bookActionConfirm: ConfirmDialogInput;
  groupManagementGroups: GroupRowInput[];
  groupManagementDialog: GroupManagementDialogInput;
  groupDeleteConfirm: GroupDeleteConfirmInput;
  localImportIntro: ImportIntroInput;
  localImportPermission: LocalImportFixture["permission"];
  localImportFormats: SupportedFormatInput[];
  localImportProgress: ImportProgressInput;
  localImportSummaryCounts: ImportResultCountInput[];
  localImportResults: ImportResultRowInput[];
  readingSegmentTabs: ReadingSegmentTabInput[];
  readingTocChapters: ReadingChapterRowInput[];
  readingBookmarks: BookmarkRowInput[];
  readingSearch: ReadingTocBookmarkFixture["search"];
  readingMoreMenu: ReadingMoreMenuItemInput[];
  appearanceStepper: AppearanceStepperInput;
  appearanceLineSpacing: ReadingAppearanceFixture["lineSpacing"];
  appearanceThemes: ThemeSwatchInput[];
  appearanceFonts: FontOptionInput[];
  appearanceAnimations: SegmentControlOptionInput[];
  appearancePreview: ReadingAppearanceFixture["editTheme"];
  aloudControls: ReadingAloudFixture["controls"];
  aloudVoices: VoiceOptionInput[];
  aloudSpeedOptions: SpeedOptionInput[];
  aloudRunningCapsule: RunningCapsuleInput;
  autoPageControl: AutoPageControlInput;
  contentSearch: {
    query: string;
    countLabel: string;
    filters: ContentSearchFilterInput[];
    results: Array<Pick<ContentSearchResultInput, "title" | "meta" | "excerpt">>;
    empty: Required<BookActionFeedbackInput>;
  };
  replacementControl: {
    enabled: boolean;
    rules: ReplacementRuleInput[];
    preview: ReplacementPreviewInput;
    form: ReplacementFormInput;
  };
  readingEntry: {
    source: string;
    context: string;
    continueLabel: "继续阅读";
    continueMeta: string;
    startLabel: "开始阅读";
    startMeta: string;
    loadingTitle: "正在打开";
    errorTitle: "内容加载异常";
    retryLabel: "重试";
    repairLabel: "更换来源";
  };
  immersiveReading: {
    title: string;
    paragraph: string;
    topLeft: string;
    time: string;
    progress: string;
    chapterOnly: string;
    tapZones: string[];
  };
  sourceSwitch: {
    currentSource: string;
    selectedSource: string;
    filters: string[];
    checking: "检测中";
    switchLabel: "切换来源";
    candidates: ReaderLibrarySourceCandidateInput[];
  };
  generalSettings: {
    selectRows: Array<Pick<GeneralSettingsRowInput, "title" | "value" | "options" | "icon">>;
    switches: Array<Pick<GeneralSettingsRowInput, "title" | "meta" | "enabled">>;
    toast: Pick<SettingsToastInput, "success" | "error">;
  };
  settingsManagement: {
    danger: { title: string; meta: string; confirmLabel: string };
    permissions: Array<{ title: string; meta: string; status: string; tone: "good" | "warn"; actionLabel?: string }>;
    cache: { title: string; value: string; categories: Array<{ title: string; meta: string; value: string }> };
    backup: Array<{ title: string; meta: string; status: string }>;
    sources: Array<{ title: string; meta: string; status: string; enabled: boolean }>;
    form: { title: string; fields: string[]; saveLabel: string };
    logs: string[];
  };
  readingSettingGroups: SettingGroupCardInput[];
  readingSettingPresets: PresetRowInput[];
  readingAdvancedSettings: ReadingAdvancedSettingInput[];
  quickActions: ReaderLibraryActionInput[];
  moduleNav: ReaderLibraryActionInput[];
  states: ReaderLibraryStateInput[];
}

export type PageShellName =
  | "AssetLibraryShell"
  | "ComponentLibraryShell"
  | "MainTabShell"
  | "LibraryShell"
  | "ReaderShell"
  | "SettingsShell"
  | "FlowShell";

export type PageRole =
  | "asset-library"
  | "component-library"
  | "main-tab-root"
  | "library-stack"
  | "reader-flow"
  | "settings-stack"
  | "landscape-flow";

export type PageSlotName =
  | "appFrame"
  | "statusBar"
  | "appTopBar"
  | "contentRegion"
  | "mainNav"
  | "stateHost"
  | "stackFrame"
  | "backTopBar"
  | "bottomActionHost"
  | "sheetHost"
  | "dialogHost"
  | "readerFrame"
  | "readingSurface"
  | "readerOverlayHost"
  | "readerModuleNav"
  | "bottomSheetHost"
  | "readerStateHost"
  | "settingsFrame"
  | "settingsContent"
  | "settingSection"
  | "toastHost"
  | "settingsStateHost"
  | "flowFrame"
  | "stepRegion"
  | "comparisonRegion"
  | "resultRegion"
  | "screenAssets"
  | "iconAssets"
  | "bookCoverAssets"
  | "missingSupplements"
  | "usageRules"
  | "foundations"
  | "appShell"
  | "basicControls"
  | "cardsRows"
  | "sheetsPanels"
  | "states";

export interface PageStateModelContract {
  type: "asset-library" | "component-library" | "preview" | "state-matrix";
  expectedStateCards?: number;
}

export interface PageShellContract {
  shellName: PageShellName;
  pageRole: PageRole;
  slots: PageSlotName[];
  stateModel: PageStateModelContract;
}

export interface FrontendInputValidationTarget extends PageShellContract {
  name: string;
  html: string;
  screenshot: string;
  viewport: {
    width: number;
    height: number;
  };
  selector: string;
  requiredText: string[];
  rendererGlobal: string;
  expectedFrame?: {
    width: number;
    height: number;
  };
  expectedStateCards?: number;
  expectedImages?: {
    min: number;
    missing: number;
  };
  expectedDomCount?: {
    selector: string;
    min: number;
  };
}
