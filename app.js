const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    const shell = entry.target;
    const currentFrame = shell.querySelector('iframe');

    if (!entry.isIntersecting || currentFrame) return;

    const frame = document.createElement('iframe');
    frame.src = shell.dataset.src;
    frame.title = shell.dataset.title;
    frame.loading = 'lazy';
    frame.allow = 'fullscreen';
    frame.addEventListener('load', () => shell.querySelector('.loader')?.remove());
    shell.appendChild(frame);
    observer.unobserve(shell);
  });
}, { rootMargin: '75% 0px' });

document.querySelectorAll('.sketch-shell').forEach((shell) => observer.observe(shell));
