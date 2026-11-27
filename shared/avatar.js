// 自定义头像：家长上传孩子照片，裁成 512×512 方图存本地，游戏里替换主角头像。
// 存档键 kidAvatarPhoto（JPEG dataURL）；各游戏用 KidAvatar.url(默认图) 取图，不改变默认行为。
(function (root) {
  'use strict';
  const KEY = 'kidAvatarPhoto', SIZE = 512;
  const store = () => { try { return root.localStorage; } catch (_) { return null; } };

  function url(fallback) {
    let value = null;
    try { value = store()?.getItem(KEY); } catch (_) {}
    return typeof value === 'string' && value.startsWith('data:image/') ? value : (fallback ?? null);
  }
  const has = () => url() !== null;
  function save(dataUrl) { store()?.setItem(KEY, dataUrl); notify(); }
  function reset() { try { store()?.removeItem(KEY); } catch (_) {} notify(); }
  function notify() { try { root.dispatchEvent(new Event('kidavatarchange')); } catch (_) {} }

  // 把 img 按「缩放 + 平移」画进 size×size 画布；scale=1 为刚好铺满短边。
  function drawCrop(ctx, img, size, zoom, ox, oy) {
    const base = Math.max(size / img.naturalWidth, size / img.naturalHeight) * zoom;
    const w = img.naturalWidth * base, h = img.naturalHeight * base;
    const x = (size - w) / 2 + ox * size, y = (size - h) / 2 + oy * size;
    ctx.fillStyle = '#fff5e7'; ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, x, y, w, h);
  }
  // 平移限制在图片仍铺满画面的范围内（单位：占画布边长的比例）。
  function clampOffset(img, zoom, ox, oy) {
    const base = Math.max(1 / img.naturalWidth, 1 / img.naturalHeight) * zoom;
    const mx = Math.max(0, (img.naturalWidth * base - 1) / 2), my = Math.max(0, (img.naturalHeight * base - 1) / 2);
    return [Math.min(mx, Math.max(-mx, ox)), Math.min(my, Math.max(-my, oy))];
  }

  function openPanel() {
    if (!root.document || root.document.getElementById('kid-avatar-panel')) return;
    const doc = root.document;
    const wrap = doc.createElement('div');
    wrap.id = 'kid-avatar-panel';
    wrap.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#000a;display:flex;align-items:center;justify-content:center;padding:16px;font-family:inherit';
    const btn = 'min-height:64px;min-width:64px;padding:0 22px;border:0;border-radius:32px;font:800 22px/1 inherit;cursor:pointer;color:#fff;background:#f2778f';
    wrap.innerHTML = `<div style="background:#fff8ec;border-radius:28px;padding:22px;width:min(92vw,420px);max-height:96vh;overflow:auto;text-align:center;color:#6b4a3a;box-shadow:0 12px 40px #0006">
      <h2 style="margin:0 0 6px;font-size:26px">换成我的头像</h2>
      <p style="margin:0 0 12px;font-size:20px">选一张照片，拖一拖、缩一缩，让脸在圆圈里</p>
      <canvas id="kap-canvas" width="${SIZE}" height="${SIZE}" style="width:min(70vw,300px);height:min(70vw,300px);border-radius:50%;border:6px solid #fff;background:#fff5e7;box-shadow:0 4px 14px #0003;touch-action:none"></canvas>
      <input id="kap-zoom" type="range" min="1" max="3" step="0.01" value="1" aria-label="缩放" style="display:block;width:80%;height:44px;margin:12px auto" disabled>
      <input id="kap-file" type="file" accept="image/*" hidden>
      <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center">
        <button id="kap-pick" style="${btn};background:#5aa9e6">选照片</button>
        <button id="kap-save" style="${btn};opacity:.5" disabled>用这张</button>
        <button id="kap-reset" style="${btn};background:#a88">恢复默认</button>
        <button id="kap-close" style="${btn};background:#999">关闭</button>
      </div></div>`;
    doc.body.appendChild(wrap);
    const $ = id => wrap.querySelector('#' + id);
    const canvas = $('kap-canvas'), ctx = canvas.getContext('2d'), zoomEl = $('kap-zoom');
    let img = null, zoom = 1, ox = 0, oy = 0;

    function render() {
      if (img) { [ox, oy] = clampOffset(img, zoom, ox, oy); drawCrop(ctx, img, SIZE, zoom, ox, oy); return; }
      const current = url();
      ctx.clearRect(0, 0, SIZE, SIZE);
      if (current) { const i = new Image(); i.onload = () => ctx.drawImage(i, 0, 0, SIZE, SIZE); i.src = current; }
    }
    function load(file) {
      const reader = new FileReader();
      reader.onload = () => {
        const i = new Image();
        i.onload = () => {
          img = i; zoom = 1; ox = oy = 0; zoomEl.value = 1; zoomEl.disabled = false;
          const save = $('kap-save'); save.disabled = false; save.style.opacity = 1; render();
        };
        i.onerror = () => { $('kap-pick').textContent = '换一张试试'; };
        i.src = reader.result;
      };
      reader.readAsDataURL(file);
    }
    render();
    $('kap-pick').onclick = () => $('kap-file').click();
    $('kap-file').onchange = e => { const f = e.target.files?.[0]; if (f) load(f); };
    zoomEl.oninput = () => { zoom = +zoomEl.value; render(); };
    let drag = null;
    canvas.onpointerdown = e => { if (!img) return; drag = { x: e.clientX, y: e.clientY, ox, oy }; canvas.setPointerCapture(e.pointerId); };
    canvas.onpointermove = e => {
      if (!drag) return;
      const rect = canvas.getBoundingClientRect();
      ox = drag.ox + (e.clientX - drag.x) / rect.width; oy = drag.oy + (e.clientY - drag.y) / rect.height; render();
    };
    canvas.onpointerup = canvas.onpointercancel = () => { drag = null; };
    $('kap-save').onclick = () => {
      if (!img) return;
      try { save(canvas.toDataURL('image/jpeg', 0.88)); wrap.remove(); } catch (_) { $('kap-save').textContent = '存不下，换小图'; }
    };
    $('kap-reset').onclick = () => { reset(); img = null; zoomEl.disabled = true; wrap.remove(); };
    $('kap-close').onclick = () => wrap.remove();
  }

  const api = { url, has, save, reset, openPanel, drawCrop, clampOffset, KEY, SIZE };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.KidAvatar = api;
})(typeof window !== 'undefined' ? window : globalThis);
