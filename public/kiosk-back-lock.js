(() => {
  if (window.__kioskBackLockInstalled) return;
  window.__kioskBackLockInstalled = true;

  var origPush = window.history.pushState.bind(window.history);

  function dummyUrl() {
    var base = window.location.pathname + window.location.search;
    return window.location.hash === "#kiosk"
      ? base + "#kiosk2"
      : base + "#kiosk";
  }

  function lock() {
    origPush({ kiosk: 1 }, "", dummyUrl());
  }

  lock();

  window.addEventListener("popstate", () => {
    lock();
    window.dispatchEvent(new Event("kioskback"));
  });
})();
