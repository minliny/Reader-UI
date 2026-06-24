const assets = "../bookshelf-cover-assets/";

const books = [
  {
    id: "long-night",
    title: "长夜余火",
    author: "爱潜水的乌贼",
    chapter: "第 32 章 雨夜",
    progress: 38,
    group: "全部",
    tags: ["默认", "追更"],
    cover: "long-night.png",
    updated: true
  },
  {
    id: "bright-moon",
    title: "明朝那些事儿",
    author: "当年明月",
    chapter: "第 218 章",
    progress: 58,
    group: "本地书",
    tags: ["本地书"],
    cover: "bright-moon.png",
    updated: true
  },
  {
    id: "three-body",
    title: "三体",
    author: "刘慈欣",
    chapter: "65%",
    progress: 65,
    group: "默认",
    tags: ["默认"],
    cover: "three-body.png",
    updated: false
  },
  {
    id: "renjian-cihua",
    title: "人间词话",
    author: "王国维",
    chapter: "已读完",
    progress: 100,
    group: "本地书",
    tags: ["本地书", "已完结"],
    cover: "renjian-cihua.png",
    updated: false
  },
  {
    id: "mystery-lord",
    title: "诡秘之主",
    author: "爱潜水的乌贼",
    chapter: "第 1426 章",
    progress: 58,
    group: "追更",
    tags: ["追更"],
    cover: "mystery-lord.png",
    updated: true
  },
  {
    id: "android-notes",
    title: "Android 札记",
    author: "本地文档",
    chapter: "Compose 动画",
    progress: 100,
    group: "本地书",
    tags: ["本地书", "已完结"],
    cover: "android-notes.png",
    updated: false
  }
];

const groups = ["全部", "默认", "本地书", "追更"];

const state = {
  group: "全部",
  mode: "cover",
  sort: "recent",
  query: "",
  showComplete: true
};

const groupChips = document.querySelector("#groupChips");
const continueCard = document.querySelector("#continueCard");
const recentCard = document.querySelector("#recentCard");
const bookCollection = document.querySelector("#bookCollection");
const emptyState = document.querySelector("#emptyState");
const modeLabel = document.querySelector("#modeLabel");
const searchPanel = document.querySelector("#searchPanel");
const searchInput = document.querySelector("#searchInput");
const scrim = document.querySelector("#scrim");
const bottomSheet = document.querySelector("#bottomSheet");
const toast = document.querySelector("#toast");

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function coverPath(book) {
  return assets + book.cover;
}

function progressTemplate(value, className = "progress") {
  return `<div class="${className}" style="--value: ${value}%"><span></span></div>`;
}

function bookMatchesGroup(book) {
  return state.group === "全部" || book.tags.includes(state.group);
}

function bookMatchesQuery(book) {
  const query = state.query.trim().toLowerCase();
  if (!query) return true;
  return [book.title, book.author, book.chapter].join(" ").toLowerCase().includes(query);
}

function visibleBooks() {
  const filtered = books
    .filter(bookMatchesGroup)
    .filter(bookMatchesQuery)
    .filter((book) => state.showComplete || book.progress < 100);

  return filtered.sort((a, b) => {
    if (state.sort === "progress") return b.progress - a.progress;
    if (state.sort === "title") return a.title.localeCompare(b.title, "zh-Hans-CN");
    return Number(b.updated) - Number(a.updated);
  });
}

function renderChips() {
  groupChips.innerHTML = groups
    .map((group) => {
      const active = group === state.group ? " active" : "";
      return `<button class="chip${active}" type="button" data-group="${group}">${group}</button>`;
    })
    .join("");
}

function renderSummary() {
  const current = books[0];
  continueCard.innerHTML = `
    <h3 class="card-title">继续阅读</h3>
    <div class="continue-body">
      <img class="continue-cover" src="${coverPath(current)}" alt="${escapeHtml(current.title)}封面">
      <div class="continue-info">
        <h4 class="continue-title">${escapeHtml(current.title)}</h4>
        <p class="meta">${escapeHtml(current.author)}</p>
        <p class="meta">${escapeHtml(current.chapter)}</p>
        <div class="read-row">
          <span class="percent">${current.progress}%</span>
          ${progressTemplate(current.progress)}
        </div>
      </div>
    </div>
    <button class="read-button" type="button" data-book="${current.id}">阅读</button>
  `;

  const updates = books.filter((book) => book.updated).slice(0, 2);
  recentCard.innerHTML = `
    <div class="recent-head">
      <h3 class="card-title">最近更新</h3>
      <span class="recent-count">${updates.length}
        <svg viewBox="0 0 48 48" aria-hidden="true"><path d="m18 9 15 15-15 15"></path></svg>
      </span>
    </div>
    ${updates.map((book) => `
      <button class="update-item" type="button" data-book="${book.id}">
        <img class="update-cover" src="${coverPath(book)}" alt="${escapeHtml(book.title)}封面">
        <span>
          <span class="update-title">${escapeHtml(book.title)}</span>
          <span class="meta">${escapeHtml(book.chapter)}</span>
        </span>
        <span class="dot" aria-hidden="true"></span>
      </button>
    `).join("")}
  `;
}

function renderCoverGrid(items) {
  return `
    <div class="book-grid">
      ${items.map((book) => `
        <article class="book-card">
          <button type="button" data-book="${book.id}" aria-label="打开${escapeHtml(book.title)}">
            <img class="book-cover" src="${coverPath(book)}" alt="${escapeHtml(book.title)}封面">
          </button>
          <h3 class="book-title">${escapeHtml(book.title)}</h3>
          <p class="book-meta">${escapeHtml(book.author)}</p>
          <p class="book-meta">${escapeHtml(book.chapter)}</p>
          <p class="book-progress-label">${book.progress === 100 ? "已读完" : `${book.progress}%`}</p>
          ${progressTemplate(book.progress, "progress book-progress")}
        </article>
      `).join("")}
    </div>
  `;
}

function renderList(items) {
  return `
    <div class="book-list">
      ${items.map((book) => `
        <article class="book-row">
          <button type="button" data-book="${book.id}" aria-label="打开${escapeHtml(book.title)}">
            <img class="book-cover" src="${coverPath(book)}" alt="${escapeHtml(book.title)}封面">
          </button>
          <div>
            <h3 class="row-title">${escapeHtml(book.title)}</h3>
            <p class="row-meta">${escapeHtml(book.author)} · ${escapeHtml(book.chapter)} · ${book.group}</p>
            <div class="row-progress">
              ${progressTemplate(book.progress)}
              <span>${book.progress === 100 ? "完成" : `${book.progress}%`}</span>
            </div>
          </div>
          <button class="icon-button more-dot" type="button" data-more="${book.id}" aria-label="更多，${escapeHtml(book.title)}">
            <svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="10" r="3"></circle><circle cx="24" cy="24" r="3"></circle><circle cx="24" cy="38" r="3"></circle></svg>
          </button>
        </article>
      `).join("")}
    </div>
  `;
}

function renderBooks() {
  const items = visibleBooks();
  modeLabel.textContent = state.mode === "cover" ? "封面" : "列表";
  bookCollection.innerHTML = state.mode === "cover" ? renderCoverGrid(items) : renderList(items);
  emptyState.hidden = items.length > 0;
}

function render() {
  renderChips();
  renderSummary();
  renderBooks();
}

function showToast(message) {
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.hidden = true;
  }, 1600);
}

function openSheet(type) {
  scrim.hidden = false;
  bottomSheet.hidden = false;
  if (type === "sort") {
    bottomSheet.innerHTML = `
      <h3 class="sheet-title">排序与筛选</h3>
      <div class="sheet-options">
        ${[
          ["recent", "最近更新优先"],
          ["progress", "阅读进度从高到低"],
          ["title", "按书名排序"]
        ].map(([value, label]) => `
          <button class="sheet-option${state.sort === value ? " active" : ""}" type="button" data-sort="${value}">
            <span>${label}</span>
            <span>${state.sort === value ? "已选" : ""}</span>
          </button>
        `).join("")}
      </div>
      <button class="sheet-close" type="button" data-action="close-sheet">完成</button>
    `;
    return;
  }

  bottomSheet.innerHTML = `
    <h3 class="sheet-title">展示设置</h3>
    <div class="sheet-options">
      <button class="sheet-option${state.mode === "cover" ? " active" : ""}" type="button" data-mode="cover">
        <span>封面模式</span>
        <span>${state.mode === "cover" ? "已选" : ""}</span>
      </button>
      <button class="sheet-option${state.mode === "list" ? " active" : ""}" type="button" data-mode="list">
        <span>列表模式</span>
        <span>${state.mode === "list" ? "已选" : ""}</span>
      </button>
      <button class="sheet-option${state.showComplete ? " active" : ""}" type="button" data-toggle-complete>
        <span>显示已读完</span>
        <span>${state.showComplete ? "开启" : "关闭"}</span>
      </button>
    </div>
    <button class="sheet-close" type="button" data-action="close-sheet">完成</button>
  `;
}

function closeSheet() {
  scrim.hidden = true;
  bottomSheet.hidden = true;
  bottomSheet.innerHTML = "";
}

function handleBookOpen(bookId) {
  const book = books.find((item) => item.id === bookId);
  if (book) showToast(`打开《${book.title}》`);
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("button");
  if (!target) return;

  if (target.dataset.group) {
    state.group = target.dataset.group;
    render();
    return;
  }

  if (target.dataset.book) {
    handleBookOpen(target.dataset.book);
    return;
  }

  if (target.dataset.more) {
    const book = books.find((item) => item.id === target.dataset.more);
    showToast(book ? `更多：《${book.title}》` : "更多");
    return;
  }

  if (target.dataset.sort) {
    state.sort = target.dataset.sort;
    closeSheet();
    renderBooks();
    return;
  }

  if (target.dataset.mode) {
    state.mode = target.dataset.mode;
    closeSheet();
    renderBooks();
    return;
  }

  if ("toggleComplete" in target.dataset) {
    state.showComplete = !state.showComplete;
    closeSheet();
    renderBooks();
    return;
  }

  const action = target.dataset.action;
  if (action === "search") {
    searchPanel.hidden = false;
    searchInput.focus();
  } else if (action === "close-search") {
    state.query = "";
    searchInput.value = "";
    searchPanel.hidden = true;
    renderBooks();
  } else if (action === "toggle-mode") {
    state.mode = state.mode === "cover" ? "list" : "cover";
    renderBooks();
  } else if (action === "sort") {
    openSheet("sort");
  } else if (action === "display") {
    openSheet("display");
  } else if (action === "more") {
    showToast("书架更多菜单");
  } else if (action === "close-sheet") {
    closeSheet();
  } else if (target.dataset.tab) {
    document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
    target.classList.add("active");
    showToast(target.dataset.tab);
  }
});

scrim.addEventListener("click", closeSheet);

searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  renderBooks();
});

render();
