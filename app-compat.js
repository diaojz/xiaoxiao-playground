// 此文件仅进入 App 构建副本；游戏的原始脚本与素材保持不变。
(() => {
  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport) viewport.content = 'width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover';
  document.addEventListener('contextmenu', event => event.preventDefault());
  document.addEventListener('gesturestart', event => event.preventDefault(), { passive: false });
  // 贪吃蛇原版切后台仅停音频并保存；App 中复用现有暂停按钮，返回后由孩子手动继续。
  function pauseSnake() {
    if (!location.pathname.includes('/snake/')) return;
    const button = document.getElementById('pauseBtn');
    if (button && button.getAttribute('aria-pressed') !== 'true') button.click();
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) pauseSnake(); });
  addEventListener('pagehide', pauseSnake);
  // 原生 App 进入后台时主动派发事件，覆盖个别系统版本的 WebView 可见性差异。
  addEventListener('playgroundBackground', () => {
    pauseSnake();
    dispatchEvent(new Event('blur'));
    document.querySelectorAll('audio,video').forEach(media => media.pause());
  });
})();
