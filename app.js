function sendVisibility(shell, visible) {
  shell.dataset.visible = String(visible);
  shell.querySelector('iframe')?.contentWindow?.postMessage({
    type: 'datamap-visibility',
    visible
  }, '*');
}

const loadObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    const shell = entry.target;
    const currentFrame = shell.querySelector('iframe');

    if (!entry.isIntersecting || currentFrame) return;

    const frame = document.createElement('iframe');
    frame.src = shell.dataset.src;
    frame.title = shell.dataset.title;
    // The observer already controls lazy loading. Once a sketch is close to
    // the viewport, load it immediately so it is ready before it is visible.
    frame.loading = 'eager';
    frame.allow = 'fullscreen';
    frame.addEventListener('load', () => {
      shell.querySelector('.loader')?.remove();
      sendVisibility(shell, shell.dataset.visible === 'true');
    });
    shell.appendChild(frame);
    loadObserver.unobserve(shell);
  });
}, { rootMargin: '100% 0px', threshold: 0.01 });

const activityObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => sendVisibility(entry.target, entry.isIntersecting));
}, { threshold: 0.01 });

document.querySelectorAll('.sketch-shell').forEach((shell) => {
  shell.dataset.visible = 'false';
  loadObserver.observe(shell);
  activityObserver.observe(shell);
});
