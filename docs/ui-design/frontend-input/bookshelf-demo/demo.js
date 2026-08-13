(function attachBookshelfDemo(window) {
  const root = document.getElementById("bookshelf-demo-root");
  const host = document.getElementById("device-host");
  const scaleTarget = document.getElementById("device-scale");
  const buttons = Array.from(document.querySelectorAll("[data-state]"));
  let currentState = "default";

  function demoFixture() {
    const data = JSON.parse(JSON.stringify(window.BOOKSHELF_FIXTURE));
    const normalizeCover = (item) => {
      if (item && typeof item.cover === "string") {
        item.cover = item.cover.replace("../bookshelf-cover-assets/", "../../02-主标签页/书架/bookshelf-cover-assets/");
      }
    };

    normalizeCover(data.continueReading);
    (data.recentUpdates || []).forEach(normalizeCover);
    (data.books || []).forEach(normalizeCover);
    return data;
  }

  function render() {
    window.BookshelfInput.renderBookshelf(root, demoFixture(), { state: currentState });
    fitDevice();
  }

  function fitDevice() {
    if (!host || !scaleTarget) {
      return;
    }

    const width = host.clientWidth;
    const height = host.clientHeight;
    const scale = Math.min(width / 853, height / 1844);
    scaleTarget.style.transform = `scale(${scale})`;
    scaleTarget.style.width = "853px";
    scaleTarget.style.height = "1844px";
  }

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      currentState = button.dataset.state || "default";
      buttons.forEach((item) => {
        const active = item === button;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-selected", active ? "true" : "false");
      });
      render();
    });
  });

  window.addEventListener("resize", fitDevice);
  render();
})(window);
