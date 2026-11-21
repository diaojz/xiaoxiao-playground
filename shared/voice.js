(function (root) {
  'use strict';

  const DEFAULTS = { en: 'ana', zh: 'xiaoxiao' };
  const PACKS = {
    en: [
      { id: 'ana', name: '安娜（Ana）', description: '卡通小女孩' },
      { id: 'ava', name: '艾娃（Ava）', description: '温柔老师' },
      { id: 'emma', name: '艾玛（Emma）', description: '开朗清晰' },
      { id: 'jenny', name: '珍妮（Jenny）', description: '友好标准' }
    ],
    zh: [
      { id: 'xiaoxiao', name: '晓晓', description: '温暖亲切' },
      { id: 'xiaoyi', name: '晓伊', description: '活泼卡通姐姐' },
      { id: 'yunxia', name: '云夏', description: '卡通小男孩' },
      { id: 'ava', name: '艾娃（Ava）', description: '说中文的 Ava' }
    ]
  };

  let sessionChoice;
  function getSettings() {
    if (sessionChoice) return { ...sessionChoice };
    let saved;
    try { saved = JSON.parse(root.localStorage.getItem('kidVoice')); } catch (_) {}
    const settings = { ...DEFAULTS };
    for (const lang of ['en', 'zh']) {
      if (PACKS[lang].some(pack => pack.id === saved?.[lang])) settings[lang] = saved[lang];
    }
    return settings;
  }

  function url(id, base = 'assets/voice/') {
    if (id.startsWith('blob:')) return id;
    const lang = id.startsWith('zh_') ? 'zh' : 'en';
    return base + lang + '-' + getSettings()[lang] + '/' + id + '.mp3';
  }

  let dialog;
  const styles = `
    dialog.kidvoice-panel {
      display:none;position:fixed;inset:0;margin:auto;padding:clamp(16px,3vw,32px);
      box-sizing:border-box;width:min(760px,calc(100vw - 24px));height:fit-content;
      max-width:none;max-height:calc(100dvh - 24px);overflow:auto;overscroll-behavior:contain;
      color:#392954;background:#fff9ee;border:4px solid #fff;border-radius:30px;
      box-shadow:0 12px 0 #b783c4,0 24px 60px #32234b55;
      font:600 16px/1.4 ui-rounded,"PingFang SC","Microsoft YaHei",sans-serif;
    }
    dialog.kidvoice-panel[open] { display:block;animation:kidvoice-in .2s ease-out both }
    .kidvoice-panel::backdrop { background:#26193499 }
    .kidvoice-head { display:flex;align-items:center;justify-content:space-between;gap:12px }
    .kidvoice-panel h2 { font-size:clamp(23px,4vw,34px);margin:0 }
    .kidvoice-panel h3 { font-size:19px;margin:16px 0 8px }
    .kidvoice-grid { display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px }
    .kidvoice-panel button {
      box-sizing:border-box;display:grid;align-content:center;justify-items:start;gap:4px;
      min-width:0;min-height:88px;margin:0;padding:9px 12px;border:2px solid #dbc9ef;
      border-radius:17px;background:#f4eaff;color:inherit;
      font:inherit;text-align:left;box-shadow:0 4px 0 #d8bee9;cursor:pointer;touch-action:manipulation;
    }
    .kidvoice-panel button:focus-visible { outline:3px solid #6341ae;outline-offset:2px }
    .kidvoice-panel .kidvoice-close { justify-items:center;min-width:88px;min-height:56px;background:#fff0cb }
    .kidvoice-panel button[aria-pressed="true"] { background:#dff5e4;border-color:#408658;box-shadow:0 4px 0 #a5d1ae }
    .kidvoice-check { visibility:hidden;color:#25633a }
    [aria-pressed="true"] .kidvoice-check { visibility:visible }
    .kidvoice-description { font-size:14px }
    .kidvoice-status { margin:12px 0 0;min-height:1.4em }
    @media(max-width:620px) { .kidvoice-grid { grid-template-columns:repeat(2,minmax(0,1fr)) } }
    @keyframes kidvoice-in { from { opacity:0;transform:translateY(8px) scale(.98) } }
    @media(prefers-reduced-motion:reduce) { dialog.kidvoice-panel[open] { animation:none } }
  `;

  function openPanel({ previewBase = 'assets/voice/' } = {}) {
    if (dialog?.open) return;
    const doc = root.document;
    if (!dialog) {
      const style = doc.createElement('style');
      style.textContent = styles;
      doc.head.append(style);
      dialog = doc.createElement('dialog');
      dialog.className = 'kidvoice-panel';
      dialog.setAttribute('aria-labelledby', 'kidvoice-title');
      doc.body.append(dialog);
    }

    const preview = new root.Audio();
    const settings = getSettings();
    dialog.innerHTML = `
      <div class="kidvoice-head"><h2 id="kidvoice-title">🔊 声音设置</h2>
        <button class="kidvoice-close" type="button" autofocus>关闭</button></div>
      ${Object.entries(PACKS).map(([lang, packs]) => `
        <h3>${lang === 'en' ? '英文音色' : '中文音色'}</h3>
        <div class="kidvoice-grid">
          ${packs.map(pack => `
            <button type="button" data-lang="${lang}" data-pack="${pack.id}"
              aria-pressed="${settings[lang] === pack.id}">
              <strong>${pack.name} <span class="kidvoice-check" aria-hidden="true">✓</span></strong>
              <span class="kidvoice-description">${pack.description}</span>
            </button>`).join('')}
        </div>`).join('')}
      <p class="kidvoice-status" role="status">点一个音色试听，两款游戏共用此设置。</p>`;

    const status = dialog.querySelector('.kidvoice-status');
    dialog.querySelector('.kidvoice-close').onclick = () => dialog.close();
    let previewRun = 0;
    function stopPreview() { previewRun++; preview.pause(); }
    function hidePreview() { if (doc.hidden) stopPreview(); }
    doc.addEventListener('visibilitychange', hidePreview);
    root.addEventListener('pagehide', stopPreview);
    dialog.addEventListener('close', () => {
      stopPreview();
      doc.removeEventListener('visibilitychange', hidePreview);
      root.removeEventListener('pagehide', stopPreview);
    }, { once: true });
    const cards = dialog.querySelectorAll('[data-pack]');
    for (const card of cards) {
      card.onclick = () => {
        const { lang, pack } = card.dataset;
        const choice = getSettings();
        if (choice[lang] !== pack) {
          choice[lang] = pack;
          try {
            root.localStorage.setItem('kidVoice', JSON.stringify(choice));
            sessionChoice = undefined;
          }
          catch (_) { sessionChoice = { ...choice }; }
          for (const option of cards) {
            option.setAttribute('aria-pressed', String(choice[option.dataset.lang] === option.dataset.pack));
          }
          root.dispatchEvent(new root.CustomEvent('kidvoicechange', { detail: { ...choice } }));
        }
        const run = ++previewRun;
        preview.pause();
        preview.src = url(lang === 'en' ? 'en_great' : 'zh_good', previewBase);
        status.textContent = '已选中 · 正在试听';
        preview.onended = () => { status.textContent = '点一个音色试听，两款游戏共用此设置。'; };
        const unavailable = () => {
          if (run === previewRun && dialog.open) status.textContent = '试听暂不可用';
        };
        preview.onerror = unavailable;
        preview.play().catch(unavailable);
      };
    }
    dialog.showModal();
  }

  const api = { PACKS, getSettings, url, openPanel };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KidVoice = api;
})(typeof window === 'object' ? window : globalThis);
