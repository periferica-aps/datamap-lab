(function () {
  let suspended = false;
  let parentVisible = true;
  let retryTimer = null;

  function applyState() {
    const next = document.hidden || !parentVisible;
    if (suspended === next && typeof window.noLoop === 'function') return;

    if (typeof window.noLoop !== 'function' || typeof window.loop !== 'function') {
      clearTimeout(retryTimer);
      retryTimer = setTimeout(applyState, 50);
      return;
    }

    suspended = next;
    if (next) {
      window.noLoop();
    } else {
      window.loop();
      if (typeof window.redraw === 'function') window.redraw();
    }
  }

  window.addEventListener('message', (event) => {
    if (event.data?.type !== 'datamap-visibility') return;
    parentVisible = Boolean(event.data.visible);
    applyState();
  });

  document.addEventListener('visibilitychange', applyState);
})();
